import { supabaseAdmin } from '../../clients/supabase.js';
import { healthReadiness } from './healthService.js';

const THRESHOLDS = {
  supabase_warn_ms: 800,
  supabase_critical_ms: 1500,
  memory_rss_warn_mb: 700,
  memory_rss_critical_mb: 900,
  webhook_pending_warn: 100,
  webhook_pending_critical: 500,
  webhook_final_failure_warn_24h: 5,
  webhook_final_failure_critical_24h: 20,
  api_error_rate_warn_percent: 5,
  api_error_rate_critical_percent: 15,
};

function isoHoursAgo(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

function memorySnapshot() {
  const mem = process.memoryUsage();
  return {
    rss_mb: Number((mem.rss / 1024 / 1024).toFixed(2)),
    heap_total_mb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
    heap_used_mb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
    external_mb: Number((mem.external / 1024 / 1024).toFixed(2)),
  };
}

async function countRows(table, filters = {}) {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query = query.eq(key, value);
  });

  const { count, error } = await query;
  if (error) return { ok: false, count: null, error: error.message };
  return { ok: true, count: count || 0, error: null };
}

async function webhookMetrics() {
  const since24h = isoHoursAgo(24);

  const [pendentes, erros, falhasFinais, falhasFinais24h, entregues24h] = await Promise.all([
    countRows('api_webhook_outbox', { status: 'pendente' }),
    countRows('api_webhook_outbox', { status: 'erro' }),
    countRows('api_webhook_outbox', { status: 'falhou_final' }),
    supabaseAdmin
      .from('api_webhook_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'falhou_final')
      .gte('updated_at', since24h),
    supabaseAdmin
      .from('api_webhook_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'entregue')
      .gte('entregue_em', since24h),
  ]);

  const falhas24h = falhasFinais24h.error
    ? { ok: false, count: null, error: falhasFinais24h.error.message }
    : { ok: true, count: falhasFinais24h.count || 0, error: null };

  const entregues = entregues24h.error
    ? { ok: false, count: null, error: entregues24h.error.message }
    : { ok: true, count: entregues24h.count || 0, error: null };

  return {
    pendentes: pendentes.count,
    erros: erros.count,
    falhas_finais_total: falhasFinais.count,
    falhas_finais_24h: falhas24h.count,
    entregues_24h: entregues.count,
    erros_consulta: [pendentes, erros, falhasFinais, falhas24h, entregues]
      .filter((item) => item && item.ok === false)
      .map((item) => item.error),
  };
}

async function apiUsageMetrics() {
  const since24h = isoHoursAgo(24);

  const { data, error } = await supabaseAdmin
    .from('api_usage_logs')
    .select('status_code, sucesso, rota, created_at')
    .gte('created_at', since24h)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    return {
      ok: false,
      total_24h: null,
      erros_24h: null,
      taxa_erro_24h: null,
      top_rotas_erro: [],
      error: error.message,
    };
  }

  const logs = data || [];
  const erros = logs.filter((log) => log.sucesso === false || Number(log.status_code || 0) >= 400);
  const taxaErro = logs.length ? Number(((erros.length / logs.length) * 100).toFixed(2)) : 0;

  const map = new Map();
  for (const log of erros) {
    const rota = log.rota || 'desconhecida';
    map.set(rota, (map.get(rota) || 0) + 1);
  }

  return {
    ok: true,
    total_24h: logs.length,
    erros_24h: erros.length,
    taxa_erro_24h: taxaErro,
    top_rotas_erro: Array.from(map.entries())
      .map(([rota, total]) => ({ rota, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    error: null,
  };
}

function addAlert(alertas, condition, alerta) {
  if (condition) alertas.push({
    timestamp: new Date().toISOString(),
    ...alerta,
  });
}

function avaliarAlertas({ readiness, memory, webhooks, apiUsage }) {
  const alertas = [];
  const supabaseLatency = readiness?.checks?.supabase?.latency_ms;

  addAlert(alertas, readiness?.success === false, {
    severidade: 'critical',
    codigo: 'READINESS_DEGRADED',
    mensagem: 'A API nao esta pronta para receber trafego.',
    contexto: readiness?.checks || null,
  });

  addAlert(alertas, typeof supabaseLatency === 'number' && supabaseLatency >= THRESHOLDS.supabase_critical_ms, {
    severidade: 'critical',
    codigo: 'SUPABASE_LATENCY_CRITICAL',
    mensagem: 'Latencia critica no Supabase.',
    valor: supabaseLatency,
    limite: THRESHOLDS.supabase_critical_ms,
  });

  addAlert(alertas, typeof supabaseLatency === 'number' && supabaseLatency >= THRESHOLDS.supabase_warn_ms && supabaseLatency < THRESHOLDS.supabase_critical_ms, {
    severidade: 'warning',
    codigo: 'SUPABASE_LATENCY_WARNING',
    mensagem: 'Latencia elevada no Supabase.',
    valor: supabaseLatency,
    limite: THRESHOLDS.supabase_warn_ms,
  });

  addAlert(alertas, memory.rss_mb >= THRESHOLDS.memory_rss_critical_mb, {
    severidade: 'critical',
    codigo: 'MEMORY_RSS_CRITICAL',
    mensagem: 'Uso de memoria RSS em nivel critico.',
    valor: memory.rss_mb,
    limite: THRESHOLDS.memory_rss_critical_mb,
  });

  addAlert(alertas, memory.rss_mb >= THRESHOLDS.memory_rss_warn_mb && memory.rss_mb < THRESHOLDS.memory_rss_critical_mb, {
    severidade: 'warning',
    codigo: 'MEMORY_RSS_WARNING',
    mensagem: 'Uso de memoria RSS elevado.',
    valor: memory.rss_mb,
    limite: THRESHOLDS.memory_rss_warn_mb,
  });

  addAlert(alertas, Number(webhooks.pendentes || 0) >= THRESHOLDS.webhook_pending_critical, {
    severidade: 'critical',
    codigo: 'WEBHOOK_BACKLOG_CRITICAL',
    mensagem: 'Backlog critico de webhooks pendentes.',
    valor: webhooks.pendentes,
    limite: THRESHOLDS.webhook_pending_critical,
  });

  addAlert(alertas, Number(webhooks.pendentes || 0) >= THRESHOLDS.webhook_pending_warn && Number(webhooks.pendentes || 0) < THRESHOLDS.webhook_pending_critical, {
    severidade: 'warning',
    codigo: 'WEBHOOK_BACKLOG_WARNING',
    mensagem: 'Backlog elevado de webhooks pendentes.',
    valor: webhooks.pendentes,
    limite: THRESHOLDS.webhook_pending_warn,
  });

  addAlert(alertas, Number(webhooks.falhas_finais_24h || 0) >= THRESHOLDS.webhook_final_failure_critical_24h, {
    severidade: 'critical',
    codigo: 'WEBHOOK_FINAL_FAILURE_CRITICAL',
    mensagem: 'Falhas finais de webhook em nivel critico nas ultimas 24h.',
    valor: webhooks.falhas_finais_24h,
    limite: THRESHOLDS.webhook_final_failure_critical_24h,
  });

  addAlert(alertas, Number(webhooks.falhas_finais_24h || 0) >= THRESHOLDS.webhook_final_failure_warn_24h && Number(webhooks.falhas_finais_24h || 0) < THRESHOLDS.webhook_final_failure_critical_24h, {
    severidade: 'warning',
    codigo: 'WEBHOOK_FINAL_FAILURE_WARNING',
    mensagem: 'Falhas finais de webhook elevadas nas ultimas 24h.',
    valor: webhooks.falhas_finais_24h,
    limite: THRESHOLDS.webhook_final_failure_warn_24h,
  });

  addAlert(alertas, Number(apiUsage.taxa_erro_24h || 0) >= THRESHOLDS.api_error_rate_critical_percent, {
    severidade: 'critical',
    codigo: 'API_ERROR_RATE_CRITICAL',
    mensagem: 'Taxa critica de erro em rotas comerciais nas ultimas 24h.',
    valor: apiUsage.taxa_erro_24h,
    limite: THRESHOLDS.api_error_rate_critical_percent,
  });

  addAlert(alertas, Number(apiUsage.taxa_erro_24h || 0) >= THRESHOLDS.api_error_rate_warn_percent && Number(apiUsage.taxa_erro_24h || 0) < THRESHOLDS.api_error_rate_critical_percent, {
    severidade: 'warning',
    codigo: 'API_ERROR_RATE_WARNING',
    mensagem: 'Taxa elevada de erro em rotas comerciais nas ultimas 24h.',
    valor: apiUsage.taxa_erro_24h,
    limite: THRESHOLDS.api_error_rate_warn_percent,
  });

  return alertas;
}

export async function gerarObservabilidadeInfra() {
  const [readiness, webhooks, apiUsage] = await Promise.all([
    healthReadiness(),
    webhookMetrics(),
    apiUsageMetrics(),
  ]);

  const memory = memorySnapshot();
  const alertas = avaliarAlertas({ readiness, memory, webhooks, apiUsage });

  const criticos = alertas.filter((alerta) => alerta.severidade === 'critical').length;
  const warnings = alertas.filter((alerta) => alerta.severidade === 'warning').length;

  return {
    success: criticos === 0,
    status: criticos > 0 ? 'critical' : warnings > 0 ? 'warning' : 'ok',
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    resumo: {
      alertas_total: alertas.length,
      criticos,
      warnings,
      uptime_seconds: Math.floor(process.uptime()),
    },
    checks: readiness.checks,
    runtime: {
      memory,
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      pid: process.pid,
    },
    metricas: {
      webhooks,
      api_usage_24h: apiUsage,
    },
    alertas,
  };
}

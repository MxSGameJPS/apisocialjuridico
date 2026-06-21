import { supabaseAdmin } from '../../clients/supabase.js';
import { env } from '../../config/env.js';

const startedAt = new Date();

function msSince(start) {
  return Date.now() - start;
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

function envSnapshot() {
  return {
    node_env: env.NODE_ENV,
    port: env.PORT,
    cors_origin_configurado: Boolean(env.CORS_ORIGIN),
    api_secret_key_configurada: Boolean(env.API_SECRET_KEY),
    supabase_url_configurada: Boolean(env.SUPABASE_URL),
    supabase_service_role_configurada: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    datajud_base_url_configurada: Boolean(env.DATAJUD_BASE_URL),
    datajud_api_key_configurada: Boolean(env.DATAJUD_API_KEY),
    djen_base_url_configurada: Boolean(env.DJEN_BASE_URL),
    djen_api_key_configurada: Boolean(env.DJEN_API_KEY),
    djen_monitoring_enabled: Boolean(env.DJEN_MONITORING_ENABLED),
    process_monitoring_enabled: Boolean(env.PROCESS_MONITORING_ENABLED),
  };
}

async function checkSupabase() {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from('api_clientes')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return {
        ok: false,
        status: 'erro',
        latency_ms: msSince(start),
        message: error.message,
      };
    }

    return {
      ok: true,
      status: 'ok',
      latency_ms: msSince(start),
    };
  } catch (error) {
    return {
      ok: false,
      status: 'erro',
      latency_ms: msSince(start),
      message: error.message,
    };
  }
}

export function healthLiveness() {
  const now = new Date();
  return {
    success: true,
    service: 'apisocialjuridico',
    status: 'online',
    timestamp: now.toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    started_at: startedAt.toISOString(),
    memory: memorySnapshot(),
  };
}

export async function healthReadiness() {
  const supabase = await checkSupabase();
  const checks = {
    supabase,
    env: {
      ok: Boolean(env.API_SECRET_KEY && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
      status: Boolean(env.API_SECRET_KEY && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) ? 'ok' : 'erro',
    },
  };

  const ok = Object.values(checks).every((check) => check.ok);

  return {
    success: ok,
    service: 'apisocialjuridico',
    status: ok ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    checks,
  };
}

export async function infraStatusDetalhado() {
  const readiness = await healthReadiness();
  return {
    ...readiness,
    runtime: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime_seconds: Math.floor(process.uptime()),
      started_at: startedAt.toISOString(),
      memory: memorySnapshot(),
    },
    configuracao: envSnapshot(),
    seguranca: {
      headers_http: true,
      hsts_em_producao: env.NODE_ENV === 'production',
      secrets_expostos: false,
      observacao: 'Este endpoint nao retorna valores de segredos, apenas flags de configuracao.',
    },
  };
}

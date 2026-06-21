import crypto from 'node:crypto';
import { supabaseAdmin } from '../../clients/supabase.js';

const OUTBOX_TABLE = 'api_webhook_outbox';
const MONITORAMENTOS_TABLE = 'api_monitoramentos_plataforma';
const LOGS_TABLE = 'api_webhook_entrega_logs';
const DEFAULT_MAX_TENTATIVAS = 5;
const TIMEOUT_MS = 15000;

function nowIso() {
  return new Date().toISOString();
}

function nextAttemptIsoByTentativa(tentativa = 1) {
  const delays = [1, 5, 15, 60, 180, 360];
  const minutes = delays[Math.min(Math.max(Number(tentativa || 1) - 1, 0), delays.length - 1)];
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function montarPayloadWebhook({ monitoramento = {}, evento = {} } = {}) {
  return {
    event_id: evento.id,
    event_type: evento.tipo,
    event_key: evento.chave_evento,
    monitoramento_id: monitoramento.id,
    owner_ref: monitoramento.owner_ref || null,
    plataforma_ref: monitoramento.plataforma_ref || null,
    cliente_id: monitoramento.cliente_id || null,
    api_key_id: monitoramento.api_key_id || null,
    tipo_monitoramento: monitoramento.tipo,
    valor_monitorado: monitoramento.valor_normalizado || monitoramento.valor || null,
    numero_cnj: evento.numero_cnj || null,
    titulo: evento.titulo || null,
    descricao: evento.descricao || null,
    fonte: evento.fonte || null,
    data_evento: evento.data_evento || null,
    payload: evento.payload || {},
    criado_em: evento.created_at || nowIso(),
  };
}

function gerarAssinatura({ secret, timestamp, body }) {
  if (!secret) return null;
  const base = `${timestamp}.${body}`;
  return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

async function carregarMonitoramento(monitoramentoId) {
  if (!monitoramentoId) return null;
  const { data, error } = await supabaseAdmin
    .from(MONITORAMENTOS_TABLE)
    .select('id, webhook_secret')
    .eq('id', monitoramentoId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao carregar monitoramento do webhook: ${error.message}`);
  return data || null;
}

async function registrarLogEntrega({ item, tentativa, status, httpStatus = null, erro = null, resposta = null, duracaoMs = null, headers = {} } = {}) {
  try {
    await supabaseAdmin
      .from(LOGS_TABLE)
      .insert({
        outbox_id: item.id,
        tentativa,
        status,
        http_status: httpStatus,
        erro,
        resposta: resposta ? String(resposta).slice(0, 2000) : null,
        duracao_ms: duracaoMs,
        webhook_url: item.webhook_url,
        headers_enviados: headers,
      });
  } catch {
    // Logs nao podem impedir a entrega ou retry do webhook.
  }
}

export async function criarWebhookOutboxParaEvento({ monitoramento = {}, evento = {} } = {}) {
  if (!monitoramento?.webhook_url || !evento?.id) return null;

  const payload = montarPayloadWebhook({ monitoramento, evento });

  const { data: existing, error: existingError } = await supabaseAdmin
    .from(OUTBOX_TABLE)
    .select('*')
    .eq('evento_id', evento.id)
    .eq('webhook_url', monitoramento.webhook_url)
    .maybeSingle();

  if (existingError) throw new Error(`Erro ao verificar webhook outbox: ${existingError.message}`);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from(OUTBOX_TABLE)
    .insert({
      evento_id: evento.id,
      monitoramento_id: monitoramento.id,
      cliente_id: monitoramento.cliente_id || null,
      api_key_id: monitoramento.api_key_id || null,
      owner_ref: monitoramento.owner_ref || null,
      plataforma_ref: monitoramento.plataforma_ref || null,
      webhook_url: monitoramento.webhook_url,
      event_type: evento.tipo,
      event_key: evento.chave_evento || null,
      payload,
      status: 'pendente',
      tentativas: 0,
      max_tentativas: DEFAULT_MAX_TENTATIVAS,
      proxima_tentativa: nowIso(),
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar webhook outbox: ${error.message}`);
  return data;
}

export async function listarWebhookOutbox({ clienteId = null, ownerRef = null, plataformaRef = null, status = null, limite = 100 } = {}) {
  let query = supabaseAdmin
    .from(OUTBOX_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limite || 100), 500));

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('plataforma_ref', plataformaRef);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar webhook outbox: ${error.message}`);
  return data || [];
}

async function carregarEntregasPendentes({ id = null, clienteId = null, ownerRef = null, limite = 25 } = {}) {
  let query = supabaseAdmin
    .from(OUTBOX_TABLE)
    .select('*')
    .in('status', ['pendente', 'erro'])
    .lte('proxima_tentativa', nowIso())
    .order('created_at', { ascending: true })
    .limit(Math.min(Number(limite || 25), 100));

  if (id) query = query.eq('id', id);
  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar webhook outbox pendente: ${error.message}`);
  return data || [];
}

async function atualizarEntrega(id, patch = {}) {
  const { data, error } = await supabaseAdmin
    .from(OUTBOX_TABLE)
    .update({ ...patch, updated_at: nowIso() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar webhook outbox: ${error.message}`);
  return data;
}

function montarHeaders({ item, body, webhookSecret }) {
  const timestamp = new Date().toISOString();
  const assinatura = gerarAssinatura({ secret: webhookSecret, timestamp, body });

  const headers = {
    'content-type': 'application/json',
    'user-agent': 'API-Social-Juridico-Webhook/1.1',
    'x-socialjuridico-delivery-id': item.id,
    'x-socialjuridico-event-id': item.evento_id || '',
    'x-socialjuridico-event-type': item.event_type || '',
    'x-socialjuridico-timestamp': timestamp,
  };

  if (assinatura) {
    headers['x-socialjuridico-signature'] = `sha256=${assinatura}`;
    headers['x-socialjuridico-signature-version'] = 'v1';
  }

  return { headers, timestamp, assinatura };
}

async function entregarUmaWebhookOutbox(item = {}) {
  const tentativa = Number(item.tentativas || 0) + 1;
  const maxTentativas = Number(item.max_tentativas || DEFAULT_MAX_TENTATIVAS);
  const started = Date.now();
  const body = JSON.stringify(item.payload || {});

  let headers = {};
  let assinatura = null;
  try {
    const monitoramento = await carregarMonitoramento(item.monitoramento_id);
    const headerData = montarHeaders({ item, body, webhookSecret: monitoramento?.webhook_secret || null });
    headers = headerData.headers;
    assinatura = headerData.assinatura;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(item.webhook_url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text().catch(() => '');
    const shortResponse = responseText ? responseText.slice(0, 2000) : null;
    const duracaoMs = Date.now() - started;

    if (response.ok) {
      const atualizado = await atualizarEntrega(item.id, {
        status: 'entregue',
        tentativas: tentativa,
        http_status: response.status,
        resposta: shortResponse,
        ultimo_erro: null,
        ultima_tentativa_em: nowIso(),
        entregue_em: nowIso(),
        assinatura: assinatura ? `sha256=${assinatura}` : null,
        assinatura_payload: assinatura ? 'timestamp.body' : null,
        headers_enviados: headers,
      });
      await registrarLogEntrega({ item, tentativa, status: 'entregue', httpStatus: response.status, resposta: shortResponse, duracaoMs, headers });
      return { id: item.id, status: 'entregue', http_status: response.status, entrega: atualizado };
    }

    const falhouFinal = tentativa >= maxTentativas;
    const status = falhouFinal ? 'falhou_final' : 'erro';
    const atualizado = await atualizarEntrega(item.id, {
      status,
      tentativas: tentativa,
      http_status: response.status,
      resposta: shortResponse,
      ultimo_erro: `HTTP ${response.status}`,
      ultima_tentativa_em: nowIso(),
      proxima_tentativa: falhouFinal ? null : nextAttemptIsoByTentativa(tentativa),
      assinatura: assinatura ? `sha256=${assinatura}` : null,
      assinatura_payload: assinatura ? 'timestamp.body' : null,
      headers_enviados: headers,
    });
    await registrarLogEntrega({ item, tentativa, status, httpStatus: response.status, erro: `HTTP ${response.status}`, resposta: shortResponse, duracaoMs, headers });
    return { id: item.id, status, http_status: response.status, entrega: atualizado };
  } catch (error) {
    const duracaoMs = Date.now() - started;
    const falhouFinal = tentativa >= maxTentativas;
    const status = falhouFinal ? 'falhou_final' : 'erro';
    const atualizado = await atualizarEntrega(item.id, {
      status,
      tentativas: tentativa,
      ultimo_erro: error.name === 'AbortError' ? 'Timeout ao entregar webhook' : error.message,
      ultima_tentativa_em: nowIso(),
      proxima_tentativa: falhouFinal ? null : nextAttemptIsoByTentativa(tentativa),
      assinatura: assinatura ? `sha256=${assinatura}` : null,
      assinatura_payload: assinatura ? 'timestamp.body' : null,
      headers_enviados: headers,
    });
    await registrarLogEntrega({ item, tentativa, status, erro: atualizado.ultimo_erro, duracaoMs, headers });
    return { id: item.id, status, erro: atualizado.ultimo_erro, entrega: atualizado };
  }
}

export async function processarWebhookOutbox({ id = null, clienteId = null, ownerRef = null, limite = 25 } = {}) {
  const pendentes = await carregarEntregasPendentes({ id, clienteId, ownerRef, limite });
  const resultados = [];

  for (const item of pendentes) {
    const resultado = await entregarUmaWebhookOutbox(item);
    resultados.push(resultado);
  }

  return {
    resumo: {
      total: resultados.length,
      entregues: resultados.filter((item) => item.status === 'entregue').length,
      erros: resultados.filter((item) => item.status === 'erro').length,
      falhas_finais: resultados.filter((item) => item.status === 'falhou_final').length,
    },
    resultados,
  };
}

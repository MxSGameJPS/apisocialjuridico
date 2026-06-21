import { supabaseAdmin } from '../../clients/supabase.js';

const OUTBOX_TABLE = 'api_webhook_outbox';

function nowIso() {
  return new Date().toISOString();
}

function nextAttemptIso(minutes = 15) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + Number(minutes || 15));
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

async function entregarUmaWebhookOutbox(item = {}) {
  const tentativas = Number(item.tentativas || 0) + 1;

  try {
    const response = await fetch(item.webhook_url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'API-Social-Juridico-Webhook/1.0',
        'x-socialjuridico-delivery-id': item.id,
        'x-socialjuridico-event-id': item.evento_id || '',
        'x-socialjuridico-event-type': item.event_type || '',
      },
      body: JSON.stringify(item.payload || {}),
    });

    const responseText = await response.text().catch(() => '');
    const shortResponse = responseText ? responseText.slice(0, 2000) : null;

    if (response.ok) {
      const atualizado = await atualizarEntrega(item.id, {
        status: 'entregue',
        tentativas,
        http_status: response.status,
        resposta: shortResponse,
        ultimo_erro: null,
        entregue_em: nowIso(),
      });
      return { id: item.id, status: 'entregue', http_status: response.status, entrega: atualizado };
    }

    const atualizado = await atualizarEntrega(item.id, {
      status: 'erro',
      tentativas,
      http_status: response.status,
      resposta: shortResponse,
      ultimo_erro: `HTTP ${response.status}`,
      proxima_tentativa: nextAttemptIso(15),
    });
    return { id: item.id, status: 'erro', http_status: response.status, entrega: atualizado };
  } catch (error) {
    const atualizado = await atualizarEntrega(item.id, {
      status: 'erro',
      tentativas,
      ultimo_erro: error.message,
      proxima_tentativa: nextAttemptIso(15),
    });
    return { id: item.id, status: 'erro', erro: error.message, entrega: atualizado };
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
    },
    resultados,
  };
}

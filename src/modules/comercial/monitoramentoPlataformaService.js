import crypto from 'node:crypto';
import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarProcessosPorOabRobusto, normalizarConsultaOab } from '../publico/oabRobustaService.js';
import { montarTimelineProcessual } from '../publico/timelineService.js';
import { somenteDigitos } from '../publico/fase6Utils.js';
import { criarWebhookOutboxParaEvento } from './webhookOutboxService.js';

const MONITORAMENTOS_TABLE = 'api_monitoramentos_plataforma';
const EVENTOS_TABLE = 'api_monitoramento_eventos';

function nowIso() {
  return new Date().toISOString();
}

function addMinutesIso(minutes = 360) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + Number(minutes || 360));
  return date.toISOString();
}

function eventHash(parts = []) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex');
}

function aplicarFiltroPlataforma(query, plataformaRef) {
  if (plataformaRef) return query.eq('plataforma_ref', plataformaRef);
  return query.is('plataforma_ref', null);
}

function normalizarTipo(value) {
  const tipo = String(value || '').toLowerCase().trim();
  if (tipo === 'oab' || tipo === 'cnj') return tipo;
  const error = new Error('Tipo de monitoramento invalido. Use oab ou cnj.');
  error.statusCode = 400;
  throw error;
}

function normalizarMonitoramentoEntrada(payload = {}) {
  const tipo = normalizarTipo(payload.tipo);

  if (tipo === 'oab') {
    const consulta = normalizarConsultaOab({ termo: payload.valor || payload.termo, uf: payload.uf, oab: payload.oab });
    if (!consulta.valido) {
      const error = new Error(consulta.erro);
      error.statusCode = 400;
      throw error;
    }

    return {
      tipo,
      valor: consulta.termo,
      valor_normalizado: `${consulta.uf}:${consulta.oab}`,
      uf: consulta.uf,
      oab: consulta.oab,
      numero_cnj: null,
    };
  }

  const cnj = somenteDigitos(payload.numero_cnj || payload.numeroCnj || payload.valor || payload.termo);
  if (cnj.length !== 20) {
    const error = new Error('Informe um numero CNJ valido com 20 digitos.');
    error.statusCode = 400;
    throw error;
  }

  return {
    tipo,
    valor: cnj,
    valor_normalizado: cnj,
    uf: null,
    oab: null,
    numero_cnj: cnj,
  };
}

export async function criarMonitoramentoPlataforma({
  tipo,
  valor = null,
  termo = null,
  uf = null,
  oab = null,
  numeroCnj = null,
  numero_cnj = null,
  clienteId = null,
  apiKeyId = null,
  ownerRef = null,
  plataformaRef = null,
  webhookUrl = null,
  filtros = {},
  frequenciaMinutos = 360,
  ativo = true,
} = {}) {
  const normalizado = normalizarMonitoramentoEntrada({ tipo, valor, termo, uf, oab, numeroCnj, numero_cnj });
  const now = nowIso();
  const payload = {
    cliente_id: clienteId,
    api_key_id: apiKeyId,
    owner_ref: ownerRef,
    tipo: normalizado.tipo,
    valor: normalizado.valor,
    valor_normalizado: normalizado.valor_normalizado,
    uf: normalizado.uf,
    oab: normalizado.oab,
    numero_cnj: normalizado.numero_cnj,
    plataforma_ref: plataformaRef,
    webhook_url: webhookUrl,
    filtros: filtros || {},
    frequencia_minutos: Math.max(Number(frequenciaMinutos || 360), 30),
    ativo,
    proxima_execucao: now,
    updated_at: now,
  };

  let query = supabaseAdmin
    .from(MONITORAMENTOS_TABLE)
    .select('*')
    .eq('tipo', payload.tipo)
    .eq('valor_normalizado', payload.valor_normalizado)
    .limit(1);

  if (clienteId) query = query.eq('cliente_id', clienteId);
  else query = query.eq('owner_ref', ownerRef || 'interno');
  query = aplicarFiltroPlataforma(query, plataformaRef);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw new Error(`Erro ao verificar monitoramento existente: ${existingError.message}`);

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from(MONITORAMENTOS_TABLE)
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar monitoramento: ${error.message}`);
    return { ...data, atualizado: true };
  }

  const { data, error } = await supabaseAdmin
    .from(MONITORAMENTOS_TABLE)
    .insert({ ...payload, owner_ref: ownerRef || (clienteId ? null : 'interno') })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar monitoramento: ${error.message}`);
  return { ...data, atualizado: false };
}

export async function listarMonitoramentosPlataforma({ clienteId = null, ownerRef = null, plataformaRef = null, ativo = null, limite = 100 } = {}) {
  let query = supabaseAdmin
    .from(MONITORAMENTOS_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limite || 100), 500));

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('plataforma_ref', plataformaRef);
  if (ativo !== null && ativo !== undefined) query = query.eq('ativo', Boolean(ativo));

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar monitoramentos: ${error.message}`);
  return data || [];
}

async function registrarWebhookOutboxSeguro({ monitoramento, evento }) {
  try {
    const entrega = await criarWebhookOutboxParaEvento({ monitoramento, evento });
    return entrega?.id || null;
  } catch (error) {
    return { erro: error.message };
  }
}

async function registrarEventoSeNovo({ monitoramento, tipo, numeroCnj = null, titulo = null, descricao = null, fonte = null, dataEvento = null, payload = {}, hashPublicacao = null }) {
  const chaveEvento = eventHash([
    monitoramento.id,
    tipo,
    numeroCnj,
    hashPublicacao,
    dataEvento,
    titulo,
  ]);

  const { data: exists, error: existsError } = await supabaseAdmin
    .from(EVENTOS_TABLE)
    .select('id, lido')
    .eq('monitoramento_id', monitoramento.id)
    .eq('chave_evento', chaveEvento)
    .maybeSingle();

  if (existsError) throw new Error(`Erro ao verificar evento existente: ${existsError.message}`);

  if (exists?.id) {
    const { error: updateError } = await supabaseAdmin
      .from(EVENTOS_TABLE)
      .update({
        numero_cnj: numeroCnj,
        hash_publicacao: hashPublicacao,
        titulo,
        descricao,
        fonte,
        data_evento: dataEvento,
        payload,
      })
      .eq('id', exists.id);

    if (updateError) throw new Error(`Erro ao atualizar evento existente: ${updateError.message}`);
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from(EVENTOS_TABLE)
    .insert({
      monitoramento_id: monitoramento.id,
      cliente_id: monitoramento.cliente_id,
      api_key_id: monitoramento.api_key_id,
      tipo,
      chave_evento: chaveEvento,
      numero_cnj: numeroCnj,
      hash_publicacao: hashPublicacao,
      titulo,
      descricao,
      fonte,
      data_evento: dataEvento,
      payload,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao registrar evento: ${error.message}`);

  const outbox = await registrarWebhookOutboxSeguro({ monitoramento, evento: data });
  if (typeof outbox === 'string') return { ...data, webhook_outbox_id: outbox };
  if (outbox?.erro) return { ...data, webhook_outbox_error: outbox.erro };
  return data;
}

async function executarMonitoramentoOab(monitoramento, { limitePorMonitoramento = 20 } = {}) {
  const resultado = await buscarProcessosPorOabRobusto({
    uf: monitoramento.uf,
    oab: monitoramento.oab,
    limiteDjen: Math.min(Number(limitePorMonitoramento || 20), 30),
    incluirDetalhes: true,
    limiteDetalhes: 5,
    dataInicio: monitoramento.filtros?.data_inicio || null,
    dataFim: monitoramento.filtros?.data_fim || null,
  });

  const eventos = [];

  for (const processo of resultado.processos || []) {
    const novoProcesso = await registrarEventoSeNovo({
      monitoramento,
      tipo: 'novo_processo_oab',
      numeroCnj: processo.numero_cnj,
      titulo: `Processo encontrado pela OAB ${monitoramento.uf} ${monitoramento.oab}`,
      descricao: [processo.classe, processo.orgao, processo.parte_ativa, processo.parte_passiva].filter(Boolean).join(' · '),
      fonte: processo.fontes?.datajud_detalhado ? 'DJEN/DataJud' : 'DJEN',
      dataEvento: processo.ultima_publicacao_em || processo.data_ultima_atualizacao || null,
      payload: processo,
    });
    if (novoProcesso) eventos.push(novoProcesso);

    if (processo.ultima_publicacao_em) {
      const publicacao = await registrarEventoSeNovo({
        monitoramento,
        tipo: 'publicacao_djen',
        numeroCnj: processo.numero_cnj,
        titulo: processo.ultima_publicacao_tipo || 'Publicacao DJEN encontrada',
        descricao: processo.resumo_ia || [processo.parte_ativa, processo.parte_passiva].filter(Boolean).join(' x '),
        fonte: 'DJEN',
        dataEvento: processo.ultima_publicacao_em,
        hashPublicacao: eventHash([processo.numero_cnj, processo.ultima_publicacao_em, processo.ultima_publicacao_tipo]),
        payload: processo,
      });
      if (publicacao) eventos.push(publicacao);
    }
  }

  return { resultado, eventos };
}

async function executarMonitoramentoCnj(monitoramento) {
  const timeline = await montarTimelineProcessual({ numeroCnj: monitoramento.numero_cnj, atualizarDatajud: true });
  const eventos = [];

  for (const item of timeline.eventos || []) {
    const evento = await registrarEventoSeNovo({
      monitoramento,
      tipo: item.origem === 'DataJud' ? 'movimentacao_datajud' : 'publicacao_djen',
      numeroCnj: timeline.numero_cnj,
      titulo: item.titulo || item.tipo || 'Evento processual',
      descricao: item.descricao || null,
      fonte: item.origem || 'Processual',
      dataEvento: item.data || null,
      hashPublicacao: eventHash([timeline.numero_cnj, item.origem, item.tipo, item.titulo, item.data]),
      payload: item,
    });
    if (evento) eventos.push(evento);
  }

  return { resultado: timeline, eventos };
}

async function atualizarMonitoramentoExecutado(monitoramento, { status, mensagem = null, novosEventos = 0 } = {}) {
  const now = nowIso();
  const { error } = await supabaseAdmin
    .from(MONITORAMENTOS_TABLE)
    .update({
      ultima_execucao: now,
      proxima_execucao: addMinutesIso(monitoramento.frequencia_minutos),
      status_ultima_execucao: status,
      mensagem_ultima_execucao: mensagem,
      total_eventos: Number(monitoramento.total_eventos || 0) + Number(novosEventos || 0),
      updated_at: now,
    })
    .eq('id', monitoramento.id);

  if (error) throw new Error(`Erro ao atualizar monitoramento executado: ${error.message}`);
}

export async function executarMonitoramentosPlataforma({ clienteId = null, ownerRef = null, plataformaRef = null, monitoramentoId = null, limiteMonitoramentos = 25, limitePorMonitoramento = 20 } = {}) {
  let query = supabaseAdmin
    .from(MONITORAMENTOS_TABLE)
    .select('*')
    .eq('ativo', true)
    .order('ultima_execucao', { ascending: true, nullsFirst: true })
    .limit(Math.min(Number(limiteMonitoramentos || 25), 100));

  if (monitoramentoId) query = query.eq('id', monitoramentoId);
  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('plataforma_ref', plataformaRef);

  const { data: monitoramentos, error } = await query;
  if (error) throw new Error(`Erro ao carregar monitoramentos: ${error.message}`);

  const resultados = [];

  for (const monitoramento of monitoramentos || []) {
    try {
      const execucao = monitoramento.tipo === 'oab'
        ? await executarMonitoramentoOab(monitoramento, { limitePorMonitoramento })
        : await executarMonitoramentoCnj(monitoramento);

      await atualizarMonitoramentoExecutado(monitoramento, {
        status: 'sucesso',
        novosEventos: execucao.eventos.length,
      });

      resultados.push({
        monitoramento_id: monitoramento.id,
        tipo: monitoramento.tipo,
        valor: monitoramento.valor,
        plataforma_ref: monitoramento.plataforma_ref,
        status: 'sucesso',
        novos_eventos: execucao.eventos.length,
        eventos: execucao.eventos,
      });
    } catch (error) {
      await atualizarMonitoramentoExecutado(monitoramento, {
        status: 'erro',
        mensagem: error.message,
      });

      resultados.push({
        monitoramento_id: monitoramento.id,
        tipo: monitoramento.tipo,
        valor: monitoramento.valor,
        plataforma_ref: monitoramento.plataforma_ref,
        status: 'erro',
        mensagem: error.message,
      });
    }
  }

  return {
    resumo: {
      total_monitoramentos: resultados.length,
      sucessos: resultados.filter((item) => item.status === 'sucesso').length,
      erros: resultados.filter((item) => item.status === 'erro').length,
      novos_eventos: resultados.reduce((acc, item) => acc + (item.novos_eventos || 0), 0),
    },
    resultados,
  };
}

export async function listarEventosPlataforma({ clienteId = null, ownerRef = null, plataformaRef = null, monitoramentoId = null, lido = null, limite = 100 } = {}) {
  let query = supabaseAdmin
    .from(EVENTOS_TABLE)
    .select('*, api_monitoramentos_plataforma!inner(owner_ref, plataforma_ref)')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limite || 100), 500));

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('api_monitoramentos_plataforma.owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('api_monitoramentos_plataforma.plataforma_ref', plataformaRef);
  if (monitoramentoId) query = query.eq('monitoramento_id', monitoramentoId);
  if (lido !== null && lido !== undefined) query = query.eq('lido', Boolean(lido));

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar eventos: ${error.message}`);
  return data || [];
}

export async function marcarEventosLidosPlataforma({ ids = [], clienteId = null, ownerRef = null, lido = true } = {}) {
  const lista = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!lista.length) {
    const error = new Error('Informe ao menos um ID de evento.');
    error.statusCode = 400;
    throw error;
  }

  let query = supabaseAdmin
    .from(EVENTOS_TABLE)
    .update({ lido: Boolean(lido) })
    .in('id', lista)
    .select();

  if (clienteId) query = query.eq('cliente_id', clienteId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao atualizar eventos: ${error.message}`);

  if (ownerRef && data?.length) {
    const allowed = await listarEventosPlataforma({ ownerRef, limite: 500 });
    const allowedIds = new Set(allowed.map((item) => item.id));
    return (data || []).filter((item) => allowedIds.has(item.id));
  }

  return data || [];
}

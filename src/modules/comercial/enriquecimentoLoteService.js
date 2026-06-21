import { supabaseAdmin } from '../../clients/supabase.js';
import { somenteDigitos } from '../publico/fase6Utils.js';
import { montarPayloadImportacaoCrm } from './crmPayloadService.js';
import { listarFeedbacksProcessuais } from './feedbackProcessualService.js';

const EVENTOS_TABLE = 'api_monitoramento_eventos';

function normalizarProcessoItem(item) {
  if (typeof item === 'string') return { numero_cnj: item, processo: {} };
  const processo = item?.processo || item || {};
  return {
    numero_cnj: item?.numero_cnj || item?.numeroCnj || processo.numero_cnj || processo.numeroProcesso || processo.numero_processo || null,
    processo,
    ref_externa: item?.ref_externa || item?.id_externo || item?.id || null,
  };
}

function resumoFeedbacks(feedbacks = []) {
  const ultimoImportado = feedbacks.find((item) => item.tipo_feedback === 'processo_importado_crm') || null;
  const ultimoIgnorado = feedbacks.find((item) => item.tipo_feedback === 'processo_ignorado') || null;
  const eventoRelevante = feedbacks.find((item) => item.tipo_feedback === 'evento_relevante') || null;
  const eventoIrrelevante = feedbacks.find((item) => item.tipo_feedback === 'evento_irrelevante') || null;
  const notificacaoLida = feedbacks.find((item) => item.tipo_feedback === 'notificacao_lida') || null;

  return {
    total_feedbacks: feedbacks.length,
    processo_importado_crm: Boolean(ultimoImportado),
    processo_ignorado: Boolean(ultimoIgnorado),
    evento_relevante: Boolean(eventoRelevante),
    evento_irrelevante: Boolean(eventoIrrelevante),
    notificacao_lida: Boolean(notificacaoLida),
    ultimo_feedback: feedbacks[0]
      ? {
          id: feedbacks[0].id,
          tipo_feedback: feedbacks[0].tipo_feedback,
          resultado: feedbacks[0].resultado,
          created_at: feedbacks[0].created_at,
        }
      : null,
  };
}

function definirStatusCrm({ payloadCrm, feedbackResumo }) {
  if (feedbackResumo.processo_importado_crm) return 'importado';
  if (feedbackResumo.processo_ignorado) return 'ignorado';
  if (payloadCrm.pronto_para_importar) return 'pronto_para_importar';
  return 'pendente_confirmacao_cliente';
}

function definirAcaoRecomendada({ payloadCrm, feedbackResumo }) {
  if (feedbackResumo.processo_importado_crm) return 'manter_atualizado';
  if (feedbackResumo.processo_ignorado) return 'nao_importar';
  return payloadCrm.acao_recomendada || 'analisar';
}

async function listarEventosRecentes({ ownerRef = null, plataformaRef = null, clienteId = null, numeroCnj, limite = 5 } = {}) {
  let query = supabaseAdmin
    .from(EVENTOS_TABLE)
    .select('*, api_monitoramentos_plataforma!inner(owner_ref, plataforma_ref)')
    .eq('numero_cnj', numeroCnj)
    .order('data_evento', { ascending: false, nullsFirst: false })
    .limit(Math.min(Number(limite || 5), 20));

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('api_monitoramentos_plataforma.owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('api_monitoramentos_plataforma.plataforma_ref', plataformaRef);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar eventos recentes para enriquecimento: ${error.message}`);

  return (data || []).map((evento) => ({
    id: evento.id,
    tipo: evento.tipo,
    titulo: evento.titulo,
    descricao: evento.descricao,
    fonte: evento.fonte,
    data_evento: evento.data_evento,
    lido: evento.lido,
  }));
}

async function enriquecerUmProcesso({ item, ownerRef, plataformaRef, clienteId, uf, oab, termoOab, incluirTimeline = false, limiteEventos = 5 } = {}) {
  const normalizado = normalizarProcessoItem(item);
  const cnj = somenteDigitos(normalizado.numero_cnj || '');

  if (cnj.length !== 20) {
    return {
      sucesso: false,
      numero_cnj: normalizado.numero_cnj || null,
      ref_externa: normalizado.ref_externa,
      erro: 'CNJ invalido ou ausente.',
    };
  }

  try {
    const payloadCrm = await montarPayloadImportacaoCrm({
      numeroCnj: cnj,
      processo: normalizado.processo || {},
      ownerRef,
      plataformaRef,
      clienteId,
      uf,
      oab,
      termoOab,
      incluirTimeline,
      limiteEventos,
    });

    const feedbacks = await listarFeedbacksProcessuais({
      clienteId,
      ownerRef,
      plataformaRef,
      numeroCnj: cnj,
      limite: 20,
    });

    const eventosRecentes = await listarEventosRecentes({
      ownerRef,
      plataformaRef,
      clienteId,
      numeroCnj: cnj,
      limite: limiteEventos,
    });

    const feedbackResumo = resumoFeedbacks(feedbacks);
    const statusCrm = definirStatusCrm({ payloadCrm, feedbackResumo });
    const acaoRecomendada = definirAcaoRecomendada({ payloadCrm, feedbackResumo });

    return {
      sucesso: true,
      numero_cnj: cnj,
      ref_externa: normalizado.ref_externa,
      status_crm: statusCrm,
      acao_recomendada: acaoRecomendada,
      pronto_para_importar: payloadCrm.pronto_para_importar,
      cliente: payloadCrm.cliente,
      parte_contraria: payloadCrm.parte_contraria,
      partes_sugeridas: payloadCrm.partes_sugeridas,
      vinculos_confirmados: payloadCrm.vinculos_confirmados,
      feedbacks: feedbackResumo,
      eventos_recentes: eventosRecentes.length ? eventosRecentes : payloadCrm.eventos_recentes,
      monitoramento_sugerido: payloadCrm.monitoramento_sugerido,
      monitoramento_payload: payloadCrm.monitoramento_payload,
      alertas: payloadCrm.alertas,
      payload_crm: payloadCrm,
    };
  } catch (error) {
    return {
      sucesso: false,
      numero_cnj: cnj,
      ref_externa: normalizado.ref_externa,
      erro: error.message,
    };
  }
}

export async function enriquecerProcessosEmLote({
  processos = [],
  ownerRef = null,
  plataformaRef = null,
  clienteId = null,
  uf = null,
  oab = null,
  termoOab = null,
  incluirTimeline = false,
  limiteEventos = 5,
  limite = 50,
} = {}) {
  const lista = Array.isArray(processos) ? processos : [];
  if (!lista.length) {
    const error = new Error('Informe ao menos um processo ou numero_cnj para enriquecer.');
    error.statusCode = 400;
    throw error;
  }

  const limiteSeguro = Math.min(Number(limite || lista.length || 50), 100);
  const itens = lista.slice(0, limiteSeguro);
  const resultados = [];

  for (const item of itens) {
    const enriquecido = await enriquecerUmProcesso({
      item,
      ownerRef,
      plataformaRef,
      clienteId,
      uf,
      oab,
      termoOab,
      incluirTimeline,
      limiteEventos,
    });
    resultados.push(enriquecido);
  }

  const sucessos = resultados.filter((item) => item.sucesso);
  const prontos = sucessos.filter((item) => item.pronto_para_importar);
  const importados = sucessos.filter((item) => item.status_crm === 'importado');
  const pendentes = sucessos.filter((item) => item.status_crm === 'pendente_confirmacao_cliente');

  return {
    resumo: {
      total_recebidos: lista.length,
      total_processados: resultados.length,
      sucessos: sucessos.length,
      erros: resultados.length - sucessos.length,
      prontos_para_importar: prontos.length,
      ja_importados: importados.length,
      pendentes_confirmacao: pendentes.length,
    },
    owner_ref: ownerRef || null,
    plataforma_ref: plataformaRef || null,
    resultados,
  };
}

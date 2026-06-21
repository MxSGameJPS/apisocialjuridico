import { supabaseAdmin } from '../../clients/supabase.js';
import { somenteDigitos } from '../publico/fase6Utils.js';
import { normalizarConsultaOab } from '../publico/oabRobustaService.js';
import { confirmarVinculoProcessualPlataforma } from './vinculosPlataformaService.js';

const FEEDBACK_TABLE = 'api_feedback_processual_plataforma';
const EVENTOS_TABLE = 'api_monitoramento_eventos';

const TIPOS_FEEDBACK = [
  'cliente_confirmado',
  'parte_contraria_confirmada',
  'processo_importado_crm',
  'processo_ignorado',
  'evento_relevante',
  'evento_irrelevante',
  'notificacao_enviada',
  'notificacao_lida',
  'erro_integracao',
];

function normalizarTexto(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizarTipoFeedback(value = '') {
  const tipo = String(value || '').toLowerCase().trim();
  if (TIPOS_FEEDBACK.includes(tipo)) return tipo;
  const error = new Error(`tipo_feedback invalido. Use: ${TIPOS_FEEDBACK.join(', ')}.`);
  error.statusCode = 400;
  throw error;
}

function normalizarPolo(value = null) {
  const polo = String(value || '').toLowerCase().trim();
  if (['ativa', 'ativo', 'autor', 'requerente', 'exequente'].includes(polo)) return 'ativa';
  if (['passiva', 'passivo', 'reu', 'réu', 'requerido', 'executado'].includes(polo)) return 'passiva';
  if (['outras', 'outros', 'terceiro', 'interessado'].includes(polo)) return 'outras';
  return null;
}

function normalizarOab({ uf, oab, termo } = {}) {
  const consulta = normalizarConsultaOab({ uf, oab, termo });
  if (!consulta.valido) return { uf: null, oab: null, oab_normalizada: null };
  return { uf: consulta.uf, oab: consulta.oab, oab_normalizada: `${consulta.uf}:${consulta.oab}` };
}

async function buscarEvento(eventoId) {
  if (!eventoId) return null;
  const { data, error } = await supabaseAdmin
    .from(EVENTOS_TABLE)
    .select('*')
    .eq('id', eventoId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar evento para feedback: ${error.message}`);
  return data || null;
}

function montarFeedback(input = {}, evento = null) {
  const payloadExtra = input.payload || {};
  const tipoFeedback = normalizarTipoFeedback(input.tipoFeedback || input.tipo_feedback);
  const cnj = somenteDigitos(input.numeroCnj || input.numero_cnj || evento?.numero_cnj || payloadExtra.numero_cnj || '');

  if (!cnj && ['cliente_confirmado', 'parte_contraria_confirmada', 'processo_importado_crm', 'processo_ignorado'].includes(tipoFeedback)) {
    const error = new Error('Informe numero_cnj para este tipo de feedback.');
    error.statusCode = 400;
    throw error;
  }

  const parte = input.parte || payloadExtra.parte || {};
  const cliente = input.cliente || payloadExtra.cliente || {};
  const oabData = normalizarOab({ uf: input.uf, oab: input.oab, termo: input.termoOab || input.termo_oab || payloadExtra.termo_oab });

  return {
    cliente_id: input.clienteId || null,
    api_key_id: input.apiKeyId || null,
    owner_ref: input.ownerRef || null,
    plataforma_ref: input.plataformaRef || input.plataforma_ref || null,
    evento_id: input.eventoId || input.evento_id || null,
    monitoramento_id: input.monitoramentoId || input.monitoramento_id || evento?.monitoramento_id || null,
    numero_cnj: cnj || null,
    uf: oabData.uf,
    oab: oabData.oab,
    oab_normalizada: oabData.oab_normalizada,
    tipo_feedback: tipoFeedback,
    resultado: normalizarTexto(input.resultado || 'registrado') || 'registrado',
    parte_nome: normalizarTexto(parte.nome || input.parte_nome || payloadExtra.parte_nome || ''),
    parte_polo: normalizarPolo(parte.polo || input.parte_polo || payloadExtra.parte_polo),
    parte_tipo: parte.tipo || input.parte_tipo || payloadExtra.parte_tipo || null,
    cliente_ref: cliente.id || cliente.ref || input.cliente_ref || null,
    cliente_nome: normalizarTexto(cliente.nome || input.cliente_nome || ''),
    observacao: input.observacao || null,
    payload: {
      ...payloadExtra,
      parte,
      cliente,
      evento_resumo: evento
        ? {
            id: evento.id,
            tipo: evento.tipo,
            numero_cnj: evento.numero_cnj,
            titulo: evento.titulo,
            data_evento: evento.data_evento,
          }
        : null,
    },
  };
}

async function criarVinculoSeAplicavel(feedback = {}) {
  if (!['cliente_confirmado', 'parte_contraria_confirmada'].includes(feedback.tipo_feedback)) return null;
  if (!feedback.numero_cnj || !feedback.parte_nome) return null;

  const tipoVinculo = feedback.tipo_feedback === 'cliente_confirmado'
    ? 'cliente_confirmado'
    : 'parte_contraria';

  return confirmarVinculoProcessualPlataforma({
    clienteId: feedback.cliente_id,
    apiKeyId: feedback.api_key_id,
    ownerRef: feedback.owner_ref,
    plataformaRef: feedback.plataforma_ref,
    numeroCnj: feedback.numero_cnj,
    uf: feedback.uf,
    oab: feedback.oab,
    tipoVinculo,
    parte: {
      nome: feedback.parte_nome,
      polo: feedback.parte_polo,
      tipo: feedback.parte_tipo,
    },
    origem: 'feedback_plataforma',
    confianca: 1,
    observacao: feedback.observacao || `Vinculo criado a partir de feedback: ${feedback.tipo_feedback}`,
    payload: {
      feedback_id: feedback.id,
      tipo_feedback: feedback.tipo_feedback,
      cliente_ref: feedback.cliente_ref,
      cliente_nome: feedback.cliente_nome,
      evento_id: feedback.evento_id,
      monitoramento_id: feedback.monitoramento_id,
    },
  });
}

export async function registrarFeedbackProcessual(input = {}) {
  const evento = await buscarEvento(input.eventoId || input.evento_id || null);
  const feedbackPayload = montarFeedback(input, evento);

  const { data, error } = await supabaseAdmin
    .from(FEEDBACK_TABLE)
    .insert({
      ...feedbackPayload,
      owner_ref: feedbackPayload.owner_ref || (feedbackPayload.cliente_id ? null : 'interno'),
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao registrar feedback processual: ${error.message}`);

  const vinculo = await criarVinculoSeAplicavel(data);

  if (vinculo?.id) {
    const { data: atualizado, error: updateError } = await supabaseAdmin
      .from(FEEDBACK_TABLE)
      .update({ vinculo_id: vinculo.id })
      .eq('id', data.id)
      .select()
      .single();

    if (updateError) throw new Error(`Erro ao vincular feedback ao vinculo criado: ${updateError.message}`);
    return { feedback: atualizado, vinculo, aprendizado_gerado: true };
  }

  return { feedback: data, vinculo: null, aprendizado_gerado: false };
}

export async function listarFeedbacksProcessuais({ clienteId = null, ownerRef = null, plataformaRef = null, numeroCnj = null, tipoFeedback = null, limite = 100 } = {}) {
  let query = supabaseAdmin
    .from(FEEDBACK_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limite || 100), 500));

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('plataforma_ref', plataformaRef);
  if (tipoFeedback) query = query.eq('tipo_feedback', normalizarTipoFeedback(tipoFeedback));

  const cnj = somenteDigitos(numeroCnj || '');
  if (cnj) query = query.eq('numero_cnj', cnj);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar feedbacks processuais: ${error.message}`);
  return data || [];
}

export { TIPOS_FEEDBACK };

import { supabaseAdmin } from '../../clients/supabase.js';
import { somenteDigitos } from '../publico/fase6Utils.js';
import { normalizarConsultaOab } from '../publico/oabRobustaService.js';

const VINCULOS_TABLE = 'api_vinculos_processuais_plataforma';
const AUDITORIA_TABLE = 'api_vinculos_processuais_auditoria';

function normalizarTexto(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizarPolo(value = null) {
  const polo = String(value || '').toLowerCase().trim();
  if (['ativa', 'ativo', 'autor', 'requerente', 'exequente'].includes(polo)) return 'ativa';
  if (['passiva', 'passivo', 'reu', 'requerido', 'executado'].includes(polo)) return 'passiva';
  if (['outras', 'outros', 'terceiro', 'interessado'].includes(polo)) return 'outras';
  return null;
}

function normalizarTipoVinculo(value = 'cliente_confirmado') {
  const tipo = String(value || '').toLowerCase().trim();
  const validos = ['cliente_confirmado', 'parte_contraria', 'ignorado', 'vinculo_incorreto'];
  if (validos.includes(tipo)) return tipo;
  const error = new Error('tipo_vinculo invalido. Use cliente_confirmado, parte_contraria, ignorado ou vinculo_incorreto.');
  error.statusCode = 400;
  throw error;
}

function normalizarOab({ uf, oab, termo } = {}) {
  const consulta = normalizarConsultaOab({ uf, oab, termo });
  if (!consulta.valido) return { uf: null, oab: null, oab_normalizada: null };
  return { uf: consulta.uf, oab: consulta.oab, oab_normalizada: `${consulta.uf}:${consulta.oab}` };
}

function aplicarFiltroPlataforma(query, plataformaRef) {
  if (plataformaRef) return query.eq('plataforma_ref', plataformaRef);
  return query.is('plataforma_ref', null);
}

async function registrarAuditoria({ vinculoId = null, clienteId = null, ownerRef = null, acao, payload = {} }) {
  const { error } = await supabaseAdmin
    .from(AUDITORIA_TABLE)
    .insert({ vinculo_id: vinculoId, cliente_id: clienteId, owner_ref: ownerRef, acao, payload });

  if (error) throw new Error(`Erro ao registrar auditoria de vinculo: ${error.message}`);
}

function montarPayloadVinculo(input = {}) {
  const payloadExtra = input.payload || {};
  const cnj = somenteDigitos(input.numeroCnj || input.numero_cnj || payloadExtra.numero_cnj || '');
  if (cnj.length !== 20) {
    const error = new Error('Informe um numero CNJ valido com 20 digitos.');
    error.statusCode = 400;
    throw error;
  }

  const parte = input.parte || {};
  const nomeParte = normalizarTexto(parte.nome || input.parte_nome || payloadExtra.parte_nome || '');
  if (!nomeParte) {
    const error = new Error('Informe o nome da parte vinculada.');
    error.statusCode = 400;
    throw error;
  }

  const oabData = normalizarOab({ uf: input.uf, oab: input.oab, termo: input.termoOab || input.termo_oab || payloadExtra.termo_oab });

  return {
    cliente_id: input.clienteId || null,
    api_key_id: input.apiKeyId || null,
    owner_ref: input.ownerRef || null,
    plataforma_ref: input.plataformaRef || input.plataforma_ref || null,
    tipo_vinculo: normalizarTipoVinculo(input.tipoVinculo || input.tipo_vinculo),
    numero_cnj: cnj,
    uf: oabData.uf,
    oab: oabData.oab,
    oab_normalizada: oabData.oab_normalizada,
    parte_nome: nomeParte,
    parte_polo: normalizarPolo(parte.polo || input.parte_polo || payloadExtra.parte_polo),
    parte_tipo: parte.tipo || input.parte_tipo || payloadExtra.parte_tipo || null,
    origem: input.origem || 'confirmacao_plataforma',
    confianca: Math.min(Math.max(Number(input.confianca || 1), 0), 1),
    observacao: input.observacao || null,
    payload: { ...payloadExtra, parte },
    ativo: true,
    updated_at: new Date().toISOString(),
  };
}

export async function confirmarVinculoProcessualPlataforma(input = {}) {
  const vinculo = montarPayloadVinculo(input);

  let query = supabaseAdmin
    .from(VINCULOS_TABLE)
    .select('*')
    .eq('numero_cnj', vinculo.numero_cnj)
    .eq('parte_nome', vinculo.parte_nome)
    .eq('tipo_vinculo', vinculo.tipo_vinculo)
    .eq('ativo', true)
    .limit(1);

  if (vinculo.oab_normalizada) query = query.eq('oab_normalizada', vinculo.oab_normalizada);
  else query = query.is('oab_normalizada', null);
  if (vinculo.cliente_id) query = query.eq('cliente_id', vinculo.cliente_id);
  else query = query.eq('owner_ref', vinculo.owner_ref || 'interno');
  if (vinculo.parte_polo) query = query.eq('parte_polo', vinculo.parte_polo);
  else query = query.is('parte_polo', null);
  query = aplicarFiltroPlataforma(query, vinculo.plataforma_ref);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw new Error(`Erro ao verificar vinculo existente: ${existingError.message}`);

  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from(VINCULOS_TABLE)
      .update(vinculo)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar vinculo: ${error.message}`);
    await registrarAuditoria({ vinculoId: data.id, clienteId: vinculo.cliente_id, ownerRef: vinculo.owner_ref, acao: 'atualizado', payload: vinculo });
    return { ...data, atualizado: true };
  }

  const { data, error } = await supabaseAdmin
    .from(VINCULOS_TABLE)
    .insert({ ...vinculo, owner_ref: vinculo.owner_ref || (vinculo.cliente_id ? null : 'interno') })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar vinculo: ${error.message}`);
  await registrarAuditoria({ vinculoId: data.id, clienteId: vinculo.cliente_id, ownerRef: vinculo.owner_ref, acao: 'criado', payload: vinculo });
  return { ...data, atualizado: false };
}

export async function listarVinculosProcessuaisPlataforma({ clienteId = null, ownerRef = null, plataformaRef = null, numeroCnj = null, numero_cnj = null, uf = null, oab = null, termoOab = null, tipoVinculo = null, ativo = true, limite = 100 } = {}) {
  let query = supabaseAdmin
    .from(VINCULOS_TABLE)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(Math.min(Number(limite || 100), 500));

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('plataforma_ref', plataformaRef);
  if (ativo !== null && ativo !== undefined) query = query.eq('ativo', Boolean(ativo));

  const cnj = somenteDigitos(numeroCnj || numero_cnj || '');
  if (cnj) query = query.eq('numero_cnj', cnj);

  const oabData = normalizarOab({ uf, oab, termo: termoOab });
  if (oabData.oab_normalizada) query = query.eq('oab_normalizada', oabData.oab_normalizada);
  if (tipoVinculo) query = query.eq('tipo_vinculo', normalizarTipoVinculo(tipoVinculo));

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar vinculos: ${error.message}`);
  return data || [];
}

export async function desativarVinculoProcessualPlataforma({ id, clienteId = null, ownerRef = null, plataformaRef = null, motivo = null } = {}) {
  if (!id) {
    const error = new Error('Informe o ID do vinculo.');
    error.statusCode = 400;
    throw error;
  }

  let query = supabaseAdmin
    .from(VINCULOS_TABLE)
    .update({ ativo: false, observacao: motivo || 'Vinculo desativado', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);
  if (plataformaRef) query = query.eq('plataforma_ref', plataformaRef);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao desativar vinculo: ${error.message}`);
  const vinculo = data?.[0] || null;
  if (vinculo) await registrarAuditoria({ vinculoId: id, clienteId, ownerRef, acao: 'desativado', payload: { motivo, plataformaRef } });
  return vinculo;
}

function vinculoParaResumo(vinculo = {}) {
  return {
    id: vinculo.id,
    tipo_vinculo: vinculo.tipo_vinculo,
    numero_cnj: vinculo.numero_cnj,
    oab_normalizada: vinculo.oab_normalizada,
    parte: {
      nome: vinculo.parte_nome,
      polo: vinculo.parte_polo,
      tipo: vinculo.parte_tipo,
    },
    origem: vinculo.origem,
    confianca: Number(vinculo.confianca || 1),
    plataforma_ref: vinculo.plataforma_ref,
    observacao: vinculo.observacao,
    atualizado_em: vinculo.updated_at,
  };
}

export async function aplicarVinculosConfirmadosNosProcessos(resultado = {}, { clienteId = null, ownerRef = null, plataformaRef = null, uf = null, oab = null } = {}) {
  const processos = Array.isArray(resultado.processos) ? resultado.processos : [];
  if (!processos.length) return resultado;

  const oabData = normalizarOab({ uf: uf || resultado.consulta?.uf, oab: oab || resultado.consulta?.numero });
  const cnjs = processos.map((processo) => somenteDigitos(processo.numero_cnj)).filter(Boolean);

  let query = supabaseAdmin
    .from(VINCULOS_TABLE)
    .select('*')
    .in('numero_cnj', cnjs)
    .eq('ativo', true);

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (ownerRef) query = query.eq('owner_ref', ownerRef);
  query = aplicarFiltroPlataforma(query, plataformaRef);
  if (oabData.oab_normalizada) query = query.eq('oab_normalizada', oabData.oab_normalizada);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao aplicar vinculos confirmados: ${error.message}`);

  const porCnj = new Map();
  for (const vinculo of data || []) {
    const key = vinculo.numero_cnj;
    if (!porCnj.has(key)) porCnj.set(key, []);
    porCnj.get(key).push(vinculoParaResumo(vinculo));
  }

  return {
    ...resultado,
    processos: processos.map((processo) => {
      const vinculos = porCnj.get(somenteDigitos(processo.numero_cnj)) || [];
      const clienteConfirmado = vinculos.find((vinculo) => vinculo.tipo_vinculo === 'cliente_confirmado') || null;
      return {
        ...processo,
        vinculos_confirmados: vinculos,
        cliente_confirmado: Boolean(clienteConfirmado),
        cliente_confirmado_detalhe: clienteConfirmado,
      };
    }),
    metricas: {
      ...(resultado.metricas || {}),
      processos_com_vinculo_confirmado: processos.filter((processo) => porCnj.has(somenteDigitos(processo.numero_cnj))).length,
    },
  };
}

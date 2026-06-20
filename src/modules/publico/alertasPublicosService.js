import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarPublicacoesDjenAvancado } from '../djen/djenService.js';
import { normalizarTexto, somenteDigitos } from './fase6Utils.js';

export async function criarAlertaPublico({ tipo, valor, usuarioId = null, advogadoId = null, filtros = {}, ativo = true }) {
  if (!tipo || !valor) {
    const error = new Error('tipo e valor são obrigatórios para criar alerta.');
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    usuario_id: usuarioId,
    advogado_id: advogadoId,
    tipo,
    valor: String(valor),
    valor_normalizado: tipo === 'cpf_cnpj' || tipo === 'cnj' ? somenteDigitos(valor) : normalizarTexto(valor),
    filtros,
    ativo,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('alertas_publicos')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar alerta público: ${error.message}`);
  return data;
}

function filtrosPorAlerta(alerta) {
  const base = alerta.filtros || {};

  if (alerta.tipo === 'nome' || alerta.tipo === 'cpf_cnpj') {
    return { ...base, nome_parte: alerta.valor };
  }

  if (alerta.tipo === 'advogado') {
    return { ...base, nome_advogado: alerta.valor };
  }

  if (alerta.tipo === 'oab') {
    return { ...base, oab: somenteDigitos(alerta.valor), uf: base.uf || alerta.uf };
  }

  if (alerta.tipo === 'cnj') {
    return { ...base, numero_processo: alerta.valor };
  }

  return { ...base, nome_parte: alerta.valor };
}

async function registrarOcorrencia({ alerta, publicacao }) {
  const { data, error } = await supabaseAdmin
    .from('alertas_publicos_ocorrencias')
    .upsert({
      alerta_id: alerta.id,
      numero_cnj: publicacao.numero_cnj,
      hash_publicacao: publicacao.hash_publicacao,
      titulo: publicacao.tipo || publicacao.tipo_documento || 'Publicação encontrada',
      resumo: publicacao.texto ? publicacao.texto.slice(0, 1000) : null,
      raw: publicacao,
    }, { onConflict: 'alerta_id,hash_publicacao' })
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar ocorrência de alerta:', error.message);
    return null;
  }

  return data;
}

export async function executarAlertasPublicos({ limiteAlertas = 25, limitePorAlerta = 10 } = {}) {
  const { data: alertas, error } = await supabaseAdmin
    .from('alertas_publicos')
    .select('*')
    .eq('ativo', true)
    .order('ultima_execucao', { ascending: true, nullsFirst: true })
    .limit(limiteAlertas);

  if (error) throw new Error(`Erro ao buscar alertas públicos: ${error.message}`);

  const resultados = [];

  for (const alerta of alertas || []) {
    try {
      const consulta = await buscarPublicacoesDjenAvancado({
        filtros: {
          ...filtrosPorAlerta(alerta),
          itens_por_pagina: limitePorAlerta,
        },
        salvar: true,
        advogadoId: alerta.advogado_id || 'publico',
      });

      const ocorrencias = [];
      for (const publicacao of consulta.publicacoes || []) {
        const ocorrencia = await registrarOcorrencia({ alerta, publicacao });
        if (ocorrencia) ocorrencias.push(ocorrencia);
      }

      await supabaseAdmin
        .from('alertas_publicos')
        .update({
          ultima_execucao: new Date().toISOString(),
          status_ultima_execucao: 'sucesso',
          total_ocorrencias: (alerta.total_ocorrencias || 0) + ocorrencias.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alerta.id);

      resultados.push({
        alerta_id: alerta.id,
        tipo: alerta.tipo,
        valor: alerta.valor,
        status: 'sucesso',
        encontradas: consulta.total_retornado,
        novas_ocorrencias: ocorrencias.length,
      });
    } catch (error) {
      await supabaseAdmin
        .from('alertas_publicos')
        .update({
          ultima_execucao: new Date().toISOString(),
          status_ultima_execucao: 'erro',
          mensagem_ultima_execucao: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alerta.id);

      resultados.push({ alerta_id: alerta.id, status: 'erro', mensagem: error.message });
    }
  }

  return {
    resumo: {
      total_alertas: resultados.length,
      sucessos: resultados.filter((item) => item.status === 'sucesso').length,
      erros: resultados.filter((item) => item.status === 'erro').length,
      novas_ocorrencias: resultados.reduce((acc, item) => acc + (item.novas_ocorrencias || 0), 0),
    },
    resultados,
  };
}

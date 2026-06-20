import { supabaseAdmin } from '../../clients/supabase.js';
import { normalizarTexto, somenteDigitos } from './fase6Utils.js';

function calcularOffset(pagina = 1, porPagina = 20) {
  return (Math.max(Number(pagina), 1) - 1) * Number(porPagina);
}

function rankBasico(item, termo) {
  const t = normalizarTexto(termo);
  const texto = normalizarTexto(item.texto_indexavel || '');
  let score = 0;

  if (item.numero_cnj === somenteDigitos(termo)) score += 100;
  if (normalizarTexto(item.parte_ativa || '').includes(t)) score += 30;
  if (normalizarTexto(item.parte_passiva || '').includes(t)) score += 30;
  if (normalizarTexto(item.classe || '').includes(t)) score += 15;
  if (normalizarTexto(item.tribunal || '').includes(t)) score += 10;
  if (texto.includes(t)) score += 5;

  const atualizado = item.atualizado_em ? new Date(item.atualizado_em).getTime() : 0;
  score += Math.min(5, atualizado / Date.now() * 5);

  return Number(score.toFixed(4));
}

export async function buscarProcessosFullText({
  termo,
  tribunal = null,
  classe = null,
  pagina = 1,
  porPagina = 20,
  ordenarPor = 'relevancia',
} = {}) {
  const page = Math.max(Number(pagina || 1), 1);
  const perPage = Math.min(Math.max(Number(porPagina || 20), 1), 100);
  const offset = calcularOffset(page, perPage);
  const termoLimpo = String(termo || '').trim();

  let query = supabaseAdmin
    .from('indice_publico_processos')
    .select('*', { count: 'exact' });

  if (tribunal) query = query.eq('tribunal', String(tribunal).toUpperCase());
  if (classe) query = query.ilike('classe', `%${classe}%`);

  if (termoLimpo) {
    const cnj = somenteDigitos(termoLimpo);
    if (cnj.length >= 10) {
      query = query.or(`numero_cnj.eq.${cnj},texto_indexavel.ilike.%${termoLimpo}%`);
    } else {
      query = query.ilike('texto_indexavel', `%${termoLimpo}%`);
    }
  }

  query = query.range(offset, offset + perPage - 1);

  if (ordenarPor === 'data') {
    query = query.order('atualizado_em', { ascending: false });
  } else {
    query = query.order('atualizado_em', { ascending: false });
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Erro na busca full-text: ${error.message}`);

  const resultados = (data || [])
    .map((item) => ({
      score: rankBasico(item, termoLimpo),
      numero_cnj: item.numero_cnj,
      numero_cnj_formatado: item.numero_cnj_formatado,
      tribunal: item.tribunal,
      orgao: item.orgao,
      classe: item.classe,
      parte_ativa: item.parte_ativa,
      parte_passiva: item.parte_passiva,
      ultima_publicacao_em: item.ultima_publicacao_em,
      ultima_publicacao_tipo: item.ultima_publicacao_tipo,
      resumo_ia: item.resumo_ia,
    }))
    .sort((a, b) => ordenarPor === 'relevancia' ? b.score - a.score : 0);

  return {
    termo: termoLimpo,
    pagina: page,
    por_pagina: perPage,
    total: count || 0,
    total_paginas: Math.ceil((count || 0) / perPage),
    resultados,
  };
}

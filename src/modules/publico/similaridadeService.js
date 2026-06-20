import { supabaseAdmin } from '../../clients/supabase.js';
import { scoreSimilaridade, tokensRelevantes, somenteDigitos } from './fase6Utils.js';

export async function encontrarProcessosSimilares({ numeroCnj, texto, limite = 10, scoreMinimo = 0.12 }) {
  let baseTexto = texto || '';
  let processoBase = null;

  if (numeroCnj) {
    const { data, error } = await supabaseAdmin
      .from('indice_publico_processos')
      .select('*')
      .eq('numero_cnj', somenteDigitos(numeroCnj))
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar processo base: ${error.message}`);
    processoBase = data;
    baseTexto = baseTexto || data?.texto_indexavel || '';
  }

  const tokens = tokensRelevantes(baseTexto).slice(0, 8);
  let query = supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .limit(100);

  if (processoBase?.tribunal) {
    query = query.eq('tribunal', processoBase.tribunal);
  }

  if (tokens.length) {
    query = query.ilike('texto_indexavel', `%${tokens[0]}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar candidatos similares: ${error.message}`);

  const similares = (data || [])
    .filter((item) => item.numero_cnj !== processoBase?.numero_cnj)
    .map((item) => ({
      numero_cnj: item.numero_cnj,
      numero_cnj_formatado: item.numero_cnj_formatado,
      tribunal: item.tribunal,
      classe: item.classe,
      parte_ativa: item.parte_ativa,
      parte_passiva: item.parte_passiva,
      score: scoreSimilaridade(baseTexto, item.texto_indexavel || ''),
      resumo_ia: item.resumo_ia,
    }))
    .filter((item) => item.score >= scoreMinimo)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);

  return {
    base: processoBase ? {
      numero_cnj: processoBase.numero_cnj,
      numero_cnj_formatado: processoBase.numero_cnj_formatado,
      tribunal: processoBase.tribunal,
      classe: processoBase.classe,
    } : { texto_base: baseTexto.slice(0, 500) },
    total: similares.length,
    similares,
  };
}

import { supabaseAdmin } from '../../clients/supabase.js';
import { normalizarTexto, somenteDigitos } from './fase6Utils.js';

async function buscarEntidade({ id, documento, nome }) {
  let query = supabaseAdmin.from('entidades_publicas').select('*');

  if (id) query = query.eq('id', id);
  else if (documento) query = query.eq('documento_principal', somenteDigitos(documento));
  else if (nome) query = query.eq('nome_normalizado', normalizarTexto(nome));
  else throw new Error('Informe id, documento ou nome para gerar dossiê.');

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Erro ao buscar entidade: ${error.message}`);
  return data;
}

async function buscarProcessosDaEntidade(entidade) {
  const { data: relacoes, error } = await supabaseAdmin
    .from('entidades_processos')
    .select('*')
    .eq('entidade_id', entidade.id);

  if (error) throw new Error(`Erro ao buscar vínculos da entidade: ${error.message}`);

  const cnjs = [...new Set((relacoes || []).map((r) => r.numero_cnj).filter(Boolean))];
  if (!cnjs.length) return { processos: [], relacoes: [] };

  const { data: processos, error: processosError } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .in('numero_cnj', cnjs)
    .order('atualizado_em', { ascending: false });

  if (processosError) throw new Error(`Erro ao buscar processos do dossiê: ${processosError.message}`);
  return { processos: processos || [], relacoes: relacoes || [] };
}

function estatisticas(processos = [], relacoes = []) {
  const tribunais = {};
  const classes = {};
  const polos = { ativo: 0, passivo: 0, advogado: 0, indeterminado: 0 };

  for (const p of processos) {
    if (p.tribunal) tribunais[p.tribunal] = (tribunais[p.tribunal] || 0) + 1;
    if (p.classe) classes[p.classe] = (classes[p.classe] || 0) + 1;
  }

  for (const relacao of relacoes) {
    const papel = String(relacao.papel || '').toUpperCase();
    if (papel === 'A') polos.ativo += 1;
    else if (papel === 'P') polos.passivo += 1;
    else if (papel === 'ADVOGADO' || papel === 'advogado') polos.advogado += 1;
    else polos.indeterminado += 1;
  }

  return {
    total_processos: processos.length,
    tribunais,
    classes,
    polos,
    ultima_publicacao: processos[0]?.ultima_publicacao_em || null,
  };
}

export async function gerarDossiePublico({ id, documento, nome }) {
  const entidade = await buscarEntidade({ id, documento, nome });
  if (!entidade) return { encontrado: false, entidade: null, processos: [], estatisticas: {} };

  const { processos, relacoes } = await buscarProcessosDaEntidade(entidade);

  return {
    encontrado: true,
    entidade,
    estatisticas: estatisticas(processos, relacoes),
    processos: processos.map((p) => ({
      numero_cnj: p.numero_cnj,
      numero_cnj_formatado: p.numero_cnj_formatado,
      tribunal: p.tribunal,
      orgao: p.orgao,
      classe: p.classe,
      parte_ativa: p.parte_ativa,
      parte_passiva: p.parte_passiva,
      ultima_publicacao_em: p.ultima_publicacao_em,
      ultima_publicacao_tipo: p.ultima_publicacao_tipo,
      resumo_ia: p.resumo_ia,
    })),
  };
}

export async function listarEntidadesPublicas({ termo, tipo, limite = 20 }) {
  let query = supabaseAdmin
    .from('entidades_publicas')
    .select('*')
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (tipo) query = query.eq('tipo', tipo);
  if (termo) query = query.ilike('nome_normalizado', `%${normalizarTexto(termo)}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar entidades: ${error.message}`);
  return data || [];
}

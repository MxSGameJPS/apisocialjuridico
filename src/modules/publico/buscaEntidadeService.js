import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarPublicacoesDjenAvancado } from '../djen/djenService.js';
import { extrairCpfCnpj, montarOab, normalizarTexto, somenteDigitos } from './fase6Utils.js';

async function buscarIndicePorTexto({ termo, limite = 20 }) {
  const { data, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .ilike('texto_indexavel', `%${termo}%`)
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Erro ao buscar índice por texto: ${error.message}`);
  return data || [];
}

async function buscarIndicePorCnjs(cnjs = [], limite = 20) {
  const lista = [...new Set(cnjs.filter(Boolean))].slice(0, limite);
  if (!lista.length) return [];

  const { data, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .in('numero_cnj', lista)
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Erro ao buscar índice por CNJs: ${error.message}`);
  return data || [];
}

async function buscarCnjsPorEntidadeDocumento(documento) {
  const digitos = somenteDigitos(documento);
  if (!digitos) return [];

  const { data: entidade, error } = await supabaseAdmin
    .from('entidades_publicas')
    .select('id')
    .eq('documento_principal', digitos)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar entidade por documento: ${error.message}`);
  if (!entidade?.id) return [];

  const { data: relacoes, error: relError } = await supabaseAdmin
    .from('entidades_processos')
    .select('numero_cnj')
    .eq('entidade_id', entidade.id);

  if (relError) throw new Error(`Erro ao buscar vínculos da entidade: ${relError.message}`);
  return (relacoes || []).map((item) => item.numero_cnj).filter(Boolean);
}

async function buscarCnjsPorEntidadeNome(nome, limite = 20) {
  const termo = normalizarTexto(nome);
  if (!termo) return [];

  const { data: entidades, error } = await supabaseAdmin
    .from('entidades_publicas')
    .select('id')
    .ilike('nome_normalizado', `%${termo}%`)
    .limit(limite);

  if (error) throw new Error(`Erro ao buscar entidade por nome: ${error.message}`);
  const ids = (entidades || []).map((item) => item.id).filter(Boolean);
  if (!ids.length) return [];

  const { data: relacoes, error: relError } = await supabaseAdmin
    .from('entidades_processos')
    .select('numero_cnj')
    .in('entidade_id', ids);

  if (relError) throw new Error(`Erro ao buscar vínculos por nome: ${relError.message}`);
  return (relacoes || []).map((item) => item.numero_cnj).filter(Boolean);
}

async function buscarIndicePorCpfCnpj({ documento, limite = 20 }) {
  const digitos = somenteDigitos(documento);
  const formatadoParcial = documento;

  const { data, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .or(`texto_indexavel.ilike.%${digitos}%,texto_indexavel.ilike.%${formatadoParcial}%`)
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Erro ao buscar CPF/CNPJ no índice: ${error.message}`);

  const cnjsEntidade = await buscarCnjsPorEntidadeDocumento(documento);
  const porEntidade = await buscarIndicePorCnjs(cnjsEntidade, limite);

  return deduplicarProcessos([...(data || []), ...porEntidade]);
}

async function buscarIndicePorOab({ oab, uf, limite = 20 }) {
  const oabCompleta = montarOab(uf, oab);
  const oabAlternativa = `${String(uf || '').toUpperCase()} ${somenteDigitos(oab)}`.trim();

  const { data, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .or(`oabs.cs.{${oabCompleta}},texto_indexavel.ilike.%${oabCompleta}%,texto_indexavel.ilike.%${oabAlternativa}%`)
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Erro ao buscar OAB no índice: ${error.message}`);
  return data || [];
}

function deduplicarProcessos(lista = []) {
  const mapa = new Map();
  for (const item of lista) {
    if (!item?.numero_cnj) continue;
    mapa.set(item.numero_cnj, item);
  }
  return [...mapa.values()];
}

function resumirResultado(item) {
  return {
    score: item.score || 75,
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
    oabs: item.oabs || [],
  };
}

export async function buscarPorCpfCnpj({ documento, buscarDjen = false, limite = 20 }) {
  const resultadosIndice = await buscarIndicePorCpfCnpj({ documento, limite });
  let resultadoDjen = null;

  if (buscarDjen) {
    resultadoDjen = await buscarPublicacoesDjenAvancado({
      filtros: {
        nome_parte: documento,
        parametros_extras: { cpfCnpj: somenteDigitos(documento) },
        itens_por_pagina: Math.min(limite, 50),
      },
      salvar: true,
      advogadoId: 'publico',
    });
  }

  return {
    tipo: 'cpf_cnpj',
    documento: somenteDigitos(documento),
    total_indice: resultadosIndice.length,
    resultados: resultadosIndice.map(resumirResultado),
    djen: resultadoDjen ? { total_retornado: resultadoDjen.total_retornado, publicacoes_salvas: resultadoDjen.publicacoes_salvas } : null,
  };
}

export async function buscarPorNome({ nome, buscarDjen = true, limite = 20 }) {
  const termo = normalizarTexto(nome);
  const resultadosTexto = await buscarIndicePorTexto({ termo: nome, limite });
  const cnjsEntidade = await buscarCnjsPorEntidadeNome(nome, limite);
  const resultadosEntidade = await buscarIndicePorCnjs(cnjsEntidade, limite);
  const resultadosIndice = deduplicarProcessos([...resultadosTexto, ...resultadosEntidade]);
  let resultadoDjen = null;

  if (buscarDjen) {
    resultadoDjen = await buscarPublicacoesDjenAvancado({
      filtros: {
        nome_parte: nome,
        itens_por_pagina: Math.min(limite, 50),
      },
      salvar: true,
      advogadoId: 'publico',
    });
  }

  return {
    tipo: 'nome',
    termo,
    total_indice: resultadosIndice.length,
    resultados: resultadosIndice.map(resumirResultado),
    djen: resultadoDjen ? { total_retornado: resultadoDjen.total_retornado, publicacoes_salvas: resultadoDjen.publicacoes_salvas } : null,
  };
}

export async function buscarPorAdvogado({ nome, oab, uf, buscarDjen = true, limite = 20 }) {
  let resultadosIndice = [];

  if (oab && uf) {
    resultadosIndice = await buscarIndicePorOab({ oab, uf, limite });
  } else if (nome) {
    resultadosIndice = await buscarIndicePorTexto({ termo: nome, limite });
  }

  let resultadoDjen = null;

  if (buscarDjen) {
    resultadoDjen = await buscarPublicacoesDjenAvancado({
      filtros: {
        oab,
        uf,
        nome_advogado: nome,
        itens_por_pagina: Math.min(limite, 50),
      },
      salvar: true,
      advogadoId: 'publico',
    });
  }

  return {
    tipo: 'advogado',
    advogado: { nome, oab: oab ? somenteDigitos(oab) : null, uf: uf ? String(uf).toUpperCase() : null },
    total_indice: resultadosIndice.length,
    resultados: resultadosIndice.map(resumirResultado),
    djen: resultadoDjen ? { total_retornado: resultadoDjen.total_retornado, publicacoes_salvas: resultadoDjen.publicacoes_salvas } : null,
  };
}

export async function extrairDocumentosDoIndice({ numeroCnj }) {
  const { data, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('numero_cnj, texto_indexavel')
    .eq('numero_cnj', somenteDigitos(numeroCnj))
    .maybeSingle();

  if (error) throw new Error(`Erro ao extrair documentos: ${error.message}`);

  return {
    numero_cnj: data?.numero_cnj || somenteDigitos(numeroCnj),
    documentos_encontrados: extrairCpfCnpj(data?.texto_indexavel || ''),
  };
}

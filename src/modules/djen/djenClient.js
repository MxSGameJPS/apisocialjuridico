import { env } from '../../config/env.js';
import {
  calcularPeriodoRetroativo,
  extrairCnjsDoTexto,
  gerarHashPublicacao,
  normalizarListaPublicacoes,
  normalizarOab,
  normalizarUf,
} from './djenUtils.js';

const PARAM_MAP = {
  oab: 'numeroOab',
  numero_oab: 'numeroOab',
  uf: 'ufOab',
  uf_oab: 'ufOab',
  numero_processo: 'numeroProcesso',
  numero_cnj: 'numeroProcesso',
  processo: 'numeroProcesso',
  tribunal: 'siglaTribunal',
  sigla_tribunal: 'siglaTribunal',
  nome_parte: 'nomeParte',
  parte: 'nomeParte',
  nome_destinatario: 'nomeParte',
  nome_advogado: 'nomeAdvogado',
  advogado: 'nomeAdvogado',
  nome_orgao: 'nomeOrgao',
  orgao: 'nomeOrgao',
  tipo_comunicacao: 'tipoComunicacao',
  tipo_documento: 'tipoDocumento',
  data_inicio: 'dataDisponibilizacaoInicio',
  data_fim: 'dataDisponibilizacaoFim',
  data_disponibilizacao_inicio: 'dataDisponibilizacaoInicio',
  data_disponibilizacao_fim: 'dataDisponibilizacaoFim',
  pagina: 'pagina',
  itens_por_pagina: 'itensPorPagina',
};

function setParam(url, key, value) {
  if (value === undefined || value === null || String(value).trim() === '') return;
  url.searchParams.set(key, String(value));
}

function montarUrlBuscaAvancada(filtros = {}) {
  const url = new URL(env.DJEN_BASE_URL);

  Object.entries(PARAM_MAP).forEach(([inputKey, outputKey]) => {
    let value = filtros[inputKey];

    if (['oab', 'numero_oab'].includes(inputKey)) value = normalizarOab(value);
    if (['uf', 'uf_oab'].includes(inputKey)) value = normalizarUf(value);
    if (['numero_processo', 'numero_cnj', 'processo'].includes(inputKey)) {
      value = value ? String(value).replace(/\D/g, '') : value;
    }

    setParam(url, outputKey, value);
  });

  if (!url.searchParams.get('dataDisponibilizacaoInicio') || !url.searchParams.get('dataDisponibilizacaoFim')) {
    const periodo = calcularPeriodoRetroativo(env.DJEN_DIAS_RETROATIVOS);
    if (!url.searchParams.get('dataDisponibilizacaoInicio')) {
      url.searchParams.set('dataDisponibilizacaoInicio', periodo.dataInicio);
    }
    if (!url.searchParams.get('dataDisponibilizacaoFim')) {
      url.searchParams.set('dataDisponibilizacaoFim', periodo.dataFim);
    }
  }

  if (!url.searchParams.get('pagina')) url.searchParams.set('pagina', String(filtros.pagina || 1));
  if (!url.searchParams.get('itensPorPagina')) {
    url.searchParams.set('itensPorPagina', String(filtros.itens_por_pagina || env.DJEN_ITENS_POR_PAGINA));
  }

  Object.entries(filtros.parametros_extras || {}).forEach(([key, value]) => setParam(url, key, value));

  return url;
}

function normalizarPublicacaoDjen(item, contexto = {}) {
  const texto =
    item.texto ||
    item.textoComunicacao ||
    item.conteudo ||
    item.descricao ||
    item.comunicacao ||
    item.publicacao ||
    '';

  const numeroCnj =
    item.numero_cnj ||
    item.numeroCnj ||
    item.numeroProcesso ||
    item.numero_processo ||
    item.numeroprocessocommascara ||
    extrairCnjsDoTexto(texto)[0] ||
    null;

  const advogados = Array.isArray(item.destinatarioadvogados)
    ? item.destinatarioadvogados.map((entrada) => ({
        nome: entrada?.advogado?.nome || null,
        uf_oab: entrada?.advogado?.uf_oab || null,
        numero_oab: entrada?.advogado?.numero_oab || null,
        raw: entrada,
      }))
    : [];

  const partes = Array.isArray(item.destinatarios)
    ? item.destinatarios.map((entrada) => ({
        nome: entrada?.nome || null,
        polo: entrada?.polo || null,
        raw: entrada,
      }))
    : [];

  const publicacao = {
    comunicacao_id: item.id || item.comunicacao_id || item.numeroComunicacao || null,
    numero_cnj: numeroCnj ? String(numeroCnj).replace(/\D/g, '') : null,
    numero_cnj_formatado: item.numeroprocessocommascara || null,
    oab: normalizarOab(contexto.oab),
    uf: normalizarUf(contexto.uf),
    tribunal: item.tribunal || item.siglaTribunal || item.nomeTribunal || null,
    orgao: item.orgao || item.orgaoJulgador || item.nomeOrgao || null,
    classe: item.nomeClasse || item.classe || null,
    codigo_classe: item.codigoClasse || null,
    data_publicacao: item.data_publicacao || item.dataPublicacao || item.data_publicacao_djen || null,
    data_disponibilizacao:
      item.data_disponibilizacao || item.dataDisponibilizacao || item.dataDisponibilizacaoComunicacao || item.datadisponibilizacao || null,
    tipo: item.tipo || item.tipoComunicacao || item.tipoDocumento || null,
    tipo_documento: item.tipoDocumento || null,
    meio: item.meio || item.meiocompleto || null,
    status: item.status || null,
    texto,
    link: item.link || item.url || item.urlComunicacao || null,
    partes,
    advogados,
    raw: item,
  };

  publicacao.hash_publicacao = gerarHashPublicacao(publicacao);

  return publicacao;
}

async function executarConsultaDjen(url) {
  const headers = { Accept: 'application/json' };

  if (env.DJEN_API_KEY) {
    headers.Authorization = `Bearer ${env.DJEN_API_KEY}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Erro ao consultar DJEN: HTTP ${response.status}`);
    error.statusCode = response.status;
    error.externalStatus = response.status;
    throw error;
  }

  return data;
}

export async function consultarPublicacoesDjenAvancado(filtros = {}) {
  const url = montarUrlBuscaAvancada(filtros);
  const data = await executarConsultaDjen(url);
  const lista = normalizarListaPublicacoes(data).map((item) =>
    normalizarPublicacaoDjen(item, { oab: filtros.oab || filtros.numero_oab, uf: filtros.uf || filtros.uf_oab })
  );

  return {
    fonte: 'DJEN',
    tipo_busca: 'avancada',
    url_consultada: url.toString(),
    pagina: Number(url.searchParams.get('pagina') || 1),
    itens_por_pagina: Number(url.searchParams.get('itensPorPagina') || env.DJEN_ITENS_POR_PAGINA),
    total_retornado: lista.length,
    publicacoes: lista,
    raw: data,
  };
}

export async function consultarPublicacoesDjenPorOab({
  oab,
  uf,
  dataInicio,
  dataFim,
  pagina = 1,
  itensPorPagina = env.DJEN_ITENS_POR_PAGINA,
}) {
  if (!oab || !uf) {
    const error = new Error('oab e uf são obrigatórios para consulta no DJEN.');
    error.statusCode = 400;
    throw error;
  }

  return consultarPublicacoesDjenAvancado({
    oab,
    uf,
    data_inicio: dataInicio,
    data_fim: dataFim,
    pagina,
    itens_por_pagina: itensPorPagina,
  });
}

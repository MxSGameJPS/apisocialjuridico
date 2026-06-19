import { env } from '../../config/env.js';
import {
  calcularPeriodoRetroativo,
  extrairCnjsDoTexto,
  gerarHashPublicacao,
  normalizarListaPublicacoes,
  normalizarOab,
  normalizarUf,
} from './djenUtils.js';

function montarUrlConsulta({ oab, uf, dataInicio, dataFim, pagina = 1, itensPorPagina }) {
  const url = new URL(env.DJEN_BASE_URL);
  const oabLimpa = normalizarOab(oab);
  const ufNormalizada = normalizarUf(uf);

  const paramsPossiveis = {
    numeroOab: oabLimpa,
    ufOab: ufNormalizada,
    dataDisponibilizacaoInicio: dataInicio,
    dataDisponibilizacaoFim: dataFim,
    pagina,
    itensPorPagina,
  };

  Object.entries(paramsPossiveis).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

function normalizarPublicacaoDjen(item, contexto) {
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
    extrairCnjsDoTexto(texto)[0] ||
    null;

  const publicacao = {
    numero_cnj: numeroCnj ? String(numeroCnj).replace(/\D/g, '') : null,
    oab: normalizarOab(contexto.oab),
    uf: normalizarUf(contexto.uf),
    tribunal: item.tribunal || item.siglaTribunal || item.nomeTribunal || null,
    orgao: item.orgao || item.orgaoJulgador || item.nomeOrgao || null,
    data_publicacao: item.data_publicacao || item.dataPublicacao || item.data_publicacao_djen || null,
    data_disponibilizacao:
      item.data_disponibilizacao || item.dataDisponibilizacao || item.dataDisponibilizacaoComunicacao || null,
    tipo: item.tipo || item.tipoComunicacao || item.tipoDocumento || null,
    texto,
    link: item.link || item.url || item.urlComunicacao || null,
    raw: item,
  };

  publicacao.hash_publicacao = gerarHashPublicacao(publicacao);

  return publicacao;
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

  const periodo = !dataInicio || !dataFim ? calcularPeriodoRetroativo(env.DJEN_DIAS_RETROATIVOS) : null;
  const url = montarUrlConsulta({
    oab,
    uf,
    dataInicio: dataInicio || periodo.dataInicio,
    dataFim: dataFim || periodo.dataFim,
    pagina,
    itensPorPagina,
  });

  const headers = {
    Accept: 'application/json',
  };

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

  const lista = normalizarListaPublicacoes(data).map((item) =>
    normalizarPublicacaoDjen(item, { oab, uf })
  );

  return {
    fonte: 'DJEN',
    url_consultada: url.toString(),
    pagina,
    itens_por_pagina: itensPorPagina,
    total_retornado: lista.length,
    publicacoes: lista,
    raw: data,
  };
}

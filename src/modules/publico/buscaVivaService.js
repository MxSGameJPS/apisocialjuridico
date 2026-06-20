import { buscarProcessosFullText } from './buscaFullTextService.js';
import { enriquecerBuscaPublicaDjen } from './enriquecimentoPublicoService.js';
import { extrairEntidadesDeProcesso } from './extratorEntidadesService.js';
import { somenteDigitos } from './fase6Utils.js';

function montarFiltrosDjen(termo, filtros = {}) {
  const valor = String(termo || '').trim();
  const digitos = somenteDigitos(valor);

  const base = {
    tribunal: filtros.tribunal || undefined,
    data_inicio: filtros.data_inicio || undefined,
    data_fim: filtros.data_fim || undefined,
    itens_por_pagina: filtros.itens_por_pagina || 10,
  };

  if (digitos.length >= 16) {
    return { ...base, numero_processo: valor };
  }

  if (/^[A-Z]{2}\s*\d{3,}/i.test(valor)) {
    const uf = valor.slice(0, 2).toUpperCase();
    const oab = somenteDigitos(valor.slice(2));
    return { ...base, uf, oab };
  }

  return { ...base, nome_parte: valor };
}

export async function buscaVivaProcessual({
  termo,
  tribunal = null,
  pagina = 1,
  porPagina = 20,
  enriquecer = true,
  limiteDjen = 10,
  dataInicio = null,
  dataFim = null,
} = {}) {
  const buscaInicial = await buscarProcessosFullText({
    termo,
    tribunal,
    pagina,
    porPagina,
    ordenarPor: 'relevancia',
  });

  if (buscaInicial.total > 0 || !enriquecer) {
    return {
      origem: 'indice_local',
      enriqueceu_base: false,
      busca: buscaInicial,
      enriquecimento: null,
    };
  }

  const filtros = montarFiltrosDjen(termo, {
    tribunal,
    data_inicio: dataInicio,
    data_fim: dataFim,
    itens_por_pagina: Math.min(Number(limiteDjen || 10), 30),
  });

  const enriquecimento = await enriquecerBuscaPublicaDjen({
    filtros,
    salvarBusca: true,
    usarDatajud: true,
    limite: Math.min(Number(limiteDjen || 10), 30),
  });

  const cnjs = (enriquecimento?.resultados || [])
    .map((item) => item.numero_cnj)
    .filter(Boolean);

  for (const cnj of cnjs.slice(0, 10)) {
    try {
      await extrairEntidadesDeProcesso({ numeroCnj: cnj });
    } catch (error) {
      console.error('Erro ao extrair entidades na busca viva:', error.message);
    }
  }

  const buscaFinal = await buscarProcessosFullText({
    termo,
    tribunal,
    pagina,
    porPagina,
    ordenarPor: 'relevancia',
  });

  return {
    origem: 'busca_viva_djen',
    enriqueceu_base: true,
    busca: buscaFinal,
    enriquecimento: {
      resumo: enriquecimento?.resumo,
      total_djen: enriquecimento?.busca?.total_retornado || 0,
      processos_enriquecidos: cnjs.length,
    },
  };
}

import { buscarProcessoPorNumero } from '../processos/processoService.js';
import { buscarProcessosFullText } from './buscaFullTextService.js';
import { enriquecerBuscaPublicaDjen } from './enriquecimentoPublicoService.js';
import { extrairEntidadesDeProcesso } from './extratorEntidadesService.js';
import { somenteDigitos } from './fase6Utils.js';
import { salvarIndicePublicoProcessual } from './indicePublicoService.js';

function montarFiltrosDjen(termo, filtros = {}) {
  const valor = String(termo || '').trim();
  const digitos = somenteDigitos(valor);

  const base = {
    tribunal: filtros.tribunal || undefined,
    data_inicio: filtros.data_inicio || undefined,
    data_fim: filtros.data_fim || undefined,
    itens_por_pagina: filtros.itens_por_pagina || 10,
  };

  if (digitos.length >= 16) return { ...base, numero_processo: valor };

  if (/^[A-Z]{2}\s*\d{3,}/i.test(valor)) {
    const uf = valor.slice(0, 2).toUpperCase();
    const oab = somenteDigitos(valor.slice(2));
    return { ...base, uf, oab };
  }

  if (digitos.length === 11 || digitos.length === 14) {
    return { ...base, nome_parte: valor, parametros_extras: { cpfCnpj: digitos } };
  }

  return { ...base, nome_parte: valor };
}

function processoDatajudParaPublicacao(processo) {
  return {
    numero_cnj: processo.numero_cnj,
    numero_cnj_formatado: processo.numero_cnj_formatado || processo.numero_cnj,
    tribunal: processo.tribunal?.codigo || processo.tribunal?.nome || null,
    orgao: processo.capa?.orgao_julgador || null,
    classe: processo.capa?.classe || null,
    codigo_classe: processo.capa?.codigo_classe || null,
    tipo: 'DataJud',
    tipo_documento: 'Processo público',
    texto: processo.resumo_ia || null,
    data_disponibilizacao: processo.capa?.data_ultima_atualizacao || null,
    data_publicacao: processo.capa?.data_ultima_atualizacao || null,
    partes: (processo.partes || []).map((parte) => ({
      nome: parte.nome,
      polo: parte.polo,
      tipo: parte.tipo,
      documento: parte.documento,
    })),
    advogados: [],
    raw: processo.raw || processo,
  };
}

async function enriquecerPorCnjDireto({ termo }) {
  const cnj = somenteDigitos(termo);
  const diagnostico = {
    modo: 'cnj_datajud_direto',
    cnj,
    datajud_encontrado: false,
    indexado: false,
    erro: null,
  };

  try {
    const processo = await buscarProcessoPorNumero(cnj);
    diagnostico.datajud_encontrado = true;

    const publicacao = processoDatajudParaPublicacao(processo);
    const indice = await salvarIndicePublicoProcessual({ publicacao, processoDatajud: processo });
    diagnostico.indexado = Boolean(indice);

    try {
      await extrairEntidadesDeProcesso({ numeroCnj: cnj });
    } catch (error) {
      diagnostico.erro_entidades = error.message;
    }

    return diagnostico;
  } catch (error) {
    diagnostico.erro = error.message;
    return diagnostico;
  }
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
  const termoBusca = String(termo || '').trim();
  const digitos = somenteDigitos(termoBusca);

  const buscaInicial = await buscarProcessosFullText({
    termo: termoBusca,
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
      diagnostico: {
        busca_local_total: buscaInicial.total,
        motivo: buscaInicial.total > 0 ? 'Encontrado no índice local.' : 'Enriquecimento desativado.',
      },
    };
  }

  let diagnosticoCnj = null;

  if (digitos.length === 20) {
    diagnosticoCnj = await enriquecerPorCnjDireto({ termo: termoBusca });
  }

  let enriquecimento = null;
  let cnjs = [];

  if (!diagnosticoCnj?.indexado) {
    const filtros = montarFiltrosDjen(termoBusca, {
      tribunal,
      data_inicio: dataInicio,
      data_fim: dataFim,
      itens_por_pagina: Math.min(Number(limiteDjen || 10), 30),
    });

    enriquecimento = await enriquecerBuscaPublicaDjen({
      filtros,
      salvarBusca: true,
      usarDatajud: true,
      limite: Math.min(Number(limiteDjen || 10), 30),
    });

    cnjs = (enriquecimento?.resultados || []).map((item) => item.numero_cnj).filter(Boolean);

    for (const cnj of cnjs.slice(0, 10)) {
      try {
        await extrairEntidadesDeProcesso({ numeroCnj: cnj });
      } catch (error) {
        console.error('Erro ao extrair entidades na busca viva:', error.message);
      }
    }
  }

  const buscaFinal = await buscarProcessosFullText({
    termo: termoBusca,
    tribunal,
    pagina,
    porPagina,
    ordenarPor: 'relevancia',
  });

  return {
    origem: diagnosticoCnj?.indexado ? 'busca_viva_datajud' : 'busca_viva_djen',
    enriqueceu_base: true,
    busca: buscaFinal,
    enriquecimento: {
      cnj_direto: diagnosticoCnj,
      resumo: enriquecimento?.resumo || null,
      total_djen: enriquecimento?.busca?.total_retornado || 0,
      processos_enriquecidos: cnjs.length + (diagnosticoCnj?.indexado ? 1 : 0),
    },
    diagnostico: {
      busca_local_total: buscaInicial.total,
      busca_final_total: buscaFinal.total,
      cnj_detectado: digitos.length === 20,
      datajud_direto: diagnosticoCnj,
      djen_total: enriquecimento?.busca?.total_retornado || 0,
      cnjs_extraidos_djen: cnjs.length,
    },
  };
}

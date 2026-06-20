import { buscarProcessoPorNumero } from '../processos/processoService.js';
import { buscaVivaProcessual } from './buscaVivaService.js';
import { somenteDigitos } from './fase6Utils.js';

const ACTIVE_HINTS = ['ATIVO', 'AUTOR', 'REQUERENTE', 'EXEQUENTE', 'IMPETRANTE', 'RECORRENTE', 'AGRAVANTE', 'RECLAMANTE'];
const PASSIVE_HINTS = ['PASSIVO', 'REU', 'RÉU', 'REQUERIDO', 'EXECUTADO', 'IMPETRADO', 'RECORRIDO', 'AGRAVADO', 'RECLAMADO'];

export function normalizarConsultaOab({ termo, uf, oab } = {}) {
  const explicitUf = String(uf || '').replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2);
  const explicitOab = somenteDigitos(oab || '');
  if (explicitUf && explicitOab) {
    return { valido: true, uf: explicitUf, oab: explicitOab, termo: `${explicitUf} ${explicitOab}` };
  }

  const raw = String(termo || '').trim();
  const match = raw.match(/(?:OAB\s*\/?\s*)?([A-Z]{2})\s*[-/.]?\s*(\d{3,8})/i);
  if (match) {
    return { valido: true, uf: match[1].toUpperCase(), oab: somenteDigitos(match[2]), termo: `${match[1].toUpperCase()} ${somenteDigitos(match[2])}` };
  }

  return { valido: false, erro: 'Informe a OAB no formato UF + número. Exemplo: RS 140234.' };
}

function normalizarTexto(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function classificarPolo(parte = {}) {
  const texto = normalizarTexto([parte.polo, parte.tipo, parte.tipo_parte, parte.role, parte.qualificacao].filter(Boolean).join(' '));
  if (ACTIVE_HINTS.some((hint) => texto.includes(hint))) return 'ativa';
  if (PASSIVE_HINTS.some((hint) => texto.includes(hint))) return 'passiva';
  return 'outras';
}

function formatarCnj(value) {
  const digits = somenteDigitos(value);
  if (digits.length !== 20) return value || '';
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

function normalizarAdvogado(raw = {}) {
  const oab = somenteDigitos(raw.oab || raw.numero_oab || raw.numeroOab || raw.inscricao || raw.inscricao_oab || '');
  const uf = String(raw.uf || raw.uf_oab || raw.oab_uf || raw.estado || '').replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2);
  return {
    nome: raw.nome || raw.name || raw.nome_advogado || raw.advogado || '',
    oab,
    uf,
    raw,
  };
}

function extrairAdvogadosDaParte(parte = {}) {
  const candidatos = [
    parte.advogados,
    parte.advogado,
    parte.procuradores,
    parte.representantes,
    parte.representantes_processuais,
  ];

  const lista = [];
  for (const candidato of candidatos) {
    if (!candidato) continue;
    if (Array.isArray(candidato)) lista.push(...candidato);
    else if (typeof candidato === 'object') lista.push(candidato);
  }

  return lista.map(normalizarAdvogado).filter((adv) => adv.nome || adv.oab);
}

function normalizarParte(parte = {}, index = 0) {
  const advogados = extrairAdvogadosDaParte(parte);
  return {
    indice: index,
    nome: parte.nome || parte.name || parte.razao_social || parte.razaoSocial || '',
    tipo: parte.tipo || parte.type || parte.tipo_pessoa || parte.tipoPessoa || 'nao_informado',
    polo: parte.polo || parte.role || parte.tipo_parte || parte.tipoParte || '',
    documento: parte.documento || parte.cpf_cnpj || parte.document || null,
    advogados,
    raw: parte,
  };
}

function agruparPartes(partes = []) {
  const grupos = { ativa: [], passiva: [], outras: [], todas: [] };
  partes.forEach((parte, index) => {
    const normalizada = normalizarParte(parte, index);
    const grupo = classificarPolo(normalizada);
    grupos[grupo].push(normalizada);
    grupos.todas.push(normalizada);
  });
  return grupos;
}

function oabIgual(advogado, consulta) {
  if (!advogado?.oab || !consulta?.oab) return false;
  const sameNumber = somenteDigitos(advogado.oab) === somenteDigitos(consulta.oab);
  const sameUf = !advogado.uf || !consulta.uf || String(advogado.uf).toUpperCase() === String(consulta.uf).toUpperCase();
  return sameNumber && sameUf;
}

function extrairVinculoOab(partesAgrupadas, consulta) {
  const partesSugeridas = [];
  const advogadosEncontrados = [];

  for (const parte of partesAgrupadas.todas || []) {
    for (const advogado of parte.advogados || []) {
      if (oabIgual(advogado, consulta)) {
        advogadosEncontrados.push(advogado);
        partesSugeridas.push({
          indice: parte.indice,
          nome: parte.nome,
          polo: parte.polo,
          tipo: parte.tipo,
          motivo: 'OAB encontrada vinculada a esta parte no retorno detalhado.',
        });
      }
    }
  }

  return {
    encontrada_no_detalhe: advogadosEncontrados.length > 0,
    advogados_encontrados: advogadosEncontrados,
    partes_sugeridas: partesSugeridas,
    pode_sugerir_cliente: partesSugeridas.length === 1,
    confianca: partesSugeridas.length === 1 ? 0.95 : partesSugeridas.length > 1 ? 0.75 : 0.35,
    observacao: partesSugeridas.length
      ? 'A OAB foi localizada em vínculo de parte no detalhe disponível.'
      : 'A OAB foi encontrada em publicação/índice, mas a relação advogado ↔ parte não foi confirmada no detalhe público.',
  };
}

function resumoDeProcessoBasico(item = {}) {
  return {
    numero_cnj: somenteDigitos(item.numero_cnj),
    numero_cnj_formatado: item.numero_cnj_formatado || formatarCnj(item.numero_cnj),
    tribunal: item.tribunal || null,
    orgao: item.orgao || null,
    classe: item.classe || null,
    parte_ativa: item.parte_ativa || null,
    parte_passiva: item.parte_passiva || null,
    ultima_publicacao_em: item.ultima_publicacao_em || null,
    ultima_publicacao_tipo: item.ultima_publicacao_tipo || null,
    resumo_ia: item.resumo_ia || null,
    score: item.score || 0,
  };
}

function montarProcessoPadronizado({ item, detalhe, detalheErro, consulta }) {
  const base = resumoDeProcessoBasico(item);
  const capa = detalhe?.capa || {};
  const tribunal = detalhe?.tribunal || {};
  const partes = agruparPartes(Array.isArray(detalhe?.partes) ? detalhe.partes : []);
  const vinculoOab = extrairVinculoOab(partes, consulta);

  return {
    ...base,
    numero_cnj_formatado: detalhe?.numero_cnj_formatado || base.numero_cnj_formatado,
    tribunal: tribunal.codigo || tribunal.nome || base.tribunal,
    tribunal_nome: tribunal.nome || null,
    orgao: capa.orgao_julgador || base.orgao,
    classe: capa.classe || base.classe,
    sistema: capa.sistema || null,
    formato: capa.formato || null,
    area: capa.area || null,
    grau: capa.grau || null,
    data_ajuizamento: capa.data_ajuizamento || null,
    data_ultima_atualizacao: capa.data_ultima_atualizacao || base.ultima_publicacao_em,
    assuntos: Array.isArray(capa.assuntos) ? capa.assuntos : [],
    partes,
    advogados: [...new Map(partes.todas.flatMap((parte) => parte.advogados || []).map((adv) => [`${adv.uf}-${adv.oab}-${adv.nome}`, adv])).values()],
    ultimas_movimentacoes: Array.isArray(detalhe?.ultimas_movimentacoes) ? detalhe.ultimas_movimentacoes.slice(0, 10) : [],
    resumo_ia: detalhe?.resumo_ia || base.resumo_ia,
    vinculo_oab: vinculoOab,
    fontes: {
      indice_publico: true,
      djen: true,
      datajud_detalhado: Boolean(detalhe),
    },
    alertas: [
      ...(detalheErro ? [`Não foi possível detalhar no DataJud: ${detalheErro}`] : []),
      ...(vinculoOab.partes_sugeridas.length ? [] : ['Confirme manualmente qual parte é cliente antes de importar para CRM.']),
    ],
  };
}

async function detalharProcesso(numeroCnj) {
  try {
    const detalhe = await buscarProcessoPorNumero(numeroCnj);
    return { detalhe, erro: null };
  } catch (error) {
    return { detalhe: null, erro: error.message };
  }
}

export async function buscarProcessosPorOabRobusto({ termo, uf, oab, limiteDjen = 20, incluirDetalhes = true, limiteDetalhes = 10, dataInicio = null, dataFim = null } = {}) {
  const consulta = normalizarConsultaOab({ termo, uf, oab });
  if (!consulta.valido) {
    const error = new Error(consulta.erro);
    error.statusCode = 400;
    throw error;
  }

  const limiteSeguro = Math.min(Math.max(Number(limiteDjen || 20), 1), 30);
  const buscaViva = await buscaVivaProcessual({
    termo: consulta.termo,
    pagina: 1,
    porPagina: limiteSeguro,
    enriquecer: true,
    limiteDjen: limiteSeguro,
    dataInicio,
    dataFim,
  });

  const resultados = buscaViva?.busca?.resultados || [];
  const detalharAte = incluirDetalhes ? Math.min(Math.max(Number(limiteDetalhes || 10), 0), resultados.length, 15) : 0;
  const processos = [];

  for (let index = 0; index < resultados.length; index += 1) {
    const item = resultados[index];
    let detalhe = null;
    let detalheErro = null;

    if (index < detalharAte && item.numero_cnj) {
      const detalhamento = await detalharProcesso(item.numero_cnj);
      detalhe = detalhamento.detalhe;
      detalheErro = detalhamento.erro;
    }

    processos.push(montarProcessoPadronizado({ item, detalhe, detalheErro, consulta }));
  }

  const diagnostico = buscaViva?.diagnostico || {};

  return {
    consulta: {
      tipo: 'oab',
      uf: consulta.uf,
      numero: consulta.oab,
      termo: consulta.termo,
      data_inicio: dataInicio,
      data_fim: dataFim,
    },
    metricas: {
      processos_unicos: processos.length,
      detalhados_datajud: processos.filter((item) => item.fontes?.datajud_detalhado).length,
      djen_total: diagnostico.djen_total || buscaViva?.enriquecimento?.total_djen || 0,
      cnjs_extraidos_djen: diagnostico.cnjs_extraidos_djen || 0,
      busca_final_total: diagnostico.busca_final_total || processos.length,
    },
    processos,
    diagnostico: {
      origem: buscaViva?.origem,
      tipo_detectado: diagnostico.tipo_detectado,
      oab_detectada: diagnostico.oab_detectada,
      busca_especializada_total_indice: diagnostico.busca_especializada_total_indice || 0,
      busca_especializada_djen: diagnostico.busca_especializada_djen || null,
      observacoes: [
        'Resultados representam processos/publicações públicas localizadas pela OAB informada.',
        'A definição do cliente deve ser confirmada pelo advogado quando não houver vínculo claro OAB ↔ parte.',
      ],
    },
  };
}

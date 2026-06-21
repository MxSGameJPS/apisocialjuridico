import { somenteDigitos } from '../publico/fase6Utils.js';
import { montarTimelineProcessual } from '../publico/timelineService.js';
import { listarVinculosProcessuaisPlataforma } from './vinculosPlataformaService.js';

function normalizarTexto(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function primeiraString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || null;
}

function parteResumo({ nome = null, polo = null, tipo = null, origem = null, confianca = null, vinculoId = null } = {}) {
  if (!nome) return null;
  return {
    nome,
    polo,
    tipo,
    origem,
    confianca,
    vinculo_id: vinculoId,
  };
}

function extrairPartesDoProcesso(processo = {}) {
  const partes = [];

  if (processo.parte_ativa) {
    partes.push(parteResumo({
      nome: processo.parte_ativa,
      polo: 'ativa',
      tipo: 'parte_ativa',
      origem: processo.fontes?.partes_fallback_indice ? 'indice_publico' : 'processo',
      confianca: processo.fontes?.partes_fallback_indice ? 0.75 : 0.9,
    }));
  }

  if (processo.parte_passiva) {
    partes.push(parteResumo({
      nome: processo.parte_passiva,
      polo: 'passiva',
      tipo: 'parte_passiva',
      origem: processo.fontes?.partes_fallback_indice ? 'indice_publico' : 'processo',
      confianca: processo.fontes?.partes_fallback_indice ? 0.75 : 0.9,
    }));
  }

  if (Array.isArray(processo.partes?.todas)) {
    for (const parte of processo.partes.todas) {
      const nome = parte.nome || parte.nome_parte || parte.name;
      if (!nome) continue;
      const exists = partes.some((item) => normalizarTexto(item.nome) === normalizarTexto(nome));
      if (!exists) {
        partes.push(parteResumo({
          nome,
          polo: parte.polo || parte.tipo_polo || parte.tipo || null,
          tipo: parte.tipo || parte.tipo_parte || null,
          origem: parte.fonte || 'partes_estruturadas',
          confianca: parte.confianca || null,
        }));
      }
    }
  }

  return partes.filter(Boolean);
}

function resumoProcesso(cnj, processo = {}) {
  return {
    numero_cnj: cnj,
    numero_formatado: processo.numero_formatado || processo.numero_processo || processo.numero || null,
    classe: processo.classe || processo.classe_processual || null,
    tribunal: processo.tribunal || processo.siglaTribunal || null,
    orgao: processo.orgao || processo.orgao_julgador || null,
    grau: processo.grau || null,
    assunto: processo.assunto || processo.assuntos || null,
    data_distribuicao: processo.data_distribuicao || processo.data_ajuizamento || null,
    data_ultima_atualizacao: processo.data_ultima_atualizacao || processo.updated_at || null,
    ultima_publicacao_em: processo.ultima_publicacao_em || null,
    ultima_publicacao_tipo: processo.ultima_publicacao_tipo || null,
    fonte: processo.fontes?.datajud_detalhado ? 'DJEN/DataJud' : (processo.fonte || 'API Social Juridico'),
    raw: processo,
  };
}

function montarParteContraria({ cliente, parteContrariaConfirmada, partesProcesso }) {
  if (parteContrariaConfirmada) return parteContrariaConfirmada;
  if (!cliente) return null;

  const poloCliente = cliente.polo;
  if (poloCliente === 'ativa') return partesProcesso.find((parte) => parte.polo === 'passiva') || null;
  if (poloCliente === 'passiva') return partesProcesso.find((parte) => parte.polo === 'ativa') || null;
  return null;
}

function vinculoParaParte(vinculo = {}) {
  return parteResumo({
    nome: vinculo.parte_nome,
    polo: vinculo.parte_polo,
    tipo: vinculo.parte_tipo,
    origem: vinculo.origem || 'vinculo_confirmado',
    confianca: Number(vinculo.confianca || 1),
    vinculoId: vinculo.id,
  });
}

function eventosRecentes(timeline = null, limite = 5) {
  const eventos = Array.isArray(timeline?.eventos) ? timeline.eventos : [];
  return eventos.slice(0, Math.min(Number(limite || 5), 20)).map((evento) => ({
    data: evento.data || null,
    tipo: evento.tipo || evento.titulo || null,
    titulo: evento.titulo || evento.tipo || 'Evento processual',
    descricao: evento.descricao || null,
    origem: evento.origem || null,
  }));
}

export async function montarPayloadImportacaoCrm({
  numeroCnj = null,
  numero_cnj = null,
  processo = {},
  ownerRef = null,
  plataformaRef = null,
  clienteId = null,
  uf = null,
  oab = null,
  termoOab = null,
  incluirTimeline = false,
  limiteEventos = 5,
} = {}) {
  const cnj = somenteDigitos(numeroCnj || numero_cnj || processo.numero_cnj || processo.numero_processo || '');
  if (cnj.length !== 20) {
    const error = new Error('Informe um numero CNJ valido com 20 digitos.');
    error.statusCode = 400;
    throw error;
  }

  const vinculos = await listarVinculosProcessuaisPlataforma({
    clienteId,
    ownerRef,
    plataformaRef,
    numero_cnj: cnj,
    uf,
    oab,
    termoOab,
    ativo: true,
    limite: 50,
  });

  const clienteVinculo = vinculos.find((vinculo) => vinculo.tipo_vinculo === 'cliente_confirmado') || null;
  const parteContrariaVinculo = vinculos.find((vinculo) => vinculo.tipo_vinculo === 'parte_contraria') || null;

  let timeline = null;
  if (incluirTimeline) {
    try {
      timeline = await montarTimelineProcessual({ numeroCnj: cnj, atualizarDatajud: false });
    } catch (error) {
      timeline = { erro: error.message };
    }
  }

  const partesProcesso = extrairPartesDoProcesso(processo);
  const cliente = clienteVinculo ? vinculoParaParte(clienteVinculo) : null;
  const parteContrariaConfirmada = parteContrariaVinculo ? vinculoParaParte(parteContrariaVinculo) : null;
  const parteContraria = montarParteContraria({ cliente, parteContrariaConfirmada, partesProcesso });

  const prontoParaImportar = Boolean(cliente);
  const acaoRecomendada = prontoParaImportar ? 'importar_para_crm' : 'confirmar_cliente_antes_de_importar';

  return {
    pronto_para_importar: prontoParaImportar,
    acao_recomendada: acaoRecomendada,
    motivo: prontoParaImportar
      ? 'Cliente confirmado pela plataforma.'
      : 'Nao ha cliente confirmado para este processo. Confirme a parte antes de importar no CRM.',
    owner_ref: ownerRef || null,
    plataforma_ref: plataformaRef || null,
    processo: resumoProcesso(cnj, processo),
    cliente,
    parte_contraria: parteContraria,
    partes_sugeridas: partesProcesso,
    vinculos_confirmados: vinculos.map((vinculo) => ({
      id: vinculo.id,
      tipo_vinculo: vinculo.tipo_vinculo,
      parte_nome: vinculo.parte_nome,
      parte_polo: vinculo.parte_polo,
      parte_tipo: vinculo.parte_tipo,
      plataforma_ref: vinculo.plataforma_ref,
      confianca: Number(vinculo.confianca || 1),
      observacao: vinculo.observacao || null,
    })),
    monitoramento_sugerido: true,
    monitoramento_payload: {
      tipo: 'cnj',
      numero_cnj: cnj,
      valor: cnj,
      owner_ref: ownerRef || null,
      plataforma_ref: plataformaRef || null,
      frequencia_minutos: 360,
      ativo: true,
    },
    eventos_recentes: eventosRecentes(timeline, limiteEventos),
    alertas: prontoParaImportar
      ? []
      : ['Confirme manualmente qual parte representa o cliente antes da importacao.'],
    metadados: {
      gerado_em: new Date().toISOString(),
      origem: 'payload_importacao_crm',
      possui_timeline: Boolean(timeline && !timeline.erro),
      timeline_erro: timeline?.erro || null,
      classe_detectada: primeiraString(processo.classe, processo.classe_processual),
    },
  };
}

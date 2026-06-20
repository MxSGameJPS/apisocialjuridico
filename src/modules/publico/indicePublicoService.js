import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarProcessoPorNumero } from '../processos/processoService.js';

function escolherPartePorPolo(partes = [], polo) {
  return partes.find((parte) => String(parte?.polo || '').toUpperCase() === polo)?.nome || null;
}

function nomesPartes(partes = []) {
  return partes.map((parte) => parte?.nome).filter(Boolean);
}

function nomesAdvogados(advogados = []) {
  return advogados.map((advogado) => advogado?.nome).filter(Boolean);
}

function oabsAdvogados(advogados = []) {
  return advogados
    .map((advogado) => {
      const numero = advogado?.numero_oab || advogado?.oab;
      const uf = advogado?.uf_oab || advogado?.uf;
      if (!numero && !uf) return null;
      return `${uf || ''}${numero || ''}`.trim();
    })
    .filter(Boolean);
}

function montarTextoIndexavel({ publicacao, processoDatajud }) {
  return [
    publicacao?.numero_cnj,
    publicacao?.numero_cnj_formatado,
    publicacao?.tribunal,
    publicacao?.orgao,
    publicacao?.classe,
    publicacao?.tipo,
    publicacao?.tipo_documento,
    publicacao?.texto,
    ...(nomesPartes(publicacao?.partes || [])),
    ...(nomesAdvogados(publicacao?.advogados || [])),
    processoDatajud?.capa?.classe,
    processoDatajud?.capa?.orgao_julgador,
    processoDatajud?.resumo_ia,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 25000);
}

export async function salvarIndicePublicoProcessual({ publicacao, processoDatajud = null }) {
  if (!publicacao?.numero_cnj) {
    const error = new Error('numero_cnj é obrigatório para indexar processo público.');
    error.statusCode = 400;
    throw error;
  }

  const partes = publicacao.partes || [];
  const advogados = publicacao.advogados || [];

  const payload = {
    numero_cnj: publicacao.numero_cnj,
    numero_cnj_formatado: publicacao.numero_cnj_formatado,
    tribunal: publicacao.tribunal || processoDatajud?.tribunal?.codigo || null,
    orgao: publicacao.orgao || processoDatajud?.capa?.orgao_julgador || null,
    classe: publicacao.classe || processoDatajud?.capa?.classe || null,
    codigo_classe: publicacao.codigo_classe ? String(publicacao.codigo_classe) : null,
    assunto: processoDatajud?.capa?.assuntos || [],
    parte_ativa: escolherPartePorPolo(partes, 'A'),
    parte_passiva: escolherPartePorPolo(partes, 'P'),
    partes,
    advogados,
    oabs: oabsAdvogados(advogados),
    ultima_publicacao_em: publicacao.data_disponibilizacao || publicacao.data_publicacao || null,
    ultima_publicacao_tipo: publicacao.tipo || publicacao.tipo_documento || null,
    ultima_publicacao_texto: publicacao.texto || null,
    ultima_publicacao_id: publicacao.comunicacao_id ? String(publicacao.comunicacao_id) : null,
    resumo_ia: processoDatajud?.resumo_ia || null,
    raw_datajud: processoDatajud?.raw || null,
    raw_publicacao: publicacao.raw || publicacao,
    texto_indexavel: montarTextoIndexavel({ publicacao, processoDatajud }),
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .upsert(payload, { onConflict: 'numero_cnj' })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar índice público processual: ${error.message}`);
  }

  return data;
}

export async function enriquecerPublicacaoComDatajud({ publicacao, usarDatajud = true }) {
  let processoDatajud = null;
  let status = 'indexado_sem_datajud';
  let mensagem = 'Publicação indexada sem enriquecimento DataJud.';

  if (usarDatajud && publicacao.numero_cnj) {
    try {
      processoDatajud = await buscarProcessoPorNumero(publicacao.numero_cnj);
      status = 'enriquecido_datajud';
      mensagem = 'Publicação enriquecida com DataJud e indexada.';
    } catch (error) {
      status = 'erro_datajud';
      mensagem = error.message || 'Erro ao consultar DataJud.';
    }
  }

  const indice = await salvarIndicePublicoProcessual({ publicacao, processoDatajud });

  return {
    numero_cnj: publicacao.numero_cnj,
    status,
    mensagem,
    indice,
    processo_datajud_encontrado: Boolean(processoDatajud),
  };
}

export async function buscarIndicePublico({ termo, numeroCnj, tribunal, limite = 20 }) {
  let query = supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (numeroCnj) {
    query = query.eq('numero_cnj', String(numeroCnj).replace(/\D/g, ''));
  }

  if (tribunal) {
    query = query.eq('tribunal', String(tribunal).toUpperCase());
  }

  if (termo) {
    query = query.ilike('texto_indexavel', `%${termo}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar índice público: ${error.message}`);
  }

  return data || [];
}

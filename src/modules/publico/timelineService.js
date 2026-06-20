import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarProcessoPorNumero } from '../processos/processoService.js';
import { somenteDigitos } from './fase6Utils.js';

function ordenarEventos(eventos) {
  return eventos
    .filter((evento) => evento.data)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
}

function eventoPublicacao(publicacao) {
  return {
    origem: 'DJEN',
    tipo: publicacao.tipo || publicacao.tipo_documento || 'Publicação',
    titulo: publicacao.ultima_publicacao_tipo || publicacao.tipo || 'Publicação DJEN',
    data: publicacao.ultima_publicacao_em || publicacao.data_disponibilizacao || publicacao.data_publicacao,
    descricao: publicacao.ultima_publicacao_texto || publicacao.texto || null,
    raw: publicacao,
  };
}

function eventosDatajud(processo) {
  return (processo?.ultimas_movimentacoes || []).map((mov) => ({
    origem: 'DataJud',
    tipo: 'Movimentação',
    titulo: mov.nome || 'Movimentação processual',
    data: mov.data || mov.dataHora,
    descricao: mov.nome || null,
    raw: mov,
  }));
}

export async function montarTimelineProcessual({ numeroCnj, atualizarDatajud = false }) {
  const cnj = somenteDigitos(numeroCnj);

  const { data: indice, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .eq('numero_cnj', cnj)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar processo no índice: ${error.message}`);

  let processoDatajud = null;
  if (atualizarDatajud || !indice?.raw_datajud) {
    try {
      processoDatajud = await buscarProcessoPorNumero(cnj);
    } catch {
      processoDatajud = null;
    }
  }

  const rawDatajud = processoDatajud || (indice?.raw_datajud ? {
    ultimas_movimentacoes: (indice.raw_datajud.movimentos || []).map((mov) => ({
      nome: mov.nome,
      data: mov.dataHora,
      codigo: mov.codigo,
      raw: mov,
    })),
  } : null);

  const eventos = ordenarEventos([
    ...(indice ? [eventoPublicacao(indice)] : []),
    ...eventosDatajud(rawDatajud),
  ]);

  return {
    numero_cnj: cnj,
    processo: indice ? {
      numero_cnj_formatado: indice.numero_cnj_formatado,
      tribunal: indice.tribunal,
      orgao: indice.orgao,
      classe: indice.classe,
      parte_ativa: indice.parte_ativa,
      parte_passiva: indice.parte_passiva,
    } : null,
    total_eventos: eventos.length,
    eventos,
  };
}

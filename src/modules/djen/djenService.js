import { supabaseAdmin } from '../../clients/supabase.js';
import { baixarProcessoParaCRM } from '../processos/processoService.js';
import { consultarPublicacoesDjenPorOab } from './djenClient.js';
import { normalizarOab, normalizarUf } from './djenUtils.js';

async function salvarNotificacao({ advogadoId, publicacao, processoImportadoId = null }) {
  const titulo = publicacao.numero_cnj
    ? `Nova publicação DJEN no processo ${publicacao.numero_cnj}`
    : 'Nova publicação DJEN encontrada';

  const mensagem = publicacao.texto
    ? publicacao.texto.slice(0, 500)
    : 'Nova publicação encontrada no DJEN para a OAB monitorada.';

  const { data, error } = await supabaseAdmin
    .from('notificacoes_processos')
    .insert({
      advogado_id: advogadoId,
      tipo: 'djen_publicacao',
      titulo,
      mensagem,
      lida: false,
      numero_cnj: publicacao.numero_cnj,
      processo_importado_id: processoImportadoId,
      raw: publicacao,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar notificação DJEN:', error.message);
    return null;
  }

  return data;
}

async function salvarPublicacao({ advogadoId, publicacao }) {
  const payload = {
    advogado_id: advogadoId,
    numero_cnj: publicacao.numero_cnj,
    oab: publicacao.oab,
    uf: publicacao.uf,
    tribunal: publicacao.tribunal,
    orgao: publicacao.orgao,
    data_publicacao: publicacao.data_publicacao,
    data_disponibilizacao: publicacao.data_disponibilizacao,
    tipo: publicacao.tipo,
    texto: publicacao.texto,
    link: publicacao.link,
    hash_publicacao: publicacao.hash_publicacao,
    processado: false,
    raw_djen: publicacao.raw,
  };

  const { data, error } = await supabaseAdmin
    .from('djen_publicacoes')
    .upsert(payload, { onConflict: 'hash_publicacao' })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar publicação DJEN: ${error.message}`);
  }

  return data;
}

async function marcarPublicacaoProcessada({ publicacaoId, processoImportadoId = null, status = 'processada' }) {
  const { error } = await supabaseAdmin
    .from('djen_publicacoes')
    .update({
      processado: true,
      status_processamento: status,
      processo_importado_id: processoImportadoId,
      processado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', publicacaoId);

  if (error) {
    console.error('Erro ao marcar publicação DJEN como processada:', error.message);
  }
}

export async function cadastrarMonitoramentoOab({ advogadoId, usuarioId = null, oab, uf, ativo = true }) {
  if (!advogadoId || !oab || !uf) {
    const error = new Error('advogado_id, oab e uf são obrigatórios.');
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    advogado_id: advogadoId,
    usuario_id: usuarioId,
    oab: normalizarOab(oab),
    uf: normalizarUf(uf),
    ativo,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('advogados_monitoramento')
    .upsert(payload, { onConflict: 'advogado_id,oab,uf' })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar monitoramento de OAB: ${error.message}`);
  }

  return data;
}

export async function consultarDjenPorOab({
  advogadoId,
  oab,
  uf,
  dataInicio,
  dataFim,
  pagina = 1,
  itensPorPagina,
  salvar = true,
}) {
  const resultado = await consultarPublicacoesDjenPorOab({
    oab,
    uf,
    dataInicio,
    dataFim,
    pagina,
    itensPorPagina,
  });

  const salvas = [];

  if (salvar && advogadoId) {
    for (const publicacao of resultado.publicacoes) {
      const registro = await salvarPublicacao({ advogadoId, publicacao });
      salvas.push(registro);
    }
  }

  return {
    ...resultado,
    publicacoes_salvas: salvas.length,
    registros: salvas,
  };
}

export async function processarPublicacoesDjen({
  advogadoId,
  oab,
  uf,
  importarProcessos = false,
  usuarioId = null,
  dataInicio,
  dataFim,
  limite = 50,
}) {
  const consulta = await consultarDjenPorOab({
    advogadoId,
    oab,
    uf,
    dataInicio,
    dataFim,
    itensPorPagina: limite,
    salvar: true,
  });

  const resultados = [];

  for (const registro of consulta.registros) {
    let processoImportadoId = null;
    let status = 'sem_cnj';
    let mensagem = 'Publicação salva sem CNJ identificado.';

    try {
      if (registro.numero_cnj && importarProcessos) {
        const importacao = await baixarProcessoParaCRM({
          numeroProcesso: registro.numero_cnj,
          advogadoId,
          usuarioId,
        });
        processoImportadoId = importacao.registro?.id || null;
        status = 'processo_importado';
        mensagem = 'Publicação salva e processo importado/atualizado pelo DataJud.';
      } else if (registro.numero_cnj) {
        status = 'cnj_identificado';
        mensagem = 'Publicação salva com CNJ identificado.';
      }

      await salvarNotificacao({
        advogadoId,
        publicacao: registro,
        processoImportadoId,
      });

      await marcarPublicacaoProcessada({
        publicacaoId: registro.id,
        processoImportadoId,
        status,
      });
    } catch (error) {
      status = 'erro';
      mensagem = error.message || 'Erro ao processar publicação DJEN.';
      await marcarPublicacaoProcessada({ publicacaoId: registro.id, status });
    }

    resultados.push({
      publicacao_id: registro.id,
      numero_cnj: registro.numero_cnj,
      status,
      mensagem,
      processo_importado_id: processoImportadoId,
    });
  }

  return {
    resumo: {
      total: resultados.length,
      com_cnj: resultados.filter((item) => Boolean(item.numero_cnj)).length,
      importados: resultados.filter((item) => item.status === 'processo_importado').length,
      erros: resultados.filter((item) => item.status === 'erro').length,
    },
    resultados,
  };
}

export async function executarMonitoramentoDjen({ limitePorOab = 50 } = {}) {
  const { data: monitoramentos, error } = await supabaseAdmin
    .from('advogados_monitoramento')
    .select('*')
    .eq('ativo', true)
    .order('ultima_consulta', { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(`Erro ao buscar monitoramentos de OAB: ${error.message}`);
  }

  const resultados = [];

  for (const monitoramento of monitoramentos || []) {
    try {
      const resultado = await processarPublicacoesDjen({
        advogadoId: monitoramento.advogado_id,
        usuarioId: monitoramento.usuario_id,
        oab: monitoramento.oab,
        uf: monitoramento.uf,
        importarProcessos: false,
        limite: limitePorOab,
      });

      await supabaseAdmin
        .from('advogados_monitoramento')
        .update({
          ultima_consulta: new Date().toISOString(),
          status_ultima_consulta: 'sucesso',
          mensagem_ultima_consulta: `Consulta concluída. ${resultado.resumo.total} publicação(ões) processada(s).`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', monitoramento.id);

      resultados.push({
        monitoramento_id: monitoramento.id,
        advogado_id: monitoramento.advogado_id,
        oab: monitoramento.oab,
        uf: monitoramento.uf,
        status: 'sucesso',
        resultado: resultado.resumo,
      });
    } catch (error) {
      await supabaseAdmin
        .from('advogados_monitoramento')
        .update({
          ultima_consulta: new Date().toISOString(),
          status_ultima_consulta: 'erro',
          mensagem_ultima_consulta: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', monitoramento.id);

      resultados.push({
        monitoramento_id: monitoramento.id,
        advogado_id: monitoramento.advogado_id,
        oab: monitoramento.oab,
        uf: monitoramento.uf,
        status: 'erro',
        mensagem: error.message,
      });
    }
  }

  return {
    resumo: {
      total_monitoramentos: resultados.length,
      sucessos: resultados.filter((item) => item.status === 'sucesso').length,
      erros: resultados.filter((item) => item.status === 'erro').length,
    },
    resultados,
  };
}

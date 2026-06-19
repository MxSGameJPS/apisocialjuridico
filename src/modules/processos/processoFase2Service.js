import { supabaseAdmin } from '../../clients/supabase.js';
import { baixarProcessoParaCRM, buscarProcessoPorNumero } from './processoService.js';

function gerarResumoResultado(resultados) {
  return {
    total: resultados.length,
    importados: resultados.filter((item) => item.status === 'importado').length,
    atualizados: resultados.filter((item) => item.status === 'atualizado').length,
    duplicados: resultados.filter((item) => item.status === 'duplicado').length,
    erros: resultados.filter((item) => item.status === 'erro').length,
  };
}

function limparListaProcessos(processos = []) {
  const lista = Array.isArray(processos) ? processos : [];
  const vistos = new Set();

  return lista
    .map((numero) => String(numero || '').trim())
    .filter(Boolean)
    .filter((numero) => {
      const chave = numero.replace(/\D/g, '');
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}

async function buscarRegistroExistente({ numeroCnj, advogadoId }) {
  const { data, error } = await supabaseAdmin
    .from('processos_importados')
    .select('id, numero_cnj, advogado_id')
    .eq('numero_cnj', numeroCnj)
    .eq('advogado_id', advogadoId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao verificar duplicidade no Supabase: ${error.message}`);
  }

  return data;
}

export async function importarProcessosEmLote({
  processos,
  advogadoId,
  usuarioId = null,
  cliente = null,
  parteContraria = null,
  ignorarDuplicados = true,
}) {
  if (!advogadoId) {
    const error = new Error('advogado_id é obrigatório para importação em lote.');
    error.statusCode = 400;
    throw error;
  }

  const numeros = limparListaProcessos(processos);

  if (!numeros.length) {
    const error = new Error('Informe ao menos um número de processo para importar.');
    error.statusCode = 400;
    throw error;
  }

  const resultados = [];

  for (const numeroProcesso of numeros) {
    try {
      const preview = await buscarProcessoPorNumero(numeroProcesso);
      const existente = await buscarRegistroExistente({
        numeroCnj: preview.numero_cnj,
        advogadoId,
      });

      if (existente && ignorarDuplicados) {
        resultados.push({
          numero_processo: numeroProcesso,
          numero_cnj: preview.numero_cnj,
          status: 'duplicado',
          message: 'Processo já importado para este advogado.',
          registro_id: existente.id,
        });
        continue;
      }

      const resultado = await baixarProcessoParaCRM({
        numeroProcesso,
        advogadoId,
        usuarioId,
        cliente,
        parteContraria,
      });

      resultados.push({
        numero_processo: numeroProcesso,
        numero_cnj: resultado.processo.numero_cnj,
        status: existente ? 'atualizado' : 'importado',
        message: existente ? 'Processo atualizado no CRM.' : 'Processo importado para o CRM.',
        registro_id: resultado.registro?.id,
      });
    } catch (error) {
      resultados.push({
        numero_processo: numeroProcesso,
        status: 'erro',
        message: error.message || 'Erro ao importar processo.',
      });
    }
  }

  return {
    resumo: gerarResumoResultado(resultados),
    resultados,
  };
}

export async function atualizarProcessoManual({ numeroProcesso, advogadoId, usuarioId = null }) {
  if (!advogadoId) {
    const error = new Error('advogado_id é obrigatório para atualizar o processo.');
    error.statusCode = 400;
    throw error;
  }

  const resultado = await baixarProcessoParaCRM({
    numeroProcesso,
    advogadoId,
    usuarioId,
  });

  const { data, error } = await supabaseAdmin
    .from('processos_importados')
    .update({
      ultima_consulta: new Date().toISOString(),
      ultima_atualizacao_manual: new Date().toISOString(),
      status_sincronizacao: 'atualizado_manualmente',
      total_movimentacoes: resultado.processo?.ultimas_movimentacoes?.length || 0,
      sincronizado: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resultado.registro.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao registrar atualização manual: ${error.message}`);
  }

  return {
    processo: resultado.processo,
    registro: data,
  };
}

export async function atualizarProcessosEmLote({ processos, advogadoId, usuarioId = null }) {
  const numeros = limparListaProcessos(processos);

  if (!numeros.length) {
    const error = new Error('Informe ao menos um número de processo para atualizar.');
    error.statusCode = 400;
    throw error;
  }

  const resultados = [];

  for (const numeroProcesso of numeros) {
    try {
      const resultado = await atualizarProcessoManual({
        numeroProcesso,
        advogadoId,
        usuarioId,
      });

      resultados.push({
        numero_processo: numeroProcesso,
        numero_cnj: resultado.processo.numero_cnj,
        status: 'atualizado',
        message: 'Processo atualizado manualmente.',
        registro_id: resultado.registro?.id,
      });
    } catch (error) {
      resultados.push({
        numero_processo: numeroProcesso,
        status: 'erro',
        message: error.message || 'Erro ao atualizar processo.',
      });
    }
  }

  return {
    resumo: gerarResumoResultado(resultados),
    resultados,
  };
}

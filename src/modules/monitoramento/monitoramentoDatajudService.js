import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarProcessoPorNumero } from '../processos/processoService.js';

function gerarChaveMovimentacao(movimento) {
  return [
    movimento?.data || '',
    movimento?.codigo || '',
    movimento?.nome || '',
  ].join('|');
}

function detectarNovasMovimentacoes(movimentacoesAtuais = [], movimentacoesNovas = []) {
  const atuais = new Set(movimentacoesAtuais.map(gerarChaveMovimentacao));

  return movimentacoesNovas.filter((movimento) => {
    const chave = gerarChaveMovimentacao(movimento);
    return !atuais.has(chave);
  });
}

async function registrarLogMonitoramento(payload) {
  const { error } = await supabaseAdmin
    .from('processos_monitoramento_logs')
    .insert(payload);

  if (error) {
    console.error('Erro ao registrar log de monitoramento:', error.message);
  }
}

async function buscarProcessosMonitoraveis({ advogadoId = null, limite = 25 } = {}) {
  let query = supabaseAdmin
    .from('processos_importados')
    .select('*')
    .order('ultima_consulta', { ascending: true, nullsFirst: true })
    .limit(limite);

  if (advogadoId) {
    query = query.eq('advogado_id', advogadoId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar processos monitoráveis: ${error.message}`);
  }

  return data || [];
}

async function monitorarRegistro(registro) {
  const inicio = new Date().toISOString();

  try {
    const processoAtualizado = await buscarProcessoPorNumero(registro.numero_cnj, {
      gerarResumo: false,
      advogadoId: registro.advogado_id,
      resumoCache: registro,
    });
    const novasMovimentacoes = detectarNovasMovimentacoes(
      registro.ultimas_movimentacoes || [],
      processoAtualizado.ultimas_movimentacoes || []
    );

    const status = novasMovimentacoes.length > 0 ? 'novas_movimentacoes' : 'sem_novidades';

    const updatePayload = {
      capa: processoAtualizado.capa,
      parte_principal: processoAtualizado.parte_principal,
      demais_partes: processoAtualizado.demais_partes,
      partes: processoAtualizado.partes,
      ultimas_movimentacoes: processoAtualizado.ultimas_movimentacoes,
      resumo_ia: processoAtualizado.resumo_ia || registro.resumo_ia || null,
      resumo_ia_gerado: Boolean(processoAtualizado.resumo_ia_gerado || registro.resumo_ia_gerado),
      raw_datajud: processoAtualizado.raw,
      avisos: processoAtualizado.avisos,
      ultima_consulta: new Date().toISOString(),
      ultima_atualizacao_datajud: processoAtualizado.capa?.data_ultima_atualizacao || null,
      total_movimentacoes: processoAtualizado.ultimas_movimentacoes?.length || 0,
      sincronizado: true,
      status_sincronizacao: status,
      atualizado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('processos_importados')
      .update(updatePayload)
      .eq('id', registro.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar processo monitorado: ${error.message}`);
    }

    await registrarLogMonitoramento({
      processo_importado_id: registro.id,
      advogado_id: registro.advogado_id,
      numero_cnj: registro.numero_cnj,
      status,
      sucesso: true,
      novas_movimentacoes: novasMovimentacoes,
      total_novas_movimentacoes: novasMovimentacoes.length,
      mensagem: novasMovimentacoes.length
        ? `${novasMovimentacoes.length} nova(s) movimentação(ões) encontrada(s).`
        : 'Nenhuma nova movimentação encontrada.',
      iniciado_em: inicio,
      finalizado_em: new Date().toISOString(),
    });

    return {
      numero_cnj: registro.numero_cnj,
      registro_id: registro.id,
      status,
      sucesso: true,
      total_novas_movimentacoes: novasMovimentacoes.length,
      novas_movimentacoes: novasMovimentacoes,
      registro: data,
    };
  } catch (error) {
    await registrarLogMonitoramento({
      processo_importado_id: registro.id,
      advogado_id: registro.advogado_id,
      numero_cnj: registro.numero_cnj,
      status: 'erro',
      sucesso: false,
      novas_movimentacoes: [],
      total_novas_movimentacoes: 0,
      mensagem: error.message || 'Erro no monitoramento.',
      iniciado_em: inicio,
      finalizado_em: new Date().toISOString(),
    });

    return {
      numero_cnj: registro.numero_cnj,
      registro_id: registro.id,
      status: 'erro',
      sucesso: false,
      message: error.message || 'Erro no monitoramento.',
    };
  }
}

export async function executarMonitoramentoDatajud({ advogadoId = null, limite = 25 } = {}) {
  const processos = await buscarProcessosMonitoraveis({ advogadoId, limite });
  const resultados = [];

  for (const registro of processos) {
    const resultado = await monitorarRegistro(registro);
    resultados.push(resultado);
  }

  return {
    resumo: {
      total: resultados.length,
      com_novidades: resultados.filter((item) => item.status === 'novas_movimentacoes').length,
      sem_novidades: resultados.filter((item) => item.status === 'sem_novidades').length,
      erros: resultados.filter((item) => item.status === 'erro').length,
    },
    resultados,
  };
}

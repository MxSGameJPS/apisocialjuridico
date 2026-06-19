import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarProcessoNoDataJud } from '../datajud/datajudClient.js';
import {
  detectarTribunalPorCNJ,
  formatarNumeroCNJ,
  validarNumeroCNJ,
} from '../tribunais/tribunalDetector.js';
import { normalizarProcessoDataJud } from './processoNormalizer.js';
import { gerarResumoProcesso } from './processoResumoService.js';

export async function buscarProcessoPorNumero(numeroProcesso) {
  if (!validarNumeroCNJ(numeroProcesso)) {
    const error = new Error('Número do processo inválido. Informe o número CNJ completo com 20 dígitos.');
    error.statusCode = 400;
    throw error;
  }

  const numeroCNJ = formatarNumeroCNJ(numeroProcesso);
  const tribunalDetectado = detectarTribunalPorCNJ(numeroCNJ);

  if (!tribunalDetectado) {
    const error = new Error('Tribunal ainda não suportado ou não identificado pelo número CNJ.');
    error.statusCode = 400;
    throw error;
  }

  const processoBruto = await buscarProcessoNoDataJud({
    numeroCNJ,
    tribunal: tribunalDetectado,
  });

  if (!processoBruto) {
    const error = new Error('Processo não encontrado no DataJud para o tribunal identificado.');
    error.statusCode = 404;
    throw error;
  }

  const processo = normalizarProcessoDataJud({
    processoBruto,
    tribunalDetectado,
  });

  const resumo = await gerarResumoProcesso(processo);

  return {
    ...processo,
    resumo_ia: resumo.resumo,
    resumo_ia_gerado: resumo.gerado_por_ia,
  };
}

export async function baixarProcessoParaCRM({ numeroProcesso, advogadoId, usuarioId = null }) {
  if (!advogadoId) {
    const error = new Error('advogado_id é obrigatório para baixar o processo para o CRM.');
    error.statusCode = 400;
    throw error;
  }

  const processo = await buscarProcessoPorNumero(numeroProcesso);

  const payload = {
    numero_cnj: processo.numero_cnj,
    advogado_id: advogadoId,
    usuario_id: usuarioId,
    tribunal_codigo: processo.tribunal?.codigo,
    tribunal_nome: processo.tribunal?.nome,
    capa: processo.capa,
    parte_principal: processo.parte_principal,
    demais_partes: processo.demais_partes,
    partes: processo.partes,
    ultimas_movimentacoes: processo.ultimas_movimentacoes,
    resumo_ia: processo.resumo_ia,
    resumo_ia_gerado: processo.resumo_ia_gerado,
    raw_datajud: processo.raw,
    avisos: processo.avisos,
    baixado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('processos_importados')
    .upsert(payload, {
      onConflict: 'numero_cnj,advogado_id',
    })
    .select()
    .single();

  if (error) {
    const supabaseError = new Error(`Erro ao salvar processo no Supabase: ${error.message}`);
    supabaseError.statusCode = 500;
    throw supabaseError;
  }

  return {
    processo,
    registro: data,
  };
}

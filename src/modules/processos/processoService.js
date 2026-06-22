import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarProcessoNoDataJud } from '../datajud/datajudClient.js';
import {
  detectarTribunalPorCNJ,
  formatarNumeroCNJ,
  limparNumeroCNJ,
  validarNumeroCNJ,
} from '../tribunais/tribunalDetector.js';
import { normalizarProcessoDataJud } from './processoNormalizer.js';
import { gerarResumoProcesso } from './processoResumoService.js';

function normalizarPessoaCRM(pessoa) {
  if (!pessoa) return null;

  const temAlgumDado = Object.values(pessoa).some((valor) => {
    return valor !== null && valor !== undefined && String(valor).trim() !== '';
  });

  if (!temAlgumDado) return null;

  return {
    nome: pessoa.nome || null,
    tipo: pessoa.tipo || 'nao_informado',
    documento: pessoa.documento || null,
    email: pessoa.email || null,
    telefone: pessoa.telefone || null,
    observacoes: pessoa.observacoes || null,
  };
}

function chaveMovimentacoes(movimentacoes = []) {
  return JSON.stringify(
    (movimentacoes || []).map((movimento) => ({
      data: movimento?.data || null,
      codigo: movimento?.codigo || null,
      nome: movimento?.nome || null,
    }))
  );
}

function cacheResumoValido({ resumoCache, processo }) {
  if (!resumoCache?.resumo_ia || !resumoCache?.resumo_ia_gerado) return false;
  return chaveMovimentacoes(resumoCache.ultimas_movimentacoes) === chaveMovimentacoes(processo.ultimas_movimentacoes);
}

async function buscarResumoImportado({ numeroProcesso, advogadoId = null }) {
  const numeroCnj = limparNumeroCNJ(numeroProcesso);

  let query = supabaseAdmin
    .from('processos_importados')
    .select('id, numero_cnj, advogado_id, resumo_ia, resumo_ia_gerado, ultimas_movimentacoes')
    .eq('numero_cnj', numeroCnj)
    .not('resumo_ia', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (advogadoId) query = query.eq('advogado_id', advogadoId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Erro ao buscar cache de resumo:', error.message);
    return null;
  }

  return data || null;
}

async function resolverResumo({ processo, gerarResumo = false, forcarResumo = false, resumoCache = null }) {
  if (!forcarResumo && resumoCache?.resumo_ia && resumoCache?.resumo_ia_gerado) {
    const cacheValido = cacheResumoValido({ resumoCache, processo });

    if (cacheValido || !gerarResumo) {
      return {
        resumo: resumoCache.resumo_ia,
        gerado_por_ia: Boolean(resumoCache.resumo_ia_gerado),
        provider: 'cache',
        status: cacheValido ? 'cache_valido' : 'cache_preservado',
      };
    }
  }

  return gerarResumoProcesso(processo, { gerarResumo });
}

export async function buscarProcessoPorNumero(numeroProcesso, {
  gerarResumo = false,
  forcarResumo = false,
  advogadoId = null,
  resumoCache = null,
} = {}) {
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

  const cache = resumoCache || await buscarResumoImportado({
    numeroProcesso: processo.numero_cnj || numeroProcesso,
    advogadoId,
  });

  const resumo = await resolverResumo({
    processo,
    gerarResumo,
    forcarResumo,
    resumoCache: cache,
  });

  return {
    ...processo,
    resumo_ia: resumo.resumo,
    resumo_ia_gerado: resumo.gerado_por_ia,
    resumo_ia_provider: resumo.provider,
    resumo_ia_status: resumo.status || (resumo.gerado_por_ia ? 'gerado' : 'nao_gerado'),
  };
}

export async function baixarProcessoParaCRM({
  numeroProcesso,
  advogadoId,
  usuarioId = null,
  cliente = null,
  parteContraria = null,
  gerarResumo = false,
  forcarResumo = false,
}) {
  if (!advogadoId) {
    const error = new Error('advogado_id é obrigatório para baixar o processo para o CRM.');
    error.statusCode = 400;
    throw error;
  }

  const resumoCache = await buscarResumoImportado({ numeroProcesso, advogadoId });
  const processo = await buscarProcessoPorNumero(numeroProcesso, {
    gerarResumo,
    forcarResumo,
    advogadoId,
    resumoCache,
  });
  const clienteManual = normalizarPessoaCRM(cliente);
  const parteContrariaManual = normalizarPessoaCRM(parteContraria);

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
    cliente_manual: clienteManual,
    parte_contraria_manual: parteContrariaManual,
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
    processo: {
      ...processo,
      cliente_manual: clienteManual,
      parte_contraria_manual: parteContrariaManual,
    },
    registro: data,
  };
}

export async function gerarResumoParaProcessoCRM({
  numeroProcesso,
  advogadoId,
  usuarioId = null,
  forcarResumo = true,
}) {
  return baixarProcessoParaCRM({
    numeroProcesso,
    advogadoId,
    usuarioId,
    gerarResumo: true,
    forcarResumo,
  });
}

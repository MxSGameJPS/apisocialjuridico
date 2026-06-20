import { buscarProcessoPorNumero } from '../processos/processoService.js';
import { supabaseAdmin } from '../../clients/supabase.js';
import { hashCpfCnpj, mascararDocumento, resolverCpfCnpj } from './cpfResolverService.js';
import { somenteDigitos } from './fase6Utils.js';
import { salvarIndicePublicoProcessual } from './indicePublicoService.js';

function processoDatajudParaPublicacao(processo) {
  return {
    numero_cnj: processo.numero_cnj,
    numero_cnj_formatado: processo.numero_cnj_formatado || processo.numero_cnj,
    tribunal: processo.tribunal?.codigo || processo.tribunal?.nome || null,
    orgao: processo.capa?.orgao_julgador || null,
    classe: processo.capa?.classe || null,
    tipo: 'DataJud',
    tipo_documento: 'Processo público vinculado',
    texto: processo.resumo_ia || null,
    data_disponibilizacao: processo.capa?.data_ultima_atualizacao || null,
    data_publicacao: processo.capa?.data_ultima_atualizacao || null,
    partes: (processo.partes || []).map((parte) => ({ nome: parte.nome, polo: parte.polo, tipo: parte.tipo, documento: parte.documento })),
    advogados: [],
    raw: processo.raw || processo,
  };
}

export async function vincularCpfCnpjAProcesso({ documento, numeroCnj, nomeVinculado = null, origem = 'manual', confianca = 0.9, observacao = null, enriquecerDatajud = true }) {
  const digitos = somenteDigitos(documento);
  const cnj = somenteDigitos(numeroCnj);

  if (![11, 14].includes(digitos.length)) {
    const error = new Error('CPF/CNPJ inválido para vínculo processual.');
    error.statusCode = 400;
    throw error;
  }

  if (cnj.length !== 20) {
    const error = new Error('CNJ inválido para vínculo processual.');
    error.statusCode = 400;
    throw error;
  }

  let indice = null;
  let erroDatajud = null;

  if (enriquecerDatajud) {
    try {
      const processo = await buscarProcessoPorNumero(cnj);
      const publicacao = processoDatajudParaPublicacao(processo);
      indice = await salvarIndicePublicoProcessual({ publicacao, processoDatajud: processo });
    } catch (error) {
      erroDatajud = error.message;
    }
  }

  const resolucao = await resolverCpfCnpj(digitos);

  const payload = {
    documento_hash: hashCpfCnpj(digitos),
    documento_mascarado: mascararDocumento(digitos),
    numero_cnj: cnj,
    nome_vinculado: nomeVinculado || resolucao?.nome_principal || null,
    origem,
    confianca,
    observacao,
    ativo: true,
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('cpf_cnpj_processos_vinculados')
    .upsert(payload, { onConflict: 'documento_hash,numero_cnj' })
    .select()
    .single();

  if (error) throw new Error(`Erro ao vincular CPF/CNPJ ao processo: ${error.message}`);

  return { vinculo: data, indice, erro_datajud: erroDatajud };
}

export async function listarProcessosVinculadosCpfCnpj(documento) {
  const digitos = somenteDigitos(documento);
  if (![11, 14].includes(digitos.length)) return [];

  const { data, error } = await supabaseAdmin
    .from('cpf_cnpj_processos_vinculados')
    .select('*')
    .eq('documento_hash', hashCpfCnpj(digitos))
    .eq('ativo', true)
    .order('atualizado_em', { ascending: false });

  if (error) throw new Error(`Erro ao listar vínculos CPF/CNPJ-processos: ${error.message}`);
  return data || [];
}

export async function buscarIndiceDosProcessosVinculados(documento) {
  const vinculos = await listarProcessosVinculadosCpfCnpj(documento);
  const cnjs = [...new Set(vinculos.map((v) => v.numero_cnj).filter(Boolean))];

  if (!cnjs.length) return { vinculos, processos: [] };

  const { data, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .in('numero_cnj', cnjs);

  if (error) throw new Error(`Erro ao buscar processos vinculados no índice: ${error.message}`);

  const existentes = new Set((data || []).map((p) => p.numero_cnj));
  const faltantes = cnjs.filter((cnj) => !existentes.has(cnj));

  for (const cnj of faltantes) {
    try {
      const processo = await buscarProcessoPorNumero(cnj);
      const publicacao = processoDatajudParaPublicacao(processo);
      const indice = await salvarIndicePublicoProcessual({ publicacao, processoDatajud: processo });
      if (indice) data.push(indice);
    } catch (error) {
      console.error('Erro ao enriquecer processo vinculado:', error.message);
    }
  }

  return { vinculos, processos: data || [] };
}

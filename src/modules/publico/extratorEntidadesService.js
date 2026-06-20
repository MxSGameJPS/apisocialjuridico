import { supabaseAdmin } from '../../clients/supabase.js';
import { extrairCpfCnpj, normalizarTexto, somenteDigitos } from './fase6Utils.js';

function limparHtml(html = '') {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x2011;|&#8209;|&ndash;|&mdash;/gi, '-')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extrairTelefones(texto = '') {
  const matches = texto.match(/(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}/g) || [];
  return [...new Set(matches.map((item) => item.trim()))];
}

function extrairRg(texto = '') {
  const matches = texto.match(/RG\s*[:º°]?\s*([0-9\.\-Xx]{5,20})/gi) || [];
  return [...new Set(matches.map((m) => m.replace(/RG\s*[:º°]?\s*/i, '').trim()))];
}

function extrairNascimento(texto = '') {
  const matches = texto.match(/(?:Nascido\/Nascida|Nascimento|nascido|nascida)[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/gi) || [];
  return [...new Set(matches.map((m) => (m.match(/\d{2}\/\d{2}\/\d{4}/) || [null])[0]).filter(Boolean))];
}

function inferirTipoEntidade(nome = '', documentos = []) {
  if (documentos.some((doc) => doc.length === 14)) return 'empresa';
  if (documentos.some((doc) => doc.length === 11)) return 'pessoa_fisica';
  const normalizado = normalizarTexto(nome);
  if (/ltda|s a|sa|eireli|mei|companhia|empresa|banco|seguradora/.test(normalizado)) return 'empresa';
  return 'pessoa_fisica';
}

async function upsertEntidade({ nome, documentos = [], origem, numeroCnj, dados = {} }) {
  if (!nome && !documentos.length) return null;

  const documentoPrincipal = documentos[0] || null;
  const nomeNormalizado = normalizarTexto(nome || documentoPrincipal);
  const tipo = inferirTipoEntidade(nome, documentos);

  const payload = {
    nome: nome || null,
    nome_normalizado: nomeNormalizado,
    tipo,
    documento_principal: documentoPrincipal,
    documentos,
    origem,
    dados,
    atualizado_em: new Date().toISOString(),
  };

  const conflict = documentoPrincipal ? 'documento_principal' : 'nome_normalizado';

  const { data, error } = await supabaseAdmin
    .from('entidades_publicas')
    .upsert(payload, { onConflict: conflict })
    .select()
    .single();

  if (error) throw new Error(`Erro ao salvar entidade pública: ${error.message}`);

  if (numeroCnj && data?.id) {
    await supabaseAdmin
      .from('entidades_processos')
      .upsert({
        entidade_id: data.id,
        numero_cnj: numeroCnj,
        papel: dados.polo || dados.papel || null,
        origem,
      }, { onConflict: 'entidade_id,numero_cnj,papel' });
  }

  return data;
}

export async function extrairEntidadesDeProcesso({ numeroCnj }) {
  const cnj = somenteDigitos(numeroCnj);
  const { data: processo, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .eq('numero_cnj', cnj)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar processo para extração: ${error.message}`);
  if (!processo) return { numero_cnj: cnj, entidades: [], documentos_extraidos: [] };

  const textoLimpo = limparHtml(processo.texto_indexavel || processo.ultima_publicacao_texto || '');
  const documentosExtraidos = extrairCpfCnpj(textoLimpo);
  const telefones = extrairTelefones(textoLimpo);
  const rgs = extrairRg(textoLimpo);
  const nascimentos = extrairNascimento(textoLimpo);

  const entidades = [];

  for (const parte of processo.partes || []) {
    const docsParte = documentosExtraidos.filter((doc) => textoLimpo.includes(doc) || true);
    const entidade = await upsertEntidade({
      nome: parte.nome,
      documentos: docsParte.length === 1 ? docsParte : [],
      origem: 'indice_publico_processos.partes',
      numeroCnj: cnj,
      dados: { polo: parte.polo, telefones, rgs, nascimentos },
    });
    if (entidade) entidades.push(entidade);
  }

  for (const advogado of processo.advogados || []) {
    const entidade = await upsertEntidade({
      nome: advogado.nome,
      documentos: [],
      origem: 'indice_publico_processos.advogados',
      numeroCnj: cnj,
      dados: { papel: 'advogado', oab: advogado.numero_oab, uf_oab: advogado.uf_oab },
    });
    if (entidade) entidades.push(entidade);
  }

  if (documentosExtraidos.length && !entidades.some((e) => e.documento_principal)) {
    const entidade = await upsertEntidade({
      nome: processo.parte_passiva || processo.parte_ativa,
      documentos: documentosExtraidos,
      origem: 'texto_publicacao',
      numeroCnj: cnj,
      dados: { telefones, rgs, nascimentos },
    });
    if (entidade) entidades.push(entidade);
  }

  return {
    numero_cnj: cnj,
    documentos_extraidos: documentosExtraidos,
    telefones,
    rgs,
    nascimentos,
    total_entidades: entidades.length,
    entidades,
  };
}

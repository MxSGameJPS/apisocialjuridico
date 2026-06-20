import { supabaseAdmin } from '../../clients/supabase.js';
import { extrairCpfCnpj, normalizarTexto, somenteDigitos } from './fase6Utils.js';

const NOMES_PUBLICOS = [
  'justica publica',
  'ministerio publico',
  'fazenda publica',
  'uniao federal',
  'estado de sao paulo',
  'estado do rio de janeiro',
  'municipio',
];

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

function removerDocumentosDoTexto(texto = '') {
  return String(texto)
    .replace(/\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g, ' ')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, ' ')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, ' ')
    .replace(/RG\s*[:º°]?\s*[0-9\.\-Xx]{5,20}/gi, ' ');
}

function extrairTelefones(texto = '') {
  const textoSemDocs = removerDocumentosDoTexto(texto);
  const matches = textoSemDocs.match(/(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}/g) || [];

  return [...new Set(matches
    .map((item) => item.replace(/\D/g, ''))
    .filter((digits) => digits.length === 10 || digits.length === 11)
    .filter((digits) => !/^0+$/.test(digits))
    .filter((digits) => !digits.startsWith('1503393512'))
  )];
}

function extrairRg(texto = '') {
  const matches = texto.match(/RG\s*[:º°]?\s*([0-9\.\-Xx]{5,20})/gi) || [];
  return [...new Set(matches.map((m) => m.replace(/RG\s*[:º°]?\s*/i, '').replace(/\D/g, '').trim()).filter(Boolean))];
}

function extrairNascimento(texto = '') {
  const matches = texto.match(/(?:Nascido\/Nascida|Nascimento|nascido|nascida)[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/gi) || [];
  return [...new Set(matches.map((m) => (m.match(/\d{2}\/\d{2}\/\d{4}/) || [null])[0]).filter(Boolean))];
}

function ehEntidadePublica(nome = '') {
  const normalizado = normalizarTexto(nome);
  return NOMES_PUBLICOS.some((item) => normalizado.includes(item));
}

function inferirTipoEntidade(nome = '', documentos = []) {
  if (ehEntidadePublica(nome)) return 'orgao_publico';
  if (documentos.some((doc) => doc.length === 14)) return 'empresa';
  if (documentos.some((doc) => doc.length === 11)) return 'pessoa_fisica';
  const normalizado = normalizarTexto(nome);
  if (/ltda|s a|sa|eireli|mei|companhia|empresa|banco|seguradora/.test(normalizado)) return 'empresa';
  return 'pessoa_fisica';
}

function escolherParteParaDocumento(partes = []) {
  const privadas = partes.filter((parte) => !ehEntidadePublica(parte.nome));
  const passivaPrivada = privadas.find((parte) => String(parte.polo || '').toUpperCase() === 'P');
  if (passivaPrivada) return passivaPrivada;
  return privadas[0] || null;
}

async function upsertEntidade({ nome, documentos = [], origem, numeroCnj, dados = {} }) {
  if (!nome && !documentos.length) return null;

  const documentosLimpos = [...new Set((documentos || []).map(somenteDigitos).filter(Boolean))];
  const documentoPrincipal = documentosLimpos[0] || null;
  const nomeNormalizado = normalizarTexto(nome || documentoPrincipal);
  const tipo = inferirTipoEntidade(nome, documentosLimpos);

  const payload = {
    nome: nome || null,
    nome_normalizado: nomeNormalizado,
    tipo,
    documento_principal: documentoPrincipal,
    documentos: documentosLimpos,
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

function deduplicarEntidades(entidades = []) {
  const mapa = new Map();
  for (const entidade of entidades) {
    if (!entidade?.id) continue;
    mapa.set(entidade.id, entidade);
  }
  return [...mapa.values()];
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
  const partes = processo.partes || [];
  const parteComDocumento = documentosExtraidos.length === 1 ? escolherParteParaDocumento(partes) : null;

  const entidades = [];

  for (const parte of partes) {
    const deveReceberDocumento = parteComDocumento && normalizarTexto(parte.nome) === normalizarTexto(parteComDocumento.nome);
    const entidade = await upsertEntidade({
      nome: parte.nome,
      documentos: deveReceberDocumento ? documentosExtraidos : [],
      origem: 'indice_publico_processos.partes',
      numeroCnj: cnj,
      dados: {
        polo: parte.polo,
        telefones: deveReceberDocumento ? telefones : [],
        rgs: deveReceberDocumento ? rgs : [],
        nascimentos: deveReceberDocumento ? nascimentos : [],
      },
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

  const entidadesUnicas = deduplicarEntidades(entidades);

  return {
    numero_cnj: cnj,
    documentos_extraidos: documentosExtraidos,
    telefones,
    rgs,
    nascimentos,
    total_entidades: entidadesUnicas.length,
    entidades: entidadesUnicas,
  };
}

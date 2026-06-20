import crypto from 'node:crypto';
import { supabaseAdmin } from '../../clients/supabase.js';
import { normalizarTexto, somenteDigitos } from './fase6Utils.js';

export function hashCpfCnpj(documento) {
  const digitos = somenteDigitos(documento);
  return crypto.createHash('sha256').update(digitos).digest('hex');
}

export function mascararDocumento(documento) {
  const d = somenteDigitos(documento);
  if (d.length === 11) return `${d.slice(0, 3)}.***.***-${d.slice(-2)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.***.***/****-${d.slice(-2)}`;
  return 'documento-mascarado';
}

export async function cadastrarResolucaoCpfCnpj({ documento, nomePrincipal, nomesRelacionados = [], origem = 'manual', confianca = 0.9 }) {
  const digitos = somenteDigitos(documento);
  if (![11, 14].includes(digitos.length)) {
    const error = new Error('CPF/CNPJ inválido para resolução de identidade.');
    error.statusCode = 400;
    throw error;
  }

  const nomes = [nomePrincipal, ...(nomesRelacionados || [])]
    .filter(Boolean)
    .map((nome) => String(nome).trim())
    .filter(Boolean);

  const payload = {
    documento_hash: hashCpfCnpj(digitos),
    documento_mascarado: mascararDocumento(digitos),
    nome_principal: nomePrincipal,
    nome_normalizado: normalizarTexto(nomePrincipal),
    nomes_relacionados: nomes,
    nomes_normalizados: nomes.map(normalizarTexto),
    origem,
    confianca,
    ativo: true,
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('cpf_cnpj_resolvidos')
    .upsert(payload, { onConflict: 'documento_hash' })
    .select()
    .single();

  if (error) throw new Error(`Erro ao cadastrar resolução CPF/CNPJ: ${error.message}`);
  return data;
}

export async function resolverCpfCnpj(documento) {
  const digitos = somenteDigitos(documento);
  if (![11, 14].includes(digitos.length)) return null;

  const { data, error } = await supabaseAdmin
    .from('cpf_cnpj_resolvidos')
    .select('*')
    .eq('documento_hash', hashCpfCnpj(digitos))
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw new Error(`Erro ao resolver CPF/CNPJ: ${error.message}`);
  return data;
}

export async function listarResolucoesCpfCnpj({ termo = null, limite = 50 } = {}) {
  let query = supabaseAdmin
    .from('cpf_cnpj_resolvidos')
    .select('id, documento_mascarado, nome_principal, nomes_relacionados, origem, confianca, ativo, criado_em, atualizado_em')
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (termo) query = query.ilike('nome_normalizado', `%${normalizarTexto(termo)}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar resoluções CPF/CNPJ: ${error.message}`);
  return data || [];
}

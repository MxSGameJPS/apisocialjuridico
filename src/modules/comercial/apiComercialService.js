import crypto from 'node:crypto';
import { supabaseAdmin } from '../../clients/supabase.js';

const PLANOS = {
  free: { limite_minuto: 10, limite_dia: 100, limite_mes: 1000 },
  start: { limite_minuto: 60, limite_dia: 2000, limite_mes: 30000 },
  pro: { limite_minuto: 180, limite_dia: 10000, limite_mes: 150000 },
  enterprise: { limite_minuto: 600, limite_dia: 100000, limite_mes: 2000000 },
};

function gerarApiKey() {
  return `sj_live_${crypto.randomBytes(32).toString('hex')}`;
}

function hashKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function mascararKey(apiKey) {
  return `${apiKey.slice(0, 12)}...${apiKey.slice(-6)}`;
}

function inicioJanela(tipo) {
  const data = new Date();
  if (tipo === 'minuto') data.setSeconds(0, 0);
  if (tipo === 'dia') data.setHours(0, 0, 0, 0);
  if (tipo === 'mes') data.setDate(1), data.setHours(0, 0, 0, 0);
  return data.toISOString();
}

export function limitesDoPlano(plano = 'free') {
  return PLANOS[plano] || PLANOS.free;
}

export async function criarClienteComercial({ nome, email, documento = null, plano = 'free', ativo = true }) {
  const { data, error } = await supabaseAdmin
    .from('api_clientes')
    .insert({ nome, email, documento, plano, ativo })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar cliente comercial: ${error.message}`);
  return data;
}

export async function criarApiKeyComercial({ clienteId, nome = 'Chave principal', plano = null }) {
  const apiKey = gerarApiKey();
  const keyHash = hashKey(apiKey);

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from('api_clientes')
    .select('*')
    .eq('id', clienteId)
    .maybeSingle();

  if (clienteError) throw new Error(`Erro ao buscar cliente: ${clienteError.message}`);
  if (!cliente) {
    const error = new Error('Cliente comercial não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const planoFinal = plano || cliente.plano || 'free';
  const limites = limitesDoPlano(planoFinal);

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      cliente_id: clienteId,
      nome,
      key_hash: keyHash,
      key_prefix: apiKey.slice(0, 12),
      key_masked: mascararKey(apiKey),
      plano: planoFinal,
      ativo: true,
      limite_minuto: limites.limite_minuto,
      limite_dia: limites.limite_dia,
      limite_mes: limites.limite_mes,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar API key: ${error.message}`);

  return {
    ...data,
    api_key: apiKey,
    aviso: 'Guarde esta chave agora. Ela não será exibida novamente.',
  };
}

export async function validarApiKeyComercial(apiKey) {
  if (!apiKey) return { valido: false, motivo: 'API key ausente.' };

  const keyHash = hashKey(apiKey);
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('*, api_clientes(*)')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error) throw new Error(`Erro ao validar API key: ${error.message}`);
  if (!data) return { valido: false, motivo: 'API key inválida.' };
  if (!data.ativo) return { valido: false, motivo: 'API key bloqueada.' };
  if (data.api_clientes && data.api_clientes.ativo === false) return { valido: false, motivo: 'Cliente comercial bloqueado.' };

  return { valido: true, apiKey: data, cliente: data.api_clientes };
}

async function contarUso({ apiKeyId, inicio }) {
  const { count, error } = await supabaseAdmin
    .from('api_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', inicio);

  if (error) throw new Error(`Erro ao contar uso da API: ${error.message}`);
  return count || 0;
}

export async function verificarLimitesComerciais(apiKey) {
  const [usoMinuto, usoDia, usoMes] = await Promise.all([
    contarUso({ apiKeyId: apiKey.id, inicio: inicioJanela('minuto') }),
    contarUso({ apiKeyId: apiKey.id, inicio: inicioJanela('dia') }),
    contarUso({ apiKeyId: apiKey.id, inicio: inicioJanela('mes') }),
  ]);

  const limites = {
    minuto: apiKey.limite_minuto,
    dia: apiKey.limite_dia,
    mes: apiKey.limite_mes,
  };

  if (usoMinuto >= limites.minuto) return { permitido: false, janela: 'minuto', uso: usoMinuto, limite: limites.minuto };
  if (usoDia >= limites.dia) return { permitido: false, janela: 'dia', uso: usoDia, limite: limites.dia };
  if (usoMes >= limites.mes) return { permitido: false, janela: 'mes', uso: usoMes, limite: limites.mes };

  return { permitido: true, uso: { minuto: usoMinuto, dia: usoDia, mes: usoMes }, limites };
}

export async function registrarUsoComercial({ apiKey, cliente, request, statusCode = 200, sucesso = true, erro = null }) {
  const { error } = await supabaseAdmin.from('api_usage_logs').insert({
    api_key_id: apiKey?.id || null,
    cliente_id: cliente?.id || null,
    metodo: request.method,
    rota: request.url,
    ip: request.ip,
    user_agent: request.headers['user-agent'] || null,
    status_code: statusCode,
    sucesso,
    erro,
  });

  if (error) console.error('Erro ao registrar uso comercial:', error.message);
}

export async function listarUsoComercial({ clienteId = null, apiKeyId = null, limite = 100 }) {
  let query = supabaseAdmin
    .from('api_usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite);

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (apiKeyId) query = query.eq('api_key_id', apiKeyId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar uso comercial: ${error.message}`);
  return data || [];
}

export async function alterarStatusApiKey({ apiKeyId, ativo }) {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq('id', apiKeyId)
    .select()
    .single();

  if (error) throw new Error(`Erro ao alterar status da API key: ${error.message}`);
  return data;
}

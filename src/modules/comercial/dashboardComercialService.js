import { supabaseAdmin } from '../../clients/supabase.js';
import { limitesDoPlano } from './apiComercialService.js';

const USAGE_TABLE = 'api_usage_logs';
const CLIENTES_TABLE = 'api_clientes';
const KEYS_TABLE = 'api_keys';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function resolvePeriodo({ periodo = 'mes_atual', dataInicio = null, dataFim = null } = {}) {
  const agora = new Date();
  let inicio;
  let fim = dataFim ? new Date(dataFim) : agora;

  if (dataInicio) inicio = new Date(dataInicio);
  else if (periodo === 'hoje') inicio = startOfDay(agora);
  else if (periodo === '7d') {
    inicio = startOfDay(agora);
    inicio.setDate(inicio.getDate() - 6);
  } else if (periodo === '30d') {
    inicio = startOfDay(agora);
    inicio.setDate(inicio.getDate() - 29);
  } else {
    inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  }

  if (Number.isNaN(inicio.getTime())) inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  if (Number.isNaN(fim.getTime())) fim = agora;

  return { inicio: inicio.toISOString(), fim: fim.toISOString(), periodo };
}

async function buscarCliente(clienteId) {
  if (!clienteId) return null;
  const { data, error } = await supabaseAdmin
    .from(CLIENTES_TABLE)
    .select('*')
    .eq('id', clienteId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar cliente comercial: ${error.message}`);
  return data || null;
}

async function listarApiKeys({ clienteId = null, apiKeyId = null } = {}) {
  let query = supabaseAdmin
    .from(KEYS_TABLE)
    .select('id, cliente_id, nome, key_prefix, key_masked, plano, ativo, limite_minuto, limite_dia, limite_mes, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (apiKeyId) query = query.eq('id', apiKeyId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar API keys comerciais: ${error.message}`);
  return data || [];
}

async function listarUsageLogs({ clienteId = null, apiKeyId = null, inicio, fim, limite = 5000 } = {}) {
  let query = supabaseAdmin
    .from(USAGE_TABLE)
    .select('*')
    .gte('created_at', inicio)
    .lte('created_at', fim)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limite || 5000), 10000));

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (apiKeyId) query = query.eq('api_key_id', apiKeyId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar usage logs comerciais: ${error.message}`);
  return data || [];
}

function agruparPorRota(logs = []) {
  const map = new Map();
  for (const log of logs) {
    const rota = log.rota || 'desconhecida';
    const atual = map.get(rota) || { rota, total: 0, sucesso: 0, erro: 0, status_codes: {} };
    atual.total += 1;
    if (log.sucesso === false || Number(log.status_code || 0) >= 400) atual.erro += 1;
    else atual.sucesso += 1;
    const status = String(log.status_code || 'sem_status');
    atual.status_codes[status] = (atual.status_codes[status] || 0) + 1;
    map.set(rota, atual);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function agruparPorDia(logs = []) {
  const map = new Map();
  for (const log of logs) {
    const dia = String(log.created_at || '').slice(0, 10) || 'sem_data';
    const atual = map.get(dia) || { dia, total: 0, sucesso: 0, erro: 0 };
    atual.total += 1;
    if (log.sucesso === false || Number(log.status_code || 0) >= 400) atual.erro += 1;
    else atual.sucesso += 1;
    map.set(dia, atual);
  }
  return Array.from(map.values()).sort((a, b) => a.dia.localeCompare(b.dia));
}

function resumoStatus(logs = []) {
  const total = logs.length;
  const erros = logs.filter((log) => log.sucesso === false || Number(log.status_code || 0) >= 400).length;
  const sucesso = total - erros;
  return {
    total_requisicoes: total,
    sucesso,
    erros,
    taxa_sucesso: total ? Number(((sucesso / total) * 100).toFixed(2)) : 0,
    taxa_erro: total ? Number(((erros / total) * 100).toFixed(2)) : 0,
  };
}

function resumoLimites(apiKeys = [], logs = []) {
  const ativa = apiKeys.filter((key) => key.ativo !== false);
  const principal = ativa[0] || apiKeys[0] || null;
  const plano = principal?.plano || 'free';
  const limites = principal
    ? { minuto: principal.limite_minuto, dia: principal.limite_dia, mes: principal.limite_mes }
    : limitesDoPlano(plano);

  const usoMes = logs.length;
  const limiteMes = Number(limites.mes || limites.limite_mes || 0);

  return {
    plano,
    api_keys_total: apiKeys.length,
    api_keys_ativas: ativa.length,
    limites,
    uso_periodo: usoMes,
    percentual_limite_mes: limiteMes ? Number(((usoMes / limiteMes) * 100).toFixed(2)) : 0,
    status_limite: limiteMes && usoMes >= limiteMes ? 'excedido' : 'ok',
  };
}

async function contarTabela(nomeTabela, filtros = {}) {
  let query = supabaseAdmin.from(nomeTabela).select('id', { count: 'exact', head: true });
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== null && value !== undefined) query = query.eq(key, value);
  });
  const { count, error } = await query;
  if (error) return null;
  return count || 0;
}

async function indicadoresOperacionais({ clienteId = null, ownerRef = null } = {}) {
  const filtroCliente = clienteId ? { cliente_id: clienteId } : {};
  const filtroOwner = !clienteId && ownerRef ? { owner_ref: ownerRef } : {};
  const filtros = { ...filtroCliente, ...filtroOwner };

  const [monitoramentos, eventos, webhooks, vinculos, feedbacks] = await Promise.all([
    contarTabela('api_monitoramentos_plataforma', filtros),
    contarTabela('api_monitoramento_eventos', filtros),
    contarTabela('api_webhook_outbox', filtros),
    contarTabela('api_vinculos_processuais_plataforma', filtros),
    contarTabela('api_feedback_processual_plataforma', filtros),
  ]);

  return { monitoramentos, eventos, webhooks, vinculos, feedbacks };
}

export async function gerarDashboardComercial({ clienteId = null, apiKeyId = null, ownerRef = null, periodo = 'mes_atual', dataInicio = null, dataFim = null, limiteLogs = 100 } = {}) {
  const janela = resolvePeriodo({ periodo, dataInicio, dataFim });
  const [cliente, apiKeys, logs, operacionais] = await Promise.all([
    buscarCliente(clienteId),
    listarApiKeys({ clienteId, apiKeyId }),
    listarUsageLogs({ clienteId, apiKeyId, inicio: janela.inicio, fim: janela.fim, limite: 5000 }),
    indicadoresOperacionais({ clienteId, ownerRef }),
  ]);

  const resumo = resumoStatus(logs);
  const limites = resumoLimites(apiKeys, logs);
  const porRota = agruparPorRota(logs);
  const porDia = agruparPorDia(logs);

  return {
    periodo: janela,
    cliente: cliente
      ? { id: cliente.id, nome: cliente.nome, email: cliente.email, plano: cliente.plano, ativo: cliente.ativo }
      : null,
    limites,
    uso: resumo,
    billing: {
      unidade: 'requisicoes',
      consumo_periodo: resumo.total_requisicoes,
      plano: limites.plano,
      status: limites.status_limite,
      observacao: 'Resumo tecnico de consumo. Valores financeiros podem ser definidos na camada comercial.',
    },
    operacionais,
    top_rotas: porRota.slice(0, 15),
    uso_por_dia: porDia,
    api_keys: apiKeys,
    logs_recentes: logs.slice(0, Math.min(Number(limiteLogs || 100), 500)),
  };
}

export async function listarLogsComerciaisDetalhados({ clienteId = null, apiKeyId = null, periodo = 'mes_atual', dataInicio = null, dataFim = null, limite = 100 } = {}) {
  const janela = resolvePeriodo({ periodo, dataInicio, dataFim });
  const logs = await listarUsageLogs({ clienteId, apiKeyId, inicio: janela.inicio, fim: janela.fim, limite });
  return { periodo: janela, total: logs.length, logs };
}

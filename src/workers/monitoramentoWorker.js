import 'dotenv/config';
import cron from 'node-cron';
import { env } from '../config/env.js';
import { executarMonitoramentoDatajud } from '../modules/monitoramento/monitoramentoDatajudService.js';
import { executarMonitoramentoDjen } from '../modules/djen/djenService.js';

let stopping = false;
let datajudRunning = false;
let djenRunning = false;
const jobs = [];

function log(message, data = {}) {
  console.log(JSON.stringify({
    worker: 'monitoramentos',
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }));
}

function logError(message, error) {
  console.error(JSON.stringify({
    worker: 'monitoramentos',
    level: 'error',
    message,
    error: error?.message || String(error),
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  }));
}

async function executarDatajud() {
  if (stopping) return;
  if (datajudRunning) {
    log('datajud_ignorado_execucao_em_andamento');
    return;
  }

  datajudRunning = true;
  const started = Date.now();
  log('datajud_iniciado');

  try {
    const resultado = await executarMonitoramentoDatajud({ limite: Number(process.env.PROCESS_WORKER_BATCH_SIZE || 25) });
    log('datajud_finalizado', { duracao_ms: Date.now() - started, resumo: resultado.resumo });
  } catch (error) {
    logError('datajud_erro', error);
  } finally {
    datajudRunning = false;
  }
}

async function executarDjen() {
  if (stopping) return;
  if (djenRunning) {
    log('djen_ignorado_execucao_em_andamento');
    return;
  }

  djenRunning = true;
  const started = Date.now();
  log('djen_iniciado');

  try {
    const resultado = await executarMonitoramentoDjen({ limitePorOab: env.DJEN_ITENS_POR_PAGINA });
    log('djen_finalizado', { duracao_ms: Date.now() - started, resumo: resultado.resumo });
  } catch (error) {
    logError('djen_erro', error);
  } finally {
    djenRunning = false;
  }
}

function scheduleJob(nome, cronExpression, handler) {
  if (!cron.validate(cronExpression)) {
    log('cron_invalido', { nome, cron: cronExpression });
    return;
  }

  const job = cron.schedule(cronExpression, handler);
  jobs.push(job);
  log('job_agendado', { nome, cron: cronExpression });
}

async function shutdown(signal) {
  stopping = true;
  jobs.forEach((job) => job.stop());
  log('encerrando_worker', { signal });

  const started = Date.now();
  while ((datajudRunning || djenRunning) && Date.now() - started < 60000) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

log('worker_iniciado', {
  node_env: env.NODE_ENV,
  process_monitoring_enabled: env.PROCESS_MONITORING_ENABLED,
  process_monitoring_cron: env.PROCESS_MONITORING_CRON,
  djen_monitoring_enabled: env.DJEN_MONITORING_ENABLED,
  djen_monitoring_cron: env.DJEN_MONITORING_CRON,
});

if (env.PROCESS_MONITORING_ENABLED) {
  scheduleJob('datajud', env.PROCESS_MONITORING_CRON, executarDatajud);
}

if (env.DJEN_MONITORING_ENABLED) {
  scheduleJob('djen', env.DJEN_MONITORING_CRON, executarDjen);
}

if (process.env.WORKER_RUN_ON_START === 'true') {
  if (env.PROCESS_MONITORING_ENABLED) executarDatajud();
  if (env.DJEN_MONITORING_ENABLED) executarDjen();
}

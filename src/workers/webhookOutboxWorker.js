import 'dotenv/config';
import { processarWebhookOutbox } from '../modules/comercial/webhookOutboxService.js';

const INTERVAL_MS = Number(process.env.WEBHOOK_WORKER_INTERVAL_MS || 15000);
const BATCH_SIZE = Number(process.env.WEBHOOK_WORKER_BATCH_SIZE || 20);
const IDLE_INTERVAL_MS = Number(process.env.WEBHOOK_WORKER_IDLE_INTERVAL_MS || INTERVAL_MS);

let running = false;
let stopping = false;
let timer = null;

function log(message, data = {}) {
  console.log(JSON.stringify({
    worker: 'webhook-outbox',
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }));
}

function logError(message, error) {
  console.error(JSON.stringify({
    worker: 'webhook-outbox',
    level: 'error',
    message,
    error: error?.message || String(error),
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  }));
}

async function tick() {
  if (stopping) return;

  if (running) {
    log('execucao_anterior_em_andamento');
    scheduleNext(IDLE_INTERVAL_MS);
    return;
  }

  running = true;
  const started = Date.now();

  try {
    const resultado = await processarWebhookOutbox({ limite: BATCH_SIZE });
    log('lote_processado', {
      duracao_ms: Date.now() - started,
      resumo: resultado.resumo,
    });
  } catch (error) {
    logError('erro_processando_lote', error);
  } finally {
    running = false;
    scheduleNext(IDLE_INTERVAL_MS);
  }
}

function scheduleNext(delay = INTERVAL_MS) {
  if (stopping) return;
  timer = setTimeout(tick, delay);
}

async function shutdown(signal) {
  stopping = true;
  if (timer) clearTimeout(timer);
  log('encerrando_worker', { signal });

  const started = Date.now();
  while (running && Date.now() - started < 30000) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

log('worker_iniciado', {
  interval_ms: INTERVAL_MS,
  idle_interval_ms: IDLE_INTERVAL_MS,
  batch_size: BATCH_SIZE,
  node_env: process.env.NODE_ENV || null,
});

scheduleNext(1000);

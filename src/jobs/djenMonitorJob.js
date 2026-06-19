import cron from 'node-cron';
import { env } from '../config/env.js';
import { executarMonitoramentoDjen } from '../modules/djen/djenService.js';

let djenJob = null;
let executando = false;

export function iniciarMonitoramentoDjenAutomatico(app) {
  if (!env.DJEN_MONITORING_ENABLED) {
    app.log.info('Monitoramento automático DJEN desativado.');
    return null;
  }

  if (!cron.validate(env.DJEN_MONITORING_CRON)) {
    app.log.warn(`Cron inválido para monitoramento DJEN: ${env.DJEN_MONITORING_CRON}`);
    return null;
  }

  djenJob = cron.schedule(env.DJEN_MONITORING_CRON, async () => {
    if (executando) {
      app.log.warn('Monitoramento DJEN ignorado: execução anterior ainda em andamento.');
      return;
    }

    executando = true;
    app.log.info('Iniciando monitoramento automático DJEN.');

    try {
      const resultado = await executarMonitoramentoDjen({ limitePorOab: env.DJEN_ITENS_POR_PAGINA });
      app.log.info({ resultado: resultado.resumo }, 'Monitoramento automático DJEN finalizado.');
    } catch (error) {
      app.log.error(error, 'Erro no monitoramento automático DJEN.');
    } finally {
      executando = false;
    }
  });

  app.log.info(`Monitoramento automático DJEN agendado: ${env.DJEN_MONITORING_CRON}`);
  return djenJob;
}

export function pararMonitoramentoDjenAutomatico() {
  if (djenJob) {
    djenJob.stop();
    djenJob = null;
  }
}

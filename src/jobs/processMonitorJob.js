import cron from 'node-cron';
import { env } from '../config/env.js';
import { executarMonitoramentoDatajud } from '../modules/monitoramento/monitoramentoDatajudService.js';

let monitorJob = null;
let executando = false;

export function iniciarMonitoramentoAutomatico(app) {
  if (!env.PROCESS_MONITORING_ENABLED) {
    app.log.info('Monitoramento automático de processos desativado.');
    return null;
  }

  if (!cron.validate(env.PROCESS_MONITORING_CRON)) {
    app.log.warn(`Cron inválido para monitoramento: ${env.PROCESS_MONITORING_CRON}`);
    return null;
  }

  monitorJob = cron.schedule(env.PROCESS_MONITORING_CRON, async () => {
    if (executando) {
      app.log.warn('Monitoramento DataJud ignorado: execução anterior ainda em andamento.');
      return;
    }

    executando = true;
    app.log.info('Iniciando monitoramento automático DataJud.');

    try {
      const resultado = await executarMonitoramentoDatajud({ limite: 25 });
      app.log.info({ resultado: resultado.resumo }, 'Monitoramento automático DataJud finalizado.');
    } catch (error) {
      app.log.error(error, 'Erro no monitoramento automático DataJud.');
    } finally {
      executando = false;
    }
  });

  app.log.info(`Monitoramento automático DataJud agendado: ${env.PROCESS_MONITORING_CRON}`);

  return monitorJob;
}

export function pararMonitoramentoAutomatico() {
  if (monitorJob) {
    monitorJob.stop();
    monitorJob = null;
  }
}

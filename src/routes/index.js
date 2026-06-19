import { healthRoutes } from './health.routes.js';
import { processosRoutes } from './processos.routes.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes);
  await app.register(processosRoutes);

  app.get('/', async () => ({
    success: true,
    service: 'API Social Jurídico',
    version: '0.1.0',
    message: 'API interna para importação e monitoramento de processos judiciais.',
  }));
}

import { healthRoutes } from './health.routes.js';
import { processosRoutes } from './processos.routes.js';
import { processosFase2Routes } from './processos-fase2.routes.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes);
  await app.register(processosRoutes);
  await app.register(processosFase2Routes);

  app.get('/', async () => ({
    success: true,
    service: 'API Social Jurídico',
    version: '0.2.0',
    message: 'API interna para importação e monitoramento de processos judiciais.',
  }));
}

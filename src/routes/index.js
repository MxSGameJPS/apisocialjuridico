import { healthRoutes } from './health.routes.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes);

  app.get('/', async () => {
    return {
      success: true,
      service: 'API Social Jurídico',
      version: '0.1.0',
      message: 'API interna para importação e monitoramento de processos judiciais.',
    };
  });
}

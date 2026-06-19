import { djenRoutes } from './djen.routes.js';
import { healthRoutes } from './health.routes.js';
import { monitoramentoRoutes } from './monitoramento.routes.js';
import { processosFase2Routes } from './processos-fase2.routes.js';
import { processosRoutes } from './processos.routes.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes);
  await app.register(processosRoutes);
  await app.register(processosFase2Routes);
  await app.register(monitoramentoRoutes);
  await app.register(djenRoutes);

  app.get('/', async () => ({
    success: true,
    service: 'API Social Jurídico',
    version: '0.4.0',
    message: 'API interna para importacao, monitoramento DataJud e monitoramento DJEN.',
  }));
}

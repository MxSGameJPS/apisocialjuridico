import { djenRoutes } from './djen.routes.js';
import { healthRoutes } from './health.routes.js';
import { monitoramentoRoutes } from './monitoramento.routes.js';
import { processosFase2Routes } from './processos-fase2.routes.js';
import { processosRoutes } from './processos.routes.js';
import { publicoRoutes } from './publico.routes.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes);
  await app.register(processosRoutes);
  await app.register(processosFase2Routes);
  await app.register(monitoramentoRoutes);
  await app.register(djenRoutes);
  await app.register(publicoRoutes);

  app.get('/', async () => ({
    success: true,
    service: 'API Social Jurídico',
    version: '0.6.0',
    message: 'API processual com DataJud, DJEN, busca pública e índice processual enriquecido.',
  }));
}

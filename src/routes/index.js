import { djenRoutes } from './djen.routes.js';
import { healthRoutes } from './health.routes.js';
import { monitoramentoRoutes } from './monitoramento.routes.js';
import { processosFase2Routes } from './processos-fase2.routes.js';
import { processosRoutes } from './processos.routes.js';
import { publicoFase6Routes } from './publico-fase6.routes.js';
import { publicoFase789Routes } from './publico-fase789.routes.js';
import { publicoRoutes } from './publico.routes.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes);
  await app.register(processosRoutes);
  await app.register(processosFase2Routes);
  await app.register(monitoramentoRoutes);
  await app.register(djenRoutes);
  await app.register(publicoRoutes);
  await app.register(publicoFase6Routes);
  await app.register(publicoFase789Routes);

  app.get('/', async () => ({
    success: true,
    service: 'API Social Jurídico',
    version: '0.8.0',
    message: 'API processual com entidades, dossiês públicos e inteligência jurídica.',
  }));
}

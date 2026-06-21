import { comercialRoutes } from './comercial.routes.js';
import { cpfResolverRoutes } from './cpf-resolver.routes.js';
import { djenRoutes } from './djen.routes.js';
import { frontendRoutes } from './frontend.routes.js';
import { healthRoutes } from './health.routes.js';
import { monitoramentoRoutes } from './monitoramento.routes.js';
import { plataformaBuscaRoutes } from './plataforma-busca.routes.js';
import { plataformaCrmRoutes } from './plataforma-crm.routes.js';
import { plataformaEnriquecimentoRoutes } from './plataforma-enriquecimento.routes.js';
import { plataformaFeedbackRoutes } from './plataforma-feedback.routes.js';
import { plataformaMonitoramentoRoutes } from './plataforma-monitoramento.routes.js';
import { plataformaVinculosRoutes } from './plataforma-vinculos.routes.js';
import { plataformaWebhookRoutes } from './plataforma-webhook.routes.js';
import { processosFase2Routes } from './processos-fase2.routes.js';
import { processosRoutes } from './processos.routes.js';
import { publicoFase6Routes } from './publico-fase6.routes.js';
import { publicoFase789Routes } from './publico-fase789.routes.js';
import { publicoFase10Routes } from './publico-fase10.routes.js';
import { publicoLiveRoutes } from './publico-live.routes.js';
import { publicoRoutes } from './publico.routes.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes);
  await app.register(frontendRoutes);
  await app.register(processosRoutes);
  await app.register(processosFase2Routes);
  await app.register(monitoramentoRoutes);
  await app.register(djenRoutes);
  await app.register(publicoRoutes);
  await app.register(publicoFase6Routes);
  await app.register(publicoFase789Routes);
  await app.register(publicoFase10Routes);
  await app.register(publicoLiveRoutes);
  await app.register(cpfResolverRoutes);
  await app.register(plataformaBuscaRoutes);
  await app.register(plataformaCrmRoutes);
  await app.register(plataformaMonitoramentoRoutes);
  await app.register(plataformaVinculosRoutes);
  await app.register(plataformaWebhookRoutes);
  await app.register(plataformaFeedbackRoutes);
  await app.register(plataformaEnriquecimentoRoutes);
  await app.register(comercialRoutes);

  app.get('/', async () => ({
    success: true,
    service: 'API Social Juridico',
    version: '1.4.6',
    message: 'API processual com busca viva, monitoramento para plataformas, eventos, webhooks, feedback loop, enriquecimento em lote, vinculos confirmados, payload CRM, API comercial e inteligencia juridica.',
    app: '/app',
    docs: '/docs',
  }));
}

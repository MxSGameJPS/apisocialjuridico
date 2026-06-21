import { internalAuth } from '../middlewares/internalAuth.js';
import { healthLiveness, healthReadiness, infraStatusDetalhado } from '../modules/infra/healthService.js';
import { gerarObservabilidadeInfra } from '../modules/infra/observabilityService.js';

export async function healthRoutes(app) {
  app.get('/health', async () => healthLiveness());

  app.get('/health/live', async () => healthLiveness());

  app.get('/health/ready', async (request, reply) => {
    const data = await healthReadiness();
    if (!data.success) return reply.code(503).send(data);
    return data;
  });

  app.get('/api/infra/status', { preHandler: internalAuth }, async (request, reply) => {
    const data = await infraStatusDetalhado();
    if (!data.success) return reply.code(503).send(data);
    return data;
  });

  app.get('/api/infra/observabilidade', { preHandler: internalAuth }, async () => gerarObservabilidadeInfra());

  app.get('/api/infra/alertas', { preHandler: internalAuth }, async () => {
    const data = await gerarObservabilidadeInfra();
    return {
      success: data.success,
      status: data.status,
      timestamp: data.timestamp,
      resumo: data.resumo,
      alertas: data.alertas,
    };
  });
}

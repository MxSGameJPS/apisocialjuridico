import crypto from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { openApiDocument } from './docs/openapi-1-4-12.js';
import { iniciarMonitoramentoDjenAutomatico, pararMonitoramentoDjenAutomatico } from './jobs/djenMonitorJob.js';
import { iniciarMonitoramentoAutomatico, pararMonitoramentoAutomatico } from './jobs/processMonitorJob.js';
import { aplicarHeadersSeguranca } from './middlewares/securityHeaders.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  app.addHook('onRequest', aplicarHeadersSeguranca);

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
  });

  await app.register(swagger, {
    mode: 'static',
    specification: {
      document: openApiDocument,
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  await registerRoutes(app);

  iniciarMonitoramentoAutomatico(app);
  iniciarMonitoramentoDjenAutomatico(app);

  app.addHook('onClose', async () => {
    pararMonitoramentoAutomatico();
    pararMonitoramentoDjenAutomatico();
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || 'Erro interno da API.',
      externalStatus: error.externalStatus,
      request_id: request.id,
    });
  });

  return app;
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { openApiDocument } from './docs/openapi.js';
import { iniciarMonitoramentoAutomatico, pararMonitoramentoAutomatico } from './jobs/processMonitorJob.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

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

  app.addHook('onClose', async () => {
    pararMonitoramentoAutomatico();
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || 'Erro interno da API.',
    });
  });

  return app;
}

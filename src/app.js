import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
  });

  await registerRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || 'Erro interno da API.',
    });
  });

  return app;
}

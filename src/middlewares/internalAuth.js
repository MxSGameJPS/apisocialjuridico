import { env } from '../config/env.js';

export async function internalAuth(request, reply) {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== env.API_SECRET_KEY) {
    return reply.code(401).send({
      success: false,
      message: 'Não autorizado.',
    });
  }
}

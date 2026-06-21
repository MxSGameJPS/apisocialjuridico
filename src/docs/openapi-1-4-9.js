import { openApiDocument as baseDocument } from './openapi-1-4-8.js';

export const openApiDocument = {
  ...baseDocument,
  info: {
    ...baseDocument.info,
    version: '1.4.9',
    description: 'API processual com busca viva, monitoramento, webhooks profissionais com HMAC/retry/logs, dashboard comercial e Fase 18.0 de infraestrutura segura com headers HTTP, request id, liveness, readiness e status interno de infraestrutura.',
  },
  paths: {
    ...baseDocument.paths,
    '/health': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Healthcheck simples de liveness',
        responses: { 200: { description: 'API online.' } },
      },
    },
    '/health/live': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Liveness probe para uptime externo',
        responses: { 200: { description: 'Processo da API vivo.' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Readiness probe com checagem de dependencias essenciais',
        responses: {
          200: { description: 'API pronta para receber trafego.' },
          503: { description: 'API degradada ou dependencia indisponivel.' },
        },
      },
    },
    '/api/infra/status': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Status interno detalhado de infraestrutura sem expor segredos',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Status interno retornado.' },
          401: { description: 'Nao autorizado.' },
          503: { description: 'Infraestrutura degradada.' },
        },
      },
    },
  },
};

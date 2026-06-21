import { openApiDocument as baseDocument } from './openapi-1-4-9.js';

const infraTag = { name: 'Infraestrutura', description: 'Healthcheck, readiness, observabilidade, alertas, workers, backup, restore e DRP.' };

const tags = Array.isArray(baseDocument.tags)
  ? [...baseDocument.tags.filter((tag) => tag.name !== infraTag.name), infraTag]
  : [infraTag];

export const openApiDocument = {
  ...baseDocument,
  info: {
    ...baseDocument.info,
    version: '1.4.12',
    description: 'API processual com busca viva, monitoramento, eventos, webhooks profissionais com HMAC/retry/logs, feedback loop, enriquecimento em lote, dashboard comercial, headers de seguranca, request id, readiness, liveness, observabilidade, alertas internos, workers dedicados, backup seguro, restore e DRP.',
  },
  tags,
  paths: {
    ...baseDocument.paths,
    '/health': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Healthcheck simples de liveness',
        description: 'Retorna informacoes basicas para confirmar que o processo HTTP esta vivo.',
        responses: {
          200: { description: 'API online.' },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Liveness probe',
        description: 'Usado por monitor externo para validar que o processo da API esta vivo.',
        responses: {
          200: { description: 'Processo da API vivo.' },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Readiness probe',
        description: 'Valida dependencias essenciais, incluindo Supabase e variaveis obrigatorias.',
        responses: {
          200: { description: 'API pronta para receber trafego.' },
          503: { description: 'API degradada ou dependencia indisponivel.' },
        },
      },
    },
    '/api/infra/status': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Status interno detalhado',
        description: 'Retorna status interno sem expor valores de segredos. Requer x-api-key.',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Status interno retornado.' },
          401: { description: 'Nao autorizado.' },
          503: { description: 'Infraestrutura degradada.' },
        },
      },
    },
    '/api/infra/observabilidade': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Observabilidade interna completa',
        description: 'Retorna metricas de Supabase, memoria, webhooks, uso das rotas comerciais e alertas internos. Requer x-api-key.',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Observabilidade retornada.' },
          401: { description: 'Nao autorizado.' },
        },
      },
    },
    '/api/infra/alertas': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Alertas internos resumidos',
        description: 'Retorna apenas status, resumo e lista de alertas warning/critical. Requer x-api-key.',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Alertas retornados.' },
          401: { description: 'Nao autorizado.' },
        },
      },
    },
  },
  'x-social-juridico-infra': {
    version: '1.4.12',
    workers: {
      webhooks: {
        script: 'npm run worker:webhooks',
        pm2_name: 'apisocialjuridico-webhooks-worker',
        responsabilidade: 'Processar api_webhook_outbox, entregar webhooks e aplicar retry/backoff.',
      },
      monitoramentos: {
        script: 'npm run worker:monitoramentos',
        pm2_name: 'apisocialjuridico-monitoramentos-worker',
        responsabilidade: 'Executar cron de monitoramento DataJud/DJEN fora do processo HTTP principal.',
      },
    },
    backup_restore_drp: {
      scripts: [
        'npm run backup:validate',
        'npm run backup:app',
        'npm run backup:supabase',
      ],
      documentacao: 'docs/fase18-4-backup-restore-drp.md',
      observacao: 'Scripts operacionais nao sao rotas HTTP, mas ficam registrados nesta extensao OpenAPI para auditoria tecnica.',
    },
  },
};

import { openApiDocument as baseDocument } from './openapi-1-4-7.js';

const ok = { description: 'Operacao executada com sucesso.' };
const badRequest = { description: 'Dados invalidos.' };
const unauthorized = { description: 'Nao autorizado.' };
const tooManyRequests = { description: 'Limite excedido.' };

function postEndpoint({ tag, summary, schema = 'GenericRequest', required = true, commercial = false }) {
  return {
    post: {
      tags: [tag],
      summary,
      security: commercial ? [{ CommercialApiKeyAuth: [] }] : [{ ApiKeyAuth: [] }],
      requestBody: { required, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } } },
      responses: { 200: ok, 400: badRequest, 401: unauthorized, 429: tooManyRequests },
    },
  };
}

const dashboardRequestSchema = {
  type: 'object',
  properties: {
    cliente_id: { type: 'string', format: 'uuid', nullable: true },
    api_key_id: { type: 'string', format: 'uuid', nullable: true },
    owner_ref: { type: 'string', nullable: true, example: 'sandbox_social_juridico' },
    periodo: { type: 'string', enum: ['hoje', '7d', '30d', 'mes_atual'], example: 'mes_atual' },
    data_inicio: { type: 'string', nullable: true, example: '2026-06-01T00:00:00.000Z' },
    data_fim: { type: 'string', nullable: true, example: '2026-06-21T23:59:59.000Z' },
    limite_logs: { type: 'integer', example: 100 },
  },
};

const logsRequestSchema = {
  type: 'object',
  properties: {
    cliente_id: { type: 'string', format: 'uuid', nullable: true },
    api_key_id: { type: 'string', format: 'uuid', nullable: true },
    periodo: { type: 'string', enum: ['hoje', '7d', '30d', 'mes_atual'], example: '7d' },
    data_inicio: { type: 'string', nullable: true },
    data_fim: { type: 'string', nullable: true },
    limite: { type: 'integer', example: 100 },
  },
};

export const openApiDocument = {
  ...baseDocument,
  info: {
    ...baseDocument.info,
    version: '1.4.8',
    description: 'API processual com busca OAB/CNJ, monitoramento, eventos, webhook outbox profissional com HMAC e retry, feedback loop, enriquecimento em lote, dashboard comercial, billing tecnico, logs, vinculos confirmados, payload CRM e camada comercial.',
  },
  components: {
    ...baseDocument.components,
    schemas: {
      ...baseDocument.components.schemas,
      DashboardComercialRequest: dashboardRequestSchema,
      LogsComerciaisRequest: logsRequestSchema,
    },
  },
  paths: {
    ...baseDocument.paths,
    '/api/comercial/dashboard': postEndpoint({ tag: 'Comercial Admin', summary: 'Dashboard tecnico de uso, limites e billing por cliente', schema: 'DashboardComercialRequest', required: false }),
    '/api/comercial/logs': postEndpoint({ tag: 'Comercial Admin', summary: 'Logs comerciais detalhados', schema: 'LogsComerciaisRequest', required: false }),
    '/api/v1/dashboard': postEndpoint({ tag: 'API Comercial v1', summary: 'Dashboard de uso da propria API key comercial', schema: 'DashboardComercialRequest', commercial: true, required: false }),
    '/api/v1/logs': postEndpoint({ tag: 'API Comercial v1', summary: 'Logs da propria API key comercial', schema: 'LogsComerciaisRequest', commercial: true, required: false }),
  },
};

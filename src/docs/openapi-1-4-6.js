import { openApiDocument as baseDocument } from './openapi-1-4-5.js';

const enriquecimentoLoteSchema = {
  type: 'object',
  required: ['processos'],
  properties: {
    owner_ref: { type: 'string', nullable: true, example: 'sandbox_social_juridico' },
    plataforma_ref: { type: 'string', nullable: true, example: 'teste_webhook_final' },
    processos: {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      items: {
        oneOf: [
          { type: 'string', example: '50336208020258210033' },
          {
            type: 'object',
            additionalProperties: true,
            example: {
              numero_cnj: '50336208020258210033',
              processo: {
                classe: 'Embargos a Execucao',
                tribunal: 'TJRS',
                parte_ativa: 'SUELEN MACHADO CAETANO',
                parte_passiva: 'ELISABETE DA LUZ LANGER',
              },
            },
          },
        ],
      },
    },
    uf: { type: 'string', nullable: true, example: 'RS' },
    oab: { type: 'string', nullable: true, example: '140234' },
    termo_oab: { type: 'string', nullable: true },
    incluir_timeline: { type: 'boolean', example: false },
    limite_eventos: { type: 'integer', example: 5 },
    limite: { type: 'integer', example: 50 },
  },
};

function postEndpoint({ tag, summary, schema = 'GenericRequest', required = true, commercial = false }) {
  const ok = { description: 'Operacao executada com sucesso.' };
  const badRequest = { description: 'Dados invalidos.' };
  const unauthorized = { description: 'Nao autorizado.' };
  const tooManyRequests = { description: 'Limite excedido.' };

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

export const openApiDocument = {
  ...baseDocument,
  info: {
    ...baseDocument.info,
    version: '1.4.6',
    description: 'API processual com busca OAB/CNJ, monitoramento, eventos, webhook outbox, feedback loop, enriquecimento em lote, vinculos confirmados, payload CRM e camada comercial.',
  },
  components: {
    ...baseDocument.components,
    schemas: {
      ...baseDocument.components.schemas,
      EnriquecimentoLoteRequest: enriquecimentoLoteSchema,
    },
  },
  paths: {
    ...baseDocument.paths,
    '/api/plataformas/enriquecimento/lote': postEndpoint({
      tag: 'Plataformas',
      summary: 'Enriquecer processos em lote para CRM e monitoramento',
      schema: 'EnriquecimentoLoteRequest',
    }),
    '/api/v1/enriquecimento/lote': postEndpoint({
      tag: 'API Comercial v1',
      summary: 'Enriquecer processos em lote na API comercial',
      schema: 'EnriquecimentoLoteRequest',
      commercial: true,
    }),
  },
};

import { openApiDocument as baseDocument } from './openapi-1-4-6.js';

export const openApiDocument = {
  ...baseDocument,
  info: {
    ...baseDocument.info,
    version: '1.4.7',
    description: 'API processual com busca OAB/CNJ, monitoramento, eventos, webhook outbox profissional com HMAC e retry, feedback loop, enriquecimento em lote, vinculos confirmados, payload CRM e camada comercial.',
  },
};

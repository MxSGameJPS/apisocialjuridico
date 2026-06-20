export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Social Jurídico',
    version: '0.6.0',
    description: 'API processual com DataJud, DJEN, busca pública, enriquecimento e índice processual público.',
  },
  servers: [
    { url: 'https://n8n.socialjuridico.com.br', description: 'Produção temporária' },
    { url: 'http://localhost:3333', description: 'Desenvolvimento local' },
  ],
  tags: [
    { name: 'Sistema', description: 'Status e informações gerais.' },
    { name: 'Processos', description: 'Busca, importação e atualização de processos.' },
    { name: 'Monitoramento', description: 'Monitoramento automático/manual via DataJud.' },
    { name: 'DJEN', description: 'Consulta, monitoramento e processamento de publicações por OAB.' },
    { name: 'Busca Pública', description: 'Busca pública avançada e índice processual enriquecido.' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
    schemas: {
      GenericSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operação processada.' },
          data: { type: 'object', additionalProperties: true },
        },
      },
      FiltrosPublicos: {
        type: 'object',
        properties: {
          oab: { type: 'string', example: '380494' },
          uf: { type: 'string', example: 'SP' },
          numero_processo: { type: 'string', example: '0800039-86.2026.9.26.0060' },
          tribunal: { type: 'string', example: 'TJSP' },
          nome_parte: { type: 'string', example: 'SABESP' },
          nome_advogado: { type: 'string', example: 'IGOR GOMIDES' },
          data_inicio: { type: 'string', example: '2026-06-19' },
          data_fim: { type: 'string', example: '2026-06-19' },
          itens_por_pagina: { type: 'integer', example: 5 },
        },
      },
      BuscaPublicaDjenRequest: {
        type: 'object',
        properties: {
          advogado_id: { type: 'string', nullable: true, example: 'publico' },
          salvar: { type: 'boolean', example: true },
          filtros: { $ref: '#/components/schemas/FiltrosPublicos' },
        },
      },
      EnriquecerBuscaRequest: {
        type: 'object',
        properties: {
          salvar_busca: { type: 'boolean', example: true },
          usar_datajud: { type: 'boolean', example: true },
          limite: { type: 'integer', example: 5 },
          filtros: { $ref: '#/components/schemas/FiltrosPublicos' },
        },
      },
      EnriquecerPendentesRequest: {
        type: 'object',
        properties: {
          usar_datajud: { type: 'boolean', example: true },
          limite: { type: 'integer', example: 10 },
        },
      },
      BuscarIndiceRequest: {
        type: 'object',
        properties: {
          termo: { type: 'string', example: 'SABESP' },
          numero_cnj: { type: 'string', example: '40004565820268260069' },
          tribunal: { type: 'string', example: 'TJSP' },
          limite: { type: 'integer', example: 20 },
        },
      },
      BuscarProcessoRequest: {
        type: 'object',
        required: ['numero_processo'],
        properties: { numero_processo: { type: 'string', example: '1003394-43.2024.8.26.0394' } },
      },
      BaixarProcessoRequest: {
        type: 'object',
        required: ['numero_processo', 'advogado_id'],
        properties: {
          numero_processo: { type: 'string', example: '10033944320248260394' },
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true, example: 'teste-usuario-001' },
        },
      },
    },
  },
  paths: {
    '/': { get: { tags: ['Sistema'], summary: 'Informações básicas da API', responses: { 200: { description: 'OK' } } } },
    '/health': { get: { tags: ['Sistema'], summary: 'Status da API', responses: { 200: { description: 'API online' } } } },
    '/api/publico/djen/buscar': {
      post: { tags: ['Busca Pública'], summary: 'Busca pública avançada DJEN', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscaPublicaDjenRequest' } } } }, responses: { 200: { description: 'Busca pública executada' } } },
    },
    '/api/publico/processos/enriquecer-busca': {
      post: { tags: ['Busca Pública'], summary: 'Buscar no DJEN e enriquecer com DataJud', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EnriquecerBuscaRequest' } } } }, responses: { 200: { description: 'Busca enriquecida' } } },
    },
    '/api/publico/processos/enriquecer-pendentes': {
      post: { tags: ['Busca Pública'], summary: 'Enriquecer publicações DJEN já salvas', security: [{ ApiKeyAuth: [] }], requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/EnriquecerPendentesRequest' } } } }, responses: { 200: { description: 'Pendentes enriquecidas' } } },
    },
    '/api/publico/processos/buscar-indice': {
      post: { tags: ['Busca Pública'], summary: 'Buscar no índice público processual', security: [{ ApiKeyAuth: [] }], requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscarIndiceRequest' } } } }, responses: { 200: { description: 'Busca no índice executada' } } },
    },
    '/api/processos/buscar': {
      post: { tags: ['Processos'], summary: 'Buscar processo para conferência', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscarProcessoRequest' } } } }, responses: { 200: { description: 'Processo encontrado' } } },
    },
    '/api/processos/baixar': {
      post: { tags: ['Processos'], summary: 'Baixar processo para o CRM', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BaixarProcessoRequest' } } } }, responses: { 200: { description: 'Processo salvo' } } },
    },
  },
};

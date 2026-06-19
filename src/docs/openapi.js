export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Social Jurídico',
    version: '0.5.0',
    description: 'API processual com DataJud, DJEN, busca pública, CRM, importação, atualização e monitoramento processual com IA.',
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
    { name: 'Busca Pública', description: 'Busca pública avançada de publicações judiciais, estilo produto de dados processuais.' },
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
      BuscaPublicaDjenRequest: {
        type: 'object',
        properties: {
          advogado_id: { type: 'string', nullable: true, example: 'publico' },
          salvar: { type: 'boolean', example: true },
          filtros: {
            type: 'object',
            properties: {
              oab: { type: 'string', example: '380494' },
              uf: { type: 'string', example: 'SP' },
              numero_processo: { type: 'string', example: '0800039-86.2026.9.26.0060' },
              tribunal: { type: 'string', example: 'TJSP' },
              nome_parte: { type: 'string', example: 'ISMAEL FABRIS' },
              nome_advogado: { type: 'string', example: 'JULIANA GALERA' },
              nome_orgao: { type: 'string', example: '2ª Auditoria Militar Estadual' },
              tipo_comunicacao: { type: 'string', example: 'Intimação' },
              tipo_documento: { type: 'string', example: 'EDITAL DE INTIMAÇÃO' },
              data_inicio: { type: 'string', example: '2026-06-01' },
              data_fim: { type: 'string', example: '2026-06-19' },
              pagina: { type: 'integer', example: 1 },
              itens_por_pagina: { type: 'integer', example: 50 },
              parametros_extras: { type: 'object', additionalProperties: true },
            },
          },
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
      ImportarLoteRequest: {
        type: 'object',
        required: ['advogado_id', 'processos'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true, example: 'teste-usuario-001' },
          ignorar_duplicados: { type: 'boolean', example: true },
          processos: { type: 'array', items: { type: 'string' }, example: ['10033944320248260394'] },
        },
      },
      AtualizarRequest: {
        type: 'object',
        required: ['numero_processo', 'advogado_id'],
        properties: {
          numero_processo: { type: 'string', example: '10033944320248260394' },
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true, example: 'teste-usuario-001' },
        },
      },
      AtualizarLoteRequest: {
        type: 'object',
        required: ['advogado_id', 'processos'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true, example: 'teste-usuario-001' },
          processos: { type: 'array', items: { type: 'string' }, example: ['10033944320248260394'] },
        },
      },
      ExecutarMonitoramentoRequest: {
        type: 'object',
        properties: {
          advogado_id: { type: 'string', nullable: true, example: 'teste-advogado-001' },
          limite: { type: 'integer', minimum: 1, maximum: 100, example: 25 },
        },
      },
      DjenMonitoramentoRequest: {
        type: 'object',
        required: ['advogado_id', 'oab', 'uf'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true, example: 'teste-usuario-001' },
          oab: { type: 'string', example: '123456' },
          uf: { type: 'string', example: 'SP' },
          ativo: { type: 'boolean', example: true },
        },
      },
      DjenConsultarRequest: {
        type: 'object',
        required: ['oab', 'uf'],
        properties: {
          advogado_id: { type: 'string', nullable: true, example: 'teste-advogado-001' },
          oab: { type: 'string', example: '123456' },
          uf: { type: 'string', example: 'SP' },
          data_inicio: { type: 'string', nullable: true, example: '2026-06-01' },
          data_fim: { type: 'string', nullable: true, example: '2026-06-19' },
          salvar: { type: 'boolean', example: true },
        },
      },
      DjenProcessarRequest: {
        type: 'object',
        required: ['advogado_id', 'oab', 'uf'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true, example: 'teste-usuario-001' },
          oab: { type: 'string', example: '123456' },
          uf: { type: 'string', example: 'SP' },
          importar_processos: { type: 'boolean', example: false },
          limite: { type: 'integer', example: 50 },
        },
      },
      DjenMonitorarRequest: {
        type: 'object',
        properties: { limite_por_oab: { type: 'integer', example: 50 } },
      },
    },
  },
  paths: {
    '/': { get: { tags: ['Sistema'], summary: 'Informações básicas da API', responses: { 200: { description: 'OK' } } } },
    '/health': { get: { tags: ['Sistema'], summary: 'Status da API', responses: { 200: { description: 'API online' } } } },
    '/api/publico/djen/buscar': {
      post: { tags: ['Busca Pública'], summary: 'Busca pública avançada DJEN', description: 'Busca publicações por OAB, processo, tribunal, parte, advogado, órgão, tipo e período.', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscaPublicaDjenRequest' } } } }, responses: { 200: { description: 'Busca pública executada' } } },
    },
    '/api/processos/buscar': {
      post: { tags: ['Processos'], summary: 'Buscar processo para conferência', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscarProcessoRequest' } } } }, responses: { 200: { description: 'Processo encontrado' } } },
    },
    '/api/processos/baixar': {
      post: { tags: ['Processos'], summary: 'Baixar processo para o CRM', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BaixarProcessoRequest' } } } }, responses: { 200: { description: 'Processo salvo' } } },
    },
    '/api/processos/importar-lote': {
      post: { tags: ['Processos'], summary: 'Importar processos em lote', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportarLoteRequest' } } } }, responses: { 200: { description: 'Importação em lote processada' } } },
    },
    '/api/processos/atualizar': {
      post: { tags: ['Processos'], summary: 'Atualizar processo manualmente', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarRequest' } } } }, responses: { 200: { description: 'Processo atualizado' } } },
    },
    '/api/processos/atualizar-lote': {
      post: { tags: ['Processos'], summary: 'Atualizar processos em lote', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarLoteRequest' } } } }, responses: { 200: { description: 'Atualização em lote processada' } } },
    },
    '/api/monitoramento/datajud/executar': {
      post: { tags: ['Monitoramento'], summary: 'Executar monitoramento DataJud manualmente', security: [{ ApiKeyAuth: [] }], requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExecutarMonitoramentoRequest' } } } }, responses: { 200: { description: 'Monitoramento executado' } } },
    },
    '/api/djen/monitoramentos': {
      post: { tags: ['DJEN'], summary: 'Cadastrar OAB para monitoramento', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DjenMonitoramentoRequest' } } } }, responses: { 200: { description: 'Monitoramento salvo' } } },
    },
    '/api/djen/consultar': {
      post: { tags: ['DJEN'], summary: 'Consultar DJEN por OAB/UF', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DjenConsultarRequest' } } } }, responses: { 200: { description: 'Consulta executada' } } },
    },
    '/api/djen/processar': {
      post: { tags: ['DJEN'], summary: 'Processar publicações DJEN', security: [{ ApiKeyAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DjenProcessarRequest' } } } }, responses: { 200: { description: 'Publicações processadas' } } },
    },
    '/api/djen/monitorar': {
      post: { tags: ['DJEN'], summary: 'Executar monitoramento DJEN', security: [{ ApiKeyAuth: [] }], requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/DjenMonitorarRequest' } } } }, responses: { 200: { description: 'Monitoramento DJEN executado' } } },
    },
  },
};

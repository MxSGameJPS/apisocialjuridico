export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Social Jurídico',
    version: '0.3.0',
    description: 'API interna do Social Jurídico para busca, importação, atualização manual e monitoramento automático DataJud de processos judiciais, com resumo por IA.',
  },
  servers: [
    { url: 'https://n8n.socialjuridico.com.br', description: 'Produção temporária' },
    { url: 'http://localhost:3333', description: 'Desenvolvimento local' },
  ],
  tags: [
    { name: 'Sistema', description: 'Status e informações gerais.' },
    { name: 'Processos', description: 'Busca, importação e atualização de processos.' },
    { name: 'Monitoramento', description: 'Monitoramento automático/manual via DataJud.' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Não autorizado.' },
          errors: { type: 'object', nullable: true, additionalProperties: true },
        },
      },
      PessoaCRM: {
        type: 'object',
        nullable: true,
        properties: {
          nome: { type: 'string', example: 'Maria da Silva' },
          tipo: { type: 'string', enum: ['pessoa_fisica', 'pessoa_juridica', 'nao_informado'], example: 'pessoa_fisica' },
          documento: { type: 'string', nullable: true, example: '000.000.000-00' },
          email: { type: 'string', nullable: true, example: 'cliente@email.com' },
          telefone: { type: 'string', nullable: true, example: '(11) 99999-9999' },
          observacoes: { type: 'string', nullable: true, example: 'Cliente informado manualmente.' },
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
          cliente: { $ref: '#/components/schemas/PessoaCRM' },
          parte_contraria: { $ref: '#/components/schemas/PessoaCRM' },
        },
      },
      ImportarLoteRequest: {
        type: 'object',
        required: ['advogado_id', 'processos'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true, example: 'teste-usuario-001' },
          ignorar_duplicados: { type: 'boolean', example: true },
          processos: { type: 'array', items: { type: 'string' }, example: ['10033944320248260394', '1003394-43.2024.8.26.0394'] },
          cliente: { $ref: '#/components/schemas/PessoaCRM' },
          parte_contraria: { $ref: '#/components/schemas/PessoaCRM' },
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
      GenericSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operação processada.' },
          data: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
  paths: {
    '/': { get: { tags: ['Sistema'], summary: 'Informações básicas da API', responses: { 200: { description: 'OK' } } } },
    '/health': { get: { tags: ['Sistema'], summary: 'Status da API', responses: { 200: { description: 'API online' } } } },
    '/api/processos/buscar': {
      post: {
        tags: ['Processos'], summary: 'Buscar processo para conferência', security: [{ ApiKeyAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscarProcessoRequest' } } } },
        responses: { 200: { description: 'Processo encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccess' } } } }, 400: { description: 'Dados inválidos' }, 401: { description: 'Não autorizado' }, 404: { description: 'Processo não encontrado' } },
      },
    },
    '/api/processos/baixar': {
      post: {
        tags: ['Processos'], summary: 'Baixar processo para o CRM', security: [{ ApiKeyAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BaixarProcessoRequest' } } } },
        responses: { 200: { description: 'Processo salvo', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccess' } } } } },
      },
    },
    '/api/processos/importar-lote': {
      post: {
        tags: ['Processos'], summary: 'Importar processos em lote', description: 'Recebe uma lista de CNJs, consulta o DataJud em sequência, evita duplicados quando configurado e retorna relatório por processo.', security: [{ ApiKeyAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportarLoteRequest' } } } },
        responses: { 200: { description: 'Importação em lote processada', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccess' } } } } },
      },
    },
    '/api/processos/atualizar': {
      post: {
        tags: ['Processos'], summary: 'Atualizar processo manualmente', description: 'Consulta novamente o DataJud, atualiza movimentações, resumo IA e metadados de sincronização.', security: [{ ApiKeyAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarRequest' } } } },
        responses: { 200: { description: 'Processo atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccess' } } } } },
      },
    },
    '/api/processos/atualizar-lote': {
      post: {
        tags: ['Processos'], summary: 'Atualizar processos em lote', security: [{ ApiKeyAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarLoteRequest' } } } },
        responses: { 200: { description: 'Atualização em lote processada', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccess' } } } } },
      },
    },
    '/api/monitoramento/datajud/executar': {
      post: {
        tags: ['Monitoramento'], summary: 'Executar monitoramento DataJud manualmente', description: 'Consulta processos importados, compara movimentações e grava logs de monitoramento.', security: [{ ApiKeyAuth: [] }],
        requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExecutarMonitoramentoRequest' } } } },
        responses: { 200: { description: 'Monitoramento executado', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccess' } } } } },
      },
    },
  },
};

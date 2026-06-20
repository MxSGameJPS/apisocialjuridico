const ok = { description: 'Operação executada com sucesso.' };
const unauthorized = { description: 'Não autorizado.' };
const badRequest = { description: 'Dados inválidos.' };
const tooManyRequests = { description: 'Limite excedido.' };

function postEndpoint({ tag, summary, schema, required = true, commercial = false }) {
  return {
    post: {
      tags: [tag],
      summary,
      security: commercial ? [{ CommercialApiKeyAuth: [] }] : [{ ApiKeyAuth: [] }],
      requestBody: schema
        ? {
            required,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${schema}` },
              },
            },
          }
        : undefined,
      responses: {
        200: ok,
        400: badRequest,
        401: unauthorized,
        429: tooManyRequests,
      },
    },
  };
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Social Jurídico',
    version: '1.4.0',
    description: 'API processual com DataJud, DJEN, CRM, busca pública, entidades, dossiês, inteligência jurídica, monitoramento para plataformas, eventos e camada comercial com API keys, rate limit e logs.',
  },
  servers: [
    { url: 'https://n8n.socialjuridico.com.br', description: 'Produção temporária' },
    { url: 'http://localhost:3333', description: 'Desenvolvimento local' },
  ],
  tags: [
    { name: 'Sistema', description: 'Status e informações gerais.' },
    { name: 'Processos', description: 'Busca, importação, atualização e CRM.' },
    { name: 'Monitoramento', description: 'Monitoramento DataJud.' },
    { name: 'DJEN', description: 'Consulta, processamento e monitoramento de publicações DJEN.' },
    { name: 'Busca Pública', description: 'Busca pública, índice, ranking, OAB robusta e paginação.' },
    { name: 'Entidades', description: 'Extração e listagem de pessoas, empresas, órgãos e advogados.' },
    { name: 'Dossiê', description: 'Dossiês públicos por nome, documento ou entidade.' },
    { name: 'Inteligência Jurídica', description: 'Classificação, risco, recorrência e similaridade.' },
    { name: 'Alertas', description: 'Alertas monitoráveis.' },
    { name: 'Plataformas', description: 'Monitoramento OAB/CNJ e eventos para plataformas integradas.' },
    { name: 'Comercial Admin', description: 'Administração da API comercial.' },
    { name: 'API Comercial v1', description: 'Endpoints comerciais consumidos com x-commercial-api-key.' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
      CommercialApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-commercial-api-key' },
    },
    schemas: {
      GenericSuccess: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', additionalProperties: true } } },
      PessoaCRM: { type: 'object', properties: { nome: { type: 'string', example: 'Maria da Silva' }, tipo: { type: 'string', example: 'pessoa_fisica' }, documento: { type: 'string', nullable: true }, email: { type: 'string', nullable: true }, telefone: { type: 'string', nullable: true }, observacoes: { type: 'string', nullable: true } } },
      BuscarProcessoRequest: { type: 'object', required: ['numero_processo'], properties: { numero_processo: { type: 'string', example: '1003394-43.2024.8.26.0394' } } },
      BaixarProcessoRequest: { type: 'object', required: ['numero_processo', 'advogado_id'], properties: { numero_processo: { type: 'string', example: '10033944320248260394' }, advogado_id: { type: 'string', example: 'teste-advogado-001' }, usuario_id: { type: 'string', nullable: true }, cliente: { $ref: '#/components/schemas/PessoaCRM' }, parte_contraria: { $ref: '#/components/schemas/PessoaCRM' } } },
      ImportarLoteRequest: { type: 'object', required: ['advogado_id', 'processos'], properties: { advogado_id: { type: 'string' }, usuario_id: { type: 'string', nullable: true }, ignorar_duplicados: { type: 'boolean', example: true }, processos: { type: 'array', items: { type: 'string' }, example: ['10033944320248260394'] } } },
      AtualizarRequest: { type: 'object', required: ['numero_processo', 'advogado_id'], properties: { numero_processo: { type: 'string' }, advogado_id: { type: 'string' }, usuario_id: { type: 'string', nullable: true } } },
      AtualizarLoteRequest: { type: 'object', required: ['advogado_id', 'processos'], properties: { advogado_id: { type: 'string' }, usuario_id: { type: 'string', nullable: true }, processos: { type: 'array', items: { type: 'string' } } } },
      ExecutarMonitoramentoDataJudRequest: { type: 'object', properties: { advogado_id: { type: 'string', nullable: true }, limite: { type: 'integer', example: 25 } } },

      DjenMonitoramentoRequest: { type: 'object', required: ['advogado_id', 'oab', 'uf'], properties: { advogado_id: { type: 'string' }, usuario_id: { type: 'string', nullable: true }, oab: { type: 'string', example: '463170' }, uf: { type: 'string', example: 'SP' }, ativo: { type: 'boolean', example: true } } },
      DjenConsultarRequest: { type: 'object', required: ['oab', 'uf'], properties: { advogado_id: { type: 'string', nullable: true }, oab: { type: 'string', example: '463170' }, uf: { type: 'string', example: 'SP' }, data_inicio: { type: 'string', example: '2026-06-01' }, data_fim: { type: 'string', example: '2026-06-19' }, salvar: { type: 'boolean', example: true } } },
      DjenProcessarRequest: { type: 'object', required: ['advogado_id', 'oab', 'uf'], properties: { advogado_id: { type: 'string' }, usuario_id: { type: 'string', nullable: true }, oab: { type: 'string' }, uf: { type: 'string' }, importar_processos: { type: 'boolean', example: false }, limite: { type: 'integer', example: 50 } } },
      DjenMonitorarRequest: { type: 'object', properties: { limite_por_oab: { type: 'integer', example: 50 } } },

      FiltrosPublicos: { type: 'object', properties: { oab: { type: 'string', example: '463170' }, uf: { type: 'string', example: 'SP' }, numero_processo: { type: 'string', example: '1503393-51.2025.8.26.0269' }, numero_cnj: { type: 'string', example: '15033935120258260269' }, tribunal: { type: 'string', example: 'TJSP' }, nome_parte: { type: 'string', example: 'SABESP' }, nome_advogado: { type: 'string', example: 'IGOR GOMIDES' }, nome_orgao: { type: 'string' }, tipo_comunicacao: { type: 'string' }, tipo_documento: { type: 'string' }, data_inicio: { type: 'string' }, data_fim: { type: 'string' }, pagina: { type: 'integer', example: 1 }, itens_por_pagina: { type: 'integer', example: 20 }, parametros_extras: { type: 'object', additionalProperties: true } } },
      BuscaPublicaDjenRequest: { type: 'object', properties: { advogado_id: { type: 'string', nullable: true, example: 'publico' }, salvar: { type: 'boolean', example: true }, filtros: { $ref: '#/components/schemas/FiltrosPublicos' } } },
      EnriquecerBuscaRequest: { type: 'object', required: ['filtros'], properties: { salvar_busca: { type: 'boolean', example: true }, usar_datajud: { type: 'boolean', example: true }, limite: { type: 'integer', example: 5 }, filtros: { $ref: '#/components/schemas/FiltrosPublicos' } } },
      EnriquecerPendentesRequest: { type: 'object', properties: { usar_datajud: { type: 'boolean', example: true }, limite: { type: 'integer', example: 10 } } },
      BuscarIndiceRequest: { type: 'object', properties: { termo: { type: 'string', example: 'SABESP' }, numero_cnj: { type: 'string' }, tribunal: { type: 'string' }, limite: { type: 'integer', example: 20 } } },
      FullTextRequest: { type: 'object', properties: { termo: { type: 'string', nullable: true, example: 'SABESP' }, tribunal: { type: 'string', nullable: true, example: 'TJSP' }, classe: { type: 'string', nullable: true }, pagina: { type: 'integer', example: 1 }, por_pagina: { type: 'integer', example: 20 }, ordenar_por: { type: 'string', enum: ['relevancia', 'data'], example: 'relevancia' } } },
      OabRobustaRequest: { type: 'object', properties: { termo: { type: 'string', nullable: true, example: 'RS 140234' }, uf: { type: 'string', nullable: true, example: 'RS' }, oab: { type: 'string', nullable: true, example: '140234' }, limite_djen: { type: 'integer', example: 20 }, incluir_detalhes: { type: 'boolean', example: true }, limite_detalhes: { type: 'integer', example: 10 }, data_inicio: { type: 'string', nullable: true }, data_fim: { type: 'string', nullable: true } } },
      BuscarCpfCnpjRequest: { type: 'object', required: ['documento'], properties: { documento: { type: 'string', example: '537.012.468-07' }, buscar_djen: { type: 'boolean', example: false }, limite: { type: 'integer', example: 20 } } },
      BuscarNomeRequest: { type: 'object', required: ['nome'], properties: { nome: { type: 'string', example: 'SABESP' }, buscar_djen: { type: 'boolean', example: true }, limite: { type: 'integer', example: 20 } } },
      BuscarAdvogadoRequest: { type: 'object', properties: { nome: { type: 'string', nullable: true }, oab: { type: 'string', nullable: true, example: '463170' }, uf: { type: 'string', nullable: true, example: 'SP' }, buscar_djen: { type: 'boolean', example: true }, limite: { type: 'integer', example: 20 } } },
      TimelineRequest: { type: 'object', required: ['numero_cnj'], properties: { numero_cnj: { type: 'string', example: '15033935120258260269' }, atualizar_datajud: { type: 'boolean', example: false } } },
      CnjRequest: { type: 'object', required: ['numero_cnj'], properties: { numero_cnj: { type: 'string', example: '15033935120258260269' } } },
      CriarAlertaRequest: { type: 'object', required: ['tipo', 'valor'], properties: { tipo: { type: 'string', enum: ['nome', 'cpf_cnpj', 'advogado', 'oab', 'cnj', 'termo'], example: 'nome' }, valor: { type: 'string', example: 'SABESP' }, usuario_id: { type: 'string', nullable: true }, advogado_id: { type: 'string', nullable: true }, filtros: { type: 'object', additionalProperties: true, example: { tribunal: 'TJSP' } }, ativo: { type: 'boolean', example: true } } },
      ExecutarAlertasRequest: { type: 'object', properties: { limite_alertas: { type: 'integer', example: 25 }, limite_por_alerta: { type: 'integer', example: 10 } } },
      SimilaresRequest: { type: 'object', properties: { numero_cnj: { type: 'string', nullable: true }, texto: { type: 'string', nullable: true }, limite: { type: 'integer', example: 10 }, score_minimo: { type: 'number', example: 0.12 } } },
      ListarEntidadesRequest: { type: 'object', properties: { termo: { type: 'string', nullable: true, example: 'augusto' }, tipo: { type: 'string', nullable: true, example: 'pessoa_fisica' }, limite: { type: 'integer', example: 20 } } },
      DossieRequest: { type: 'object', properties: { id: { type: 'string', nullable: true }, documento: { type: 'string', nullable: true, example: '537.012.468-07' }, nome: { type: 'string', nullable: true, example: 'AUGUSTO SANTANA CRUZ CAMPOS' } } },
      RecorrenciaRequest: { type: 'object', properties: { termo: { type: 'string', nullable: true, example: 'SABESP' }, tribunal: { type: 'string', nullable: true, example: 'TJSP' }, classe: { type: 'string', nullable: true } } },

      CriarClienteComercialRequest: { type: 'object', required: ['nome', 'email'], properties: { nome: { type: 'string', example: 'Cliente API Teste' }, email: { type: 'string', example: 'cliente@empresa.com.br' }, documento: { type: 'string', nullable: true }, plano: { type: 'string', enum: ['free', 'start', 'pro', 'enterprise'], example: 'start' }, ativo: { type: 'boolean', example: true } } },
      CriarApiKeyComercialRequest: { type: 'object', required: ['cliente_id'], properties: { cliente_id: { type: 'string', format: 'uuid' }, nome: { type: 'string', example: 'Chave produção' }, plano: { type: 'string', enum: ['free', 'start', 'pro', 'enterprise'], nullable: true } } },
      AlterarStatusApiKeyRequest: { type: 'object', required: ['api_key_id', 'ativo'], properties: { api_key_id: { type: 'string', format: 'uuid' }, ativo: { type: 'boolean', example: false } } },
      UsoComercialRequest: { type: 'object', properties: { cliente_id: { type: 'string', format: 'uuid', nullable: true }, api_key_id: { type: 'string', format: 'uuid', nullable: true }, limite: { type: 'integer', example: 100 } } },
      CriarMonitoramentoPlataformaRequest: { type: 'object', required: ['tipo'], properties: { tipo: { type: 'string', enum: ['oab', 'cnj'], example: 'oab' }, valor: { type: 'string', nullable: true, example: 'RS 140234' }, termo: { type: 'string', nullable: true }, uf: { type: 'string', nullable: true, example: 'RS' }, oab: { type: 'string', nullable: true, example: '140234' }, numero_cnj: { type: 'string', nullable: true, example: '50336208020258210033' }, owner_ref: { type: 'string', nullable: true, example: 'social_juridico' }, plataforma_ref: { type: 'string', nullable: true, example: 'advogado_123' }, webhook_url: { type: 'string', nullable: true }, filtros: { type: 'object', additionalProperties: true }, frequencia_minutos: { type: 'integer', example: 360 }, ativo: { type: 'boolean', example: true } } },
      ListarMonitoramentosPlataformaRequest: { type: 'object', properties: { owner_ref: { type: 'string', nullable: true, example: 'social_juridico' }, ativo: { type: 'boolean', nullable: true }, limite: { type: 'integer', example: 100 } } },
      ExecutarMonitoramentosPlataformaRequest: { type: 'object', properties: { owner_ref: { type: 'string', nullable: true, example: 'social_juridico' }, monitoramento_id: { type: 'string', format: 'uuid', nullable: true }, limite_monitoramentos: { type: 'integer', example: 25 }, limite_por_monitoramento: { type: 'integer', example: 20 } } },
      ListarEventosPlataformaRequest: { type: 'object', properties: { owner_ref: { type: 'string', nullable: true, example: 'social_juridico' }, monitoramento_id: { type: 'string', format: 'uuid', nullable: true }, lido: { type: 'boolean', nullable: true }, limite: { type: 'integer', example: 100 } } },
      MarcarEventosLidosRequest: { type: 'object', required: ['ids'], properties: { owner_ref: { type: 'string', nullable: true, example: 'social_juridico' }, ids: { type: 'array', items: { type: 'string', format: 'uuid' } }, lido: { type: 'boolean', example: true } } },
    },
  },
  paths: {
    '/': { get: { tags: ['Sistema'], summary: 'Informações básicas da API', responses: { 200: ok } } },
    '/health': { get: { tags: ['Sistema'], summary: 'Status da API', responses: { 200: ok } } },

    '/api/processos/buscar': postEndpoint({ tag: 'Processos', summary: 'Buscar processo no DataJud para conferência', schema: 'BuscarProcessoRequest' }),
    '/api/processos/baixar': postEndpoint({ tag: 'Processos', summary: 'Baixar processo para o CRM', schema: 'BaixarProcessoRequest' }),
    '/api/processos/importar-lote': postEndpoint({ tag: 'Processos', summary: 'Importar processos em lote', schema: 'ImportarLoteRequest' }),
    '/api/processos/atualizar': postEndpoint({ tag: 'Processos', summary: 'Atualizar processo manualmente', schema: 'AtualizarRequest' }),
    '/api/processos/atualizar-lote': postEndpoint({ tag: 'Processos', summary: 'Atualizar processos em lote', schema: 'AtualizarLoteRequest' }),
    '/api/monitoramento/datajud/executar': postEndpoint({ tag: 'Monitoramento', summary: 'Executar monitoramento DataJud', schema: 'ExecutarMonitoramentoDataJudRequest', required: false }),

    '/api/djen/monitoramentos': postEndpoint({ tag: 'DJEN', summary: 'Cadastrar OAB para monitoramento DJEN', schema: 'DjenMonitoramentoRequest' }),
    '/api/djen/consultar': postEndpoint({ tag: 'DJEN', summary: 'Consultar DJEN por OAB/UF', schema: 'DjenConsultarRequest' }),
    '/api/djen/processar': postEndpoint({ tag: 'DJEN', summary: 'Processar publicações DJEN e opcionalmente importar processos', schema: 'DjenProcessarRequest' }),
    '/api/djen/monitorar': postEndpoint({ tag: 'DJEN', summary: 'Executar monitoramento DJEN', schema: 'DjenMonitorarRequest', required: false }),

    '/api/publico/djen/buscar': postEndpoint({ tag: 'Busca Pública', summary: 'Busca pública avançada DJEN', schema: 'BuscaPublicaDjenRequest' }),
    '/api/publico/processos/enriquecer-busca': postEndpoint({ tag: 'Busca Pública', summary: 'Buscar no DJEN e enriquecer com DataJud', schema: 'EnriquecerBuscaRequest' }),
    '/api/publico/processos/enriquecer-pendentes': postEndpoint({ tag: 'Busca Pública', summary: 'Enriquecer publicações DJEN já salvas', schema: 'EnriquecerPendentesRequest', required: false }),
    '/api/publico/processos/buscar-indice': postEndpoint({ tag: 'Busca Pública', summary: 'Buscar no índice público processual', schema: 'BuscarIndiceRequest', required: false }),
    '/api/publico/busca/full-text': postEndpoint({ tag: 'Busca Pública', summary: 'Busca full-text com ranking e paginação', schema: 'FullTextRequest', required: false }),
    '/api/publico/oab/processos': postEndpoint({ tag: 'Busca Pública', summary: 'Busca robusta por OAB com DJEN, CNJs, DataJud parcial e vínculo OAB ↔ parte', schema: 'OabRobustaRequest' }),
    '/api/publico/buscar/cpf-cnpj': postEndpoint({ tag: 'Busca Pública', summary: 'Buscar por CPF/CNPJ', schema: 'BuscarCpfCnpjRequest' }),
    '/api/publico/buscar/nome': postEndpoint({ tag: 'Busca Pública', summary: 'Buscar por nome de pessoa, parte ou empresa', schema: 'BuscarNomeRequest' }),
    '/api/publico/buscar/advogado': postEndpoint({ tag: 'Busca Pública', summary: 'Buscar por advogado, nome ou OAB', schema: 'BuscarAdvogadoRequest' }),
    '/api/publico/processos/timeline': postEndpoint({ tag: 'Busca Pública', summary: 'Gerar timeline processual', schema: 'TimelineRequest' }),
    '/api/publico/processos/documentos-extraidos': postEndpoint({ tag: 'Entidades', summary: 'Extrair documentos do texto indexado', schema: 'CnjRequest' }),
    '/api/publico/alertas': postEndpoint({ tag: 'Alertas', summary: 'Criar alerta público monitorável', schema: 'CriarAlertaRequest' }),
    '/api/publico/alertas/executar': postEndpoint({ tag: 'Alertas', summary: 'Executar alertas públicos', schema: 'ExecutarAlertasRequest', required: false }),
    '/api/publico/processos/similares': postEndpoint({ tag: 'Inteligência Jurídica', summary: 'Encontrar processos similares', schema: 'SimilaresRequest', required: false }),
    '/api/publico/entidades/extrair': postEndpoint({ tag: 'Entidades', summary: 'Extrair entidades públicas de um processo', schema: 'CnjRequest' }),
    '/api/publico/entidades/listar': postEndpoint({ tag: 'Entidades', summary: 'Listar entidades públicas', schema: 'ListarEntidadesRequest', required: false }),
    '/api/publico/dossie': postEndpoint({ tag: 'Dossiê', summary: 'Gerar dossiê público por documento, nome ou entidade', schema: 'DossieRequest', required: false }),
    '/api/publico/inteligencia/analisar-processo': postEndpoint({ tag: 'Inteligência Jurídica', summary: 'Analisar processo com heurísticas jurídicas', schema: 'CnjRequest' }),
    '/api/publico/inteligencia/recorrencia': postEndpoint({ tag: 'Inteligência Jurídica', summary: 'Gerar estatísticas de recorrência', schema: 'RecorrenciaRequest', required: false }),

    '/api/plataformas/monitoramentos': postEndpoint({ tag: 'Plataformas', summary: 'Criar monitoramento interno OAB/CNJ para plataforma', schema: 'CriarMonitoramentoPlataformaRequest' }),
    '/api/plataformas/monitoramentos/listar': postEndpoint({ tag: 'Plataformas', summary: 'Listar monitoramentos internos de plataforma', schema: 'ListarMonitoramentosPlataformaRequest', required: false }),
    '/api/plataformas/monitoramentos/executar': postEndpoint({ tag: 'Plataformas', summary: 'Executar monitoramentos internos OAB/CNJ', schema: 'ExecutarMonitoramentosPlataformaRequest', required: false }),
    '/api/plataformas/eventos': postEndpoint({ tag: 'Plataformas', summary: 'Listar eventos internos gerados por monitoramentos', schema: 'ListarEventosPlataformaRequest', required: false }),
    '/api/plataformas/eventos/marcar-lido': postEndpoint({ tag: 'Plataformas', summary: 'Marcar eventos internos como lidos/não lidos', schema: 'MarcarEventosLidosRequest' }),

    '/api/comercial/planos': { get: { tags: ['Comercial Admin'], summary: 'Listar planos comerciais', security: [{ ApiKeyAuth: [] }], responses: { 200: ok, 401: unauthorized } } },
    '/api/comercial/clientes': postEndpoint({ tag: 'Comercial Admin', summary: 'Criar cliente comercial', schema: 'CriarClienteComercialRequest' }),
    '/api/comercial/api-keys': postEndpoint({ tag: 'Comercial Admin', summary: 'Criar API key comercial', schema: 'CriarApiKeyComercialRequest' }),
    '/api/comercial/api-keys/status': postEndpoint({ tag: 'Comercial Admin', summary: 'Ativar ou bloquear API key comercial', schema: 'AlterarStatusApiKeyRequest' }),
    '/api/comercial/uso': postEndpoint({ tag: 'Comercial Admin', summary: 'Listar logs de uso comercial', schema: 'UsoComercialRequest', required: false }),

    '/api/v1/busca/processos': postEndpoint({ tag: 'API Comercial v1', summary: 'Busca comercial de processos', schema: 'FullTextRequest', commercial: true, required: false }),
    '/api/v1/oab/processos': postEndpoint({ tag: 'API Comercial v1', summary: 'Busca comercial robusta por OAB', schema: 'OabRobustaRequest', commercial: true, required: false }),
    '/api/v1/monitoramentos': postEndpoint({ tag: 'API Comercial v1', summary: 'Criar/atualizar monitoramento OAB ou CNJ', schema: 'CriarMonitoramentoPlataformaRequest', commercial: true }),
    '/api/v1/monitoramentos/listar': postEndpoint({ tag: 'API Comercial v1', summary: 'Listar monitoramentos do cliente da API key', schema: 'ListarMonitoramentosPlataformaRequest', commercial: true, required: false }),
    '/api/v1/monitoramentos/executar': postEndpoint({ tag: 'API Comercial v1', summary: 'Executar monitoramentos do cliente da API key', schema: 'ExecutarMonitoramentosPlataformaRequest', commercial: true, required: false }),
    '/api/v1/eventos': postEndpoint({ tag: 'API Comercial v1', summary: 'Listar eventos de monitoramento do cliente da API key', schema: 'ListarEventosPlataformaRequest', commercial: true, required: false }),
    '/api/v1/eventos/marcar-lido': postEndpoint({ tag: 'API Comercial v1', summary: 'Marcar eventos como lidos/não lidos', schema: 'MarcarEventosLidosRequest', commercial: true }),
    '/api/v1/dossie': postEndpoint({ tag: 'API Comercial v1', summary: 'Dossiê comercial', schema: 'DossieRequest', commercial: true, required: false }),
    '/api/v1/processos/timeline': postEndpoint({ tag: 'API Comercial v1', summary: 'Timeline comercial de processo', schema: 'TimelineRequest', commercial: true }),
  },
};

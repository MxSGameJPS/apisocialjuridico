const ok = { description: 'Operação executada com sucesso.' };
const unauthorized = { description: 'Não autorizado.' };
const badRequest = { description: 'Dados inválidos.' };

function postEndpoint({ tag, summary, schema, required = true }) {
  return {
    post: {
      tags: [tag],
      summary,
      security: [{ ApiKeyAuth: [] }],
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
      },
    },
  };
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Social Jurídico',
    version: '0.9.0',
    description: 'API processual com DataJud, DJEN, CRM, busca pública, entidades, dossiês, inteligência jurídica, alertas, similaridades, ranking e paginação.',
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
    { name: 'Busca Pública', description: 'Busca pública, índice, ranking e paginação.' },
    { name: 'Entidades', description: 'Extração e listagem de pessoas, empresas, órgãos e advogados.' },
    { name: 'Dossiê', description: 'Dossiês públicos por nome, documento ou entidade.' },
    { name: 'Inteligência Jurídica', description: 'Classificação, risco, recorrência e similaridade.' },
    { name: 'Alertas', description: 'Alertas monitoráveis.' },
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
      PessoaCRM: {
        type: 'object',
        properties: {
          nome: { type: 'string', example: 'Maria da Silva' },
          tipo: { type: 'string', example: 'pessoa_fisica' },
          documento: { type: 'string', nullable: true, example: '000.000.000-00' },
          email: { type: 'string', nullable: true },
          telefone: { type: 'string', nullable: true },
          observacoes: { type: 'string', nullable: true },
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
          usuario_id: { type: 'string', nullable: true },
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
          usuario_id: { type: 'string', nullable: true },
        },
      },
      AtualizarLoteRequest: {
        type: 'object',
        required: ['advogado_id', 'processos'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true },
          processos: { type: 'array', items: { type: 'string' }, example: ['10033944320248260394'] },
        },
      },
      ExecutarMonitoramentoDataJudRequest: {
        type: 'object',
        properties: {
          advogado_id: { type: 'string', nullable: true },
          limite: { type: 'integer', example: 25 },
        },
      },
      DjenMonitoramentoRequest: {
        type: 'object',
        required: ['advogado_id', 'oab', 'uf'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true },
          oab: { type: 'string', example: '463170' },
          uf: { type: 'string', example: 'SP' },
          ativo: { type: 'boolean', example: true },
        },
      },
      DjenConsultarRequest: {
        type: 'object',
        required: ['oab', 'uf'],
        properties: {
          advogado_id: { type: 'string', nullable: true },
          oab: { type: 'string', example: '463170' },
          uf: { type: 'string', example: 'SP' },
          data_inicio: { type: 'string', example: '2026-06-01' },
          data_fim: { type: 'string', example: '2026-06-19' },
          salvar: { type: 'boolean', example: true },
        },
      },
      DjenProcessarRequest: {
        type: 'object',
        required: ['advogado_id', 'oab', 'uf'],
        properties: {
          advogado_id: { type: 'string', example: 'teste-advogado-001' },
          usuario_id: { type: 'string', nullable: true },
          oab: { type: 'string', example: '463170' },
          uf: { type: 'string', example: 'SP' },
          importar_processos: { type: 'boolean', example: false },
          limite: { type: 'integer', example: 50 },
        },
      },
      DjenMonitorarRequest: {
        type: 'object',
        properties: { limite_por_oab: { type: 'integer', example: 50 } },
      },
      FiltrosPublicos: {
        type: 'object',
        properties: {
          oab: { type: 'string', example: '463170' },
          uf: { type: 'string', example: 'SP' },
          numero_processo: { type: 'string', example: '1503393-51.2025.8.26.0269' },
          numero_cnj: { type: 'string', example: '15033935120258260269' },
          tribunal: { type: 'string', example: 'TJSP' },
          nome_parte: { type: 'string', example: 'SABESP' },
          nome_advogado: { type: 'string', example: 'IGOR GOMIDES' },
          nome_orgao: { type: 'string', example: '1ª Vara Criminal - Itapetininga' },
          tipo_comunicacao: { type: 'string', example: 'Intimação' },
          tipo_documento: { type: 'string', example: 'Edital' },
          data_inicio: { type: 'string', example: '2026-06-01' },
          data_fim: { type: 'string', example: '2026-06-19' },
          pagina: { type: 'integer', example: 1 },
          itens_por_pagina: { type: 'integer', example: 20 },
          parametros_extras: { type: 'object', additionalProperties: true },
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
        required: ['filtros'],
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
      BuscarCpfCnpjRequest: {
        type: 'object',
        required: ['documento'],
        properties: {
          documento: { type: 'string', example: '537.012.468-07' },
          buscar_djen: { type: 'boolean', example: false },
          limite: { type: 'integer', example: 20 },
        },
      },
      BuscarNomeRequest: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: { type: 'string', example: 'SABESP' },
          buscar_djen: { type: 'boolean', example: true },
          limite: { type: 'integer', example: 20 },
        },
      },
      BuscarAdvogadoRequest: {
        type: 'object',
        properties: {
          nome: { type: 'string', nullable: true, example: 'IGOR GOMIDES BALMANTE' },
          oab: { type: 'string', nullable: true, example: '463170' },
          uf: { type: 'string', nullable: true, example: 'SP' },
          buscar_djen: { type: 'boolean', example: true },
          limite: { type: 'integer', example: 20 },
        },
      },
      TimelineRequest: {
        type: 'object',
        required: ['numero_cnj'],
        properties: {
          numero_cnj: { type: 'string', example: '15033935120258260269' },
          atualizar_datajud: { type: 'boolean', example: false },
        },
      },
      CriarAlertaRequest: {
        type: 'object',
        required: ['tipo', 'valor'],
        properties: {
          tipo: { type: 'string', enum: ['nome', 'cpf_cnpj', 'advogado', 'oab', 'cnj', 'termo'], example: 'nome' },
          valor: { type: 'string', example: 'SABESP' },
          usuario_id: { type: 'string', nullable: true },
          advogado_id: { type: 'string', nullable: true },
          filtros: { type: 'object', additionalProperties: true, example: { tribunal: 'TJSP' } },
          ativo: { type: 'boolean', example: true },
        },
      },
      ExecutarAlertasRequest: {
        type: 'object',
        properties: {
          limite_alertas: { type: 'integer', example: 25 },
          limite_por_alerta: { type: 'integer', example: 10 },
        },
      },
      SimilaresRequest: {
        type: 'object',
        properties: {
          numero_cnj: { type: 'string', nullable: true, example: '15033935120258260269' },
          texto: { type: 'string', nullable: true, example: 'procedimento comum cível sabesp' },
          limite: { type: 'integer', example: 10 },
          score_minimo: { type: 'number', example: 0.12 },
        },
      },
      CnjRequest: {
        type: 'object',
        required: ['numero_cnj'],
        properties: { numero_cnj: { type: 'string', example: '15033935120258260269' } },
      },
      ListarEntidadesRequest: {
        type: 'object',
        properties: {
          termo: { type: 'string', nullable: true, example: 'augusto' },
          tipo: { type: 'string', nullable: true, example: 'pessoa_fisica' },
          limite: { type: 'integer', example: 20 },
        },
      },
      DossieRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', nullable: true },
          documento: { type: 'string', nullable: true, example: '537.012.468-07' },
          nome: { type: 'string', nullable: true, example: 'AUGUSTO SANTANA CRUZ CAMPOS' },
        },
      },
      RecorrenciaRequest: {
        type: 'object',
        properties: {
          termo: { type: 'string', nullable: true, example: 'SABESP' },
          tribunal: { type: 'string', nullable: true, example: 'TJSP' },
          classe: { type: 'string', nullable: true, example: 'PROCEDIMENTO COMUM CÍVEL' },
        },
      },
      FullTextRequest: {
        type: 'object',
        properties: {
          termo: { type: 'string', nullable: true, example: 'SABESP' },
          tribunal: { type: 'string', nullable: true, example: 'TJSP' },
          classe: { type: 'string', nullable: true },
          pagina: { type: 'integer', example: 1 },
          por_pagina: { type: 'integer', example: 20 },
          ordenar_por: { type: 'string', enum: ['relevancia', 'data'], example: 'relevancia' },
        },
      },
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
  },
};

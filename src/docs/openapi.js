export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Social Jurídico',
    version: '0.1.0',
    description:
      'API interna do Social Jurídico para busca, conferência, importação e futuro monitoramento de processos judiciais via DataJud/CNJ, com resumo por IA.',
  },
  servers: [
    { url: 'https://n8n.socialjuridico.com.br', description: 'Produção temporária' },
    { url: 'http://localhost:3333', description: 'Desenvolvimento local' },
  ],
  tags: [
    { name: 'Sistema', description: 'Rotas de status e informações gerais da API.' },
    { name: 'Processos', description: 'Busca e importação de processos judiciais para o CRM.' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Chave interna da API definida em API_SECRET_KEY.',
      },
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
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          service: { type: 'string', example: 'apisocialjuridico' },
          status: { type: 'string', example: 'online' },
          timestamp: { type: 'string', format: 'date-time', example: '2026-06-19T11:06:53.223Z' },
        },
      },
      BuscarProcessoRequest: {
        type: 'object',
        required: ['numero_processo'],
        properties: {
          numero_processo: {
            type: 'string',
            description: 'Número CNJ do processo, com ou sem máscara.',
            example: '1003394-43.2024.8.26.0394',
          },
        },
      },
      PessoaCRM: {
        type: 'object',
        nullable: true,
        description:
          'Dados manuais informados pelo advogado quando o DataJud não retornar as partes ou quando for necessário vincular o processo ao cliente correto do CRM.',
        properties: {
          nome: { type: 'string', nullable: true, example: 'Maria da Silva' },
          tipo: {
            type: 'string',
            nullable: true,
            enum: ['pessoa_fisica', 'pessoa_juridica', 'nao_informado'],
            example: 'pessoa_fisica',
          },
          documento: { type: 'string', nullable: true, example: '000.000.000-00' },
          email: { type: 'string', nullable: true, example: 'cliente@email.com' },
          telefone: { type: 'string', nullable: true, example: '(11) 99999-9999' },
          observacoes: { type: 'string', nullable: true, example: 'Cliente informado manualmente pelo advogado.' },
        },
      },
      BaixarProcessoRequest: {
        type: 'object',
        required: ['numero_processo', 'advogado_id'],
        properties: {
          numero_processo: {
            type: 'string',
            description: 'Número CNJ do processo, com ou sem máscara.',
            example: '10033944320248260394',
          },
          advogado_id: { type: 'string', description: 'ID do advogado no Social Jurídico.', example: 'teste-advogado-001' },
          usuario_id: {
            type: 'string',
            nullable: true,
            description: 'ID opcional do usuário que solicitou a importação.',
            example: 'teste-usuario-001',
          },
          cliente: { $ref: '#/components/schemas/PessoaCRM' },
          parte_contraria: { $ref: '#/components/schemas/PessoaCRM' },
        },
        example: {
          numero_processo: '10033944320248260394',
          advogado_id: 'teste-advogado-001',
          usuario_id: 'teste-usuario-001',
          cliente: {
            nome: 'Maria da Silva',
            tipo: 'pessoa_fisica',
            documento: '000.000.000-00',
            email: 'cliente@email.com',
            telefone: '(11) 99999-9999',
          },
          parte_contraria: {
            nome: 'Empresa Exemplo Ltda',
            tipo: 'pessoa_juridica',
            documento: '00.000.000/0001-00',
          },
        },
      },
      Tribunal: {
        type: 'object',
        properties: {
          codigo: { type: 'string', example: 'TJSP' },
          nome: { type: 'string', example: 'Tribunal de Justiça de São Paulo' },
          alias_datajud: { type: 'string', example: 'tjsp' },
        },
      },
      Assunto: {
        type: 'object',
        properties: {
          codigo: { type: 'integer', nullable: true, example: 7681 },
          nome: { type: 'string', nullable: true, example: 'Obrigações' },
        },
      },
      CapaProcesso: {
        type: 'object',
        properties: {
          classe: { type: 'string', nullable: true, example: 'Execução de Título Extrajudicial' },
          classe_codigo: { type: 'integer', nullable: true, example: 12154 },
          area: { type: 'string', nullable: true, example: null },
          grau: { type: 'string', nullable: true, example: 'G1' },
          sistema: { type: 'string', nullable: true, example: 'SAJ' },
          formato: { type: 'string', nullable: true, example: 'Eletrônico' },
          orgao_julgador: { type: 'string', nullable: true, example: '02 CUMULATIVA DE NOVA ODESSA' },
          orgao_julgador_codigo: { type: 'integer', nullable: true, example: 16912 },
          data_ajuizamento: { type: 'string', nullable: true, example: '20241213101202' },
          data_ultima_atualizacao: { type: 'string', nullable: true, example: '2026-05-08T21:32:08.282000Z' },
          nivel_sigilo: { type: 'integer', nullable: true, example: 0 },
          assuntos: { type: 'array', items: { $ref: '#/components/schemas/Assunto' } },
        },
      },
      AdvogadoParte: {
        type: 'object',
        properties: {
          nome: { type: 'string', nullable: true, example: 'Nome do advogado' },
          oab: { type: 'string', nullable: true, example: '123456' },
          ufOab: { type: 'string', nullable: true, example: 'SP' },
        },
      },
      ParteProcesso: {
        type: 'object',
        nullable: true,
        properties: {
          nome: { type: 'string', nullable: true, example: 'Nome da parte' },
          tipo: { type: 'string', nullable: true, example: 'Autor' },
          documento: { type: 'string', nullable: true, example: null },
          advogados: { type: 'array', items: { $ref: '#/components/schemas/AdvogadoParte' } },
        },
      },
      Movimentacao: {
        type: 'object',
        properties: {
          data: { type: 'string', nullable: true, example: '2026-04-01T01:00:01.000Z' },
          nome: { type: 'string', nullable: true, example: 'Publicação' },
          codigo: { type: 'integer', nullable: true, example: 92 },
          complemento: { type: 'array', nullable: true, items: { type: 'object', additionalProperties: true } },
          raw: { type: 'object', additionalProperties: true, description: 'Movimentação original retornada pelo DataJud.' },
        },
      },
      ProcessoNormalizado: {
        type: 'object',
        properties: {
          numero_cnj: { type: 'string', example: '10033944320248260394' },
          tribunal: { $ref: '#/components/schemas/Tribunal' },
          capa: { $ref: '#/components/schemas/CapaProcesso' },
          parte_principal: { $ref: '#/components/schemas/ParteProcesso' },
          demais_partes: { type: 'array', items: { $ref: '#/components/schemas/ParteProcesso' } },
          partes: { type: 'array', items: { $ref: '#/components/schemas/ParteProcesso' } },
          cliente_manual: { $ref: '#/components/schemas/PessoaCRM' },
          parte_contraria_manual: { $ref: '#/components/schemas/PessoaCRM' },
          ultimas_movimentacoes: { type: 'array', items: { $ref: '#/components/schemas/Movimentacao' } },
          raw: { type: 'object', additionalProperties: true, description: 'Processo bruto retornado pelo DataJud.' },
          avisos: {
            type: 'array',
            items: { type: 'string' },
            example: ['O DataJud pode não retornar nomes das partes para todos os tribunais/processos.'],
          },
          resumo_ia: {
            type: 'string',
            example:
              'Processo em trâmite no TJSP, classe Execução de Título Extrajudicial. Resumo baseado nas movimentações públicas disponíveis.',
          },
          resumo_ia_gerado: { type: 'boolean', example: true },
        },
      },
      BuscarProcessoResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Processo encontrado para conferência.' },
          data: { $ref: '#/components/schemas/ProcessoNormalizado' },
        },
      },
      BaixarProcessoResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Processo baixado e salvo no CRM com sucesso.' },
          data: {
            type: 'object',
            properties: {
              processo: { $ref: '#/components/schemas/ProcessoNormalizado' },
              registro: {
                type: 'object',
                additionalProperties: true,
                description: 'Registro salvo na tabela processos_importados do Supabase, incluindo cliente_manual e parte_contraria_manual quando informados.',
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['Sistema'],
        summary: 'Informações básicas da API',
        responses: { 200: { description: 'Informações da API.' } },
      },
    },
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Status da API',
        responses: {
          200: {
            description: 'API online.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
        },
      },
    },
    '/api/processos/buscar': {
      post: {
        tags: ['Processos'],
        summary: 'Buscar processo para conferência',
        description:
          'Consulta o processo no DataJud pelo número CNJ, normaliza os dados e retorna capa, partes quando disponíveis, últimas movimentações e resumo por IA. Essa rota não salva no CRM.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscarProcessoRequest' } } },
        },
        responses: {
          200: {
            description: 'Processo encontrado para conferência.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/BuscarProcessoResponse' } } },
          },
          400: { description: 'Payload inválido ou número CNJ inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Processo não encontrado no DataJud.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/processos/baixar': {
      post: {
        tags: ['Processos'],
        summary: 'Baixar processo para o CRM',
        description:
          'Consulta o processo no DataJud, gera o resumo por IA e salva o registro na tabela processos_importados do Supabase. Aceita cliente e parte_contraria informados manualmente para vinculação correta no CRM quando o DataJud não retornar as partes.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BaixarProcessoRequest' } } },
        },
        responses: {
          200: {
            description: 'Processo salvo com sucesso no CRM.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/BaixarProcessoResponse' } } },
          },
          400: { description: 'Payload inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          500: { description: 'Erro ao consultar DataJud, gerar resumo ou salvar no Supabase.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
};

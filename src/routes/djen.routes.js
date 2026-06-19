import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  buscarPublicacoesDjenAvancado,
  cadastrarMonitoramentoOab,
  consultarDjenPorOab,
  executarMonitoramentoDjen,
  processarPublicacoesDjen,
} from '../modules/djen/djenService.js';

const monitoramentoOabSchema = z.object({
  advogado_id: z.string().min(1, 'advogado_id é obrigatório'),
  usuario_id: z.string().optional().nullable(),
  oab: z.string().min(1, 'oab é obrigatória'),
  uf: z.string().min(2, 'uf é obrigatória'),
  ativo: z.boolean().optional().default(true),
});

const consultarDjenSchema = z.object({
  advogado_id: z.string().optional().nullable(),
  oab: z.string().min(1, 'oab é obrigatória'),
  uf: z.string().min(2, 'uf é obrigatória'),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
  itens_por_pagina: z.coerce.number().int().min(1).max(100).optional(),
  salvar: z.boolean().optional().default(true),
});

const buscaPublicaSchema = z.object({
  advogado_id: z.string().optional().nullable(),
  salvar: z.boolean().optional().default(true),
  filtros: z.object({
    oab: z.string().optional().nullable(),
    numero_oab: z.string().optional().nullable(),
    uf: z.string().optional().nullable(),
    uf_oab: z.string().optional().nullable(),
    numero_processo: z.string().optional().nullable(),
    numero_cnj: z.string().optional().nullable(),
    processo: z.string().optional().nullable(),
    tribunal: z.string().optional().nullable(),
    sigla_tribunal: z.string().optional().nullable(),
    nome_parte: z.string().optional().nullable(),
    parte: z.string().optional().nullable(),
    nome_destinatario: z.string().optional().nullable(),
    nome_advogado: z.string().optional().nullable(),
    advogado: z.string().optional().nullable(),
    nome_orgao: z.string().optional().nullable(),
    orgao: z.string().optional().nullable(),
    tipo_comunicacao: z.string().optional().nullable(),
    tipo_documento: z.string().optional().nullable(),
    data_inicio: z.string().optional().nullable(),
    data_fim: z.string().optional().nullable(),
    data_disponibilizacao_inicio: z.string().optional().nullable(),
    data_disponibilizacao_fim: z.string().optional().nullable(),
    pagina: z.coerce.number().int().min(1).optional().default(1),
    itens_por_pagina: z.coerce.number().int().min(1).max(100).optional(),
    parametros_extras: z.record(z.any()).optional(),
  }).passthrough(),
});

const processarDjenSchema = z.object({
  advogado_id: z.string().min(1, 'advogado_id é obrigatório'),
  usuario_id: z.string().optional().nullable(),
  oab: z.string().min(1, 'oab é obrigatória'),
  uf: z.string().min(2, 'uf é obrigatória'),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  importar_processos: z.boolean().optional().default(false),
  limite: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const executarMonitoramentoSchema = z.object({
  limite_por_oab: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export async function djenRoutes(app) {
  app.post('/api/publico/djen/buscar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = buscaPublicaSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await buscarPublicacoesDjenAvancado({
      filtros: parsed.data.filtros,
      salvar: parsed.data.salvar,
      advogadoId: parsed.data.advogado_id || 'publico',
    });

    return {
      success: true,
      message: 'Busca pública DJEN executada com sucesso.',
      data: resultado,
    };
  });

  app.post('/api/djen/monitoramentos', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = monitoramentoOabSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const registro = await cadastrarMonitoramentoOab({
      advogadoId: parsed.data.advogado_id,
      usuarioId: parsed.data.usuario_id,
      oab: parsed.data.oab,
      uf: parsed.data.uf,
      ativo: parsed.data.ativo,
    });

    return {
      success: true,
      message: 'Monitoramento de OAB salvo com sucesso.',
      data: registro,
    };
  });

  app.post('/api/djen/consultar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = consultarDjenSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await consultarDjenPorOab({
      advogadoId: parsed.data.advogado_id,
      oab: parsed.data.oab,
      uf: parsed.data.uf,
      dataInicio: parsed.data.data_inicio,
      dataFim: parsed.data.data_fim,
      pagina: parsed.data.pagina,
      itensPorPagina: parsed.data.itens_por_pagina,
      salvar: parsed.data.salvar,
    });

    return {
      success: true,
      message: 'Consulta DJEN executada com sucesso.',
      data: resultado,
    };
  });

  app.post('/api/djen/processar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = processarDjenSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await processarPublicacoesDjen({
      advogadoId: parsed.data.advogado_id,
      usuarioId: parsed.data.usuario_id,
      oab: parsed.data.oab,
      uf: parsed.data.uf,
      dataInicio: parsed.data.data_inicio,
      dataFim: parsed.data.data_fim,
      importarProcessos: parsed.data.importar_processos,
      limite: parsed.data.limite,
    });

    return {
      success: true,
      message: 'Publicações DJEN processadas com sucesso.',
      data: resultado,
    };
  });

  app.post('/api/djen/monitorar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = executarMonitoramentoSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await executarMonitoramentoDjen({
      limitePorOab: parsed.data.limite_por_oab,
    });

    return {
      success: true,
      message: 'Monitoramento DJEN executado com sucesso.',
      data: resultado,
    };
  });
}

import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
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

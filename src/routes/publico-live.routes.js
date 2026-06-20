import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { buscaVivaProcessual } from '../modules/publico/buscaVivaService.js';
import { buscarProcessosPorOabRobusto } from '../modules/publico/oabRobustaService.js';

const buscaVivaSchema = z.object({
  termo: z.string().min(2),
  tribunal: z.string().optional().nullable(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
  por_pagina: z.coerce.number().int().min(1).max(50).optional().default(10),
  enriquecer: z.boolean().optional().default(true),
  limite_djen: z.coerce.number().int().min(1).max(30).optional().default(10),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
});

const oabRobustaSchema = z.object({
  termo: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  limite_djen: z.coerce.number().int().min(1).max(30).optional().default(20),
  incluir_detalhes: z.boolean().optional().default(true),
  limite_detalhes: z.coerce.number().int().min(0).max(15).optional().default(10),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
});

export async function publicoLiveRoutes(app) {
  app.post('/api/publico/busca/viva', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = buscaVivaSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await buscaVivaProcessual({
      termo: parsed.data.termo,
      tribunal: parsed.data.tribunal,
      pagina: parsed.data.pagina,
      porPagina: parsed.data.por_pagina,
      enriquecer: parsed.data.enriquecer,
      limiteDjen: parsed.data.limite_djen,
      dataInicio: parsed.data.data_inicio,
      dataFim: parsed.data.data_fim,
    });

    return {
      success: true,
      message: 'Busca viva executada com sucesso.',
      data,
    };
  });

  app.post('/api/publico/oab/processos', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = oabRobustaSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const data = await buscarProcessosPorOabRobusto({
        termo: parsed.data.termo,
        uf: parsed.data.uf,
        oab: parsed.data.oab,
        limiteDjen: parsed.data.limite_djen,
        incluirDetalhes: parsed.data.incluir_detalhes,
        limiteDetalhes: parsed.data.limite_detalhes,
        dataInicio: parsed.data.data_inicio,
        dataFim: parsed.data.data_fim,
      });

      return {
        success: true,
        message: 'Busca robusta por OAB executada com sucesso.',
        data,
      };
    } catch (error) {
      return reply.code(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro ao buscar processos por OAB.',
      });
    }
  });
}

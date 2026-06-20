import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { buscarProcessosFullText } from '../modules/publico/buscaFullTextService.js';

const buscaSchema = z.object({
  termo: z.string().optional().nullable(),
  tribunal: z.string().optional().nullable(),
  classe: z.string().optional().nullable(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
  por_pagina: z.coerce.number().int().min(1).max(100).optional().default(20),
  ordenar_por: z.enum(['relevancia', 'data']).optional().default('relevancia'),
});

export async function publicoFase10Routes(app) {
  app.post('/api/publico/busca/full-text', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = buscaSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await buscarProcessosFullText({
      termo: parsed.data.termo,
      tribunal: parsed.data.tribunal,
      classe: parsed.data.classe,
      pagina: parsed.data.pagina,
      porPagina: parsed.data.por_pagina,
      ordenarPor: parsed.data.ordenar_por,
    });

    return {
      success: true,
      message: 'Busca full-text executada com sucesso.',
      data,
    };
  });
}

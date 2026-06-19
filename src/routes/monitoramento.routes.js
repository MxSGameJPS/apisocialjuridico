import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { executarMonitoramentoDatajud } from '../modules/monitoramento/monitoramentoDatajudService.js';

const executarMonitoramentoSchema = z.object({
  advogado_id: z.string().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export async function monitoramentoRoutes(app) {
  app.post('/api/monitoramento/datajud/executar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = executarMonitoramentoSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await executarMonitoramentoDatajud({
      advogadoId: parsed.data.advogado_id,
      limite: parsed.data.limite,
    });

    return {
      success: true,
      message: 'Monitoramento DataJud executado com sucesso.',
      data: resultado,
    };
  });
}

import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  baixarProcessoParaCRM,
  buscarProcessoPorNumero,
} from '../modules/processos/processoService.js';

const buscarProcessoSchema = z.object({
  numero_processo: z.string().min(1, 'numero_processo é obrigatório'),
});

const baixarProcessoSchema = z.object({
  numero_processo: z.string().min(1, 'numero_processo é obrigatório'),
  advogado_id: z.string().min(1, 'advogado_id é obrigatório'),
  usuario_id: z.string().optional().nullable(),
});

export async function processosRoutes(app) {
  app.post('/api/processos/buscar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = buscarProcessoSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const processo = await buscarProcessoPorNumero(parsed.data.numero_processo);

    return {
      success: true,
      message: 'Processo encontrado para conferência.',
      data: processo,
    };
  });

  app.post('/api/processos/baixar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = baixarProcessoSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await baixarProcessoParaCRM({
      numeroProcesso: parsed.data.numero_processo,
      advogadoId: parsed.data.advogado_id,
      usuarioId: parsed.data.usuario_id,
    });

    return {
      success: true,
      message: 'Processo baixado e salvo no CRM com sucesso.',
      data: resultado,
    };
  });
}

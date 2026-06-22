import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  baixarProcessoParaCRM,
  buscarProcessoPorNumero,
} from '../modules/processos/processoService.js';

const buscarProcessoSchema = z.object({
  numero_processo: z.string().min(1, 'numero_processo é obrigatório'),
  advogado_id: z.string().optional().nullable(),
  gerar_resumo: z.boolean().optional().default(false),
  forcar_resumo: z.boolean().optional().default(false),
});

const pessoaCRMSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório').optional().nullable(),
  tipo: z.enum(['pessoa_fisica', 'pessoa_juridica', 'nao_informado']).optional().nullable(),
  documento: z.string().optional().nullable(),
  email: z.string().email('email inválido').optional().nullable(),
  telefone: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
}).optional().nullable();

const baixarProcessoSchema = z.object({
  numero_processo: z.string().min(1, 'numero_processo é obrigatório'),
  advogado_id: z.string().min(1, 'advogado_id é obrigatório'),
  usuario_id: z.string().optional().nullable(),
  cliente: pessoaCRMSchema,
  parte_contraria: pessoaCRMSchema,
  gerar_resumo: z.boolean().optional().default(false),
  forcar_resumo: z.boolean().optional().default(false),
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

    const processo = await buscarProcessoPorNumero(parsed.data.numero_processo, {
      advogadoId: parsed.data.advogado_id,
      gerarResumo: parsed.data.gerar_resumo,
      forcarResumo: parsed.data.forcar_resumo,
    });

    return {
      success: true,
      message: parsed.data.gerar_resumo
        ? 'Processo encontrado para conferência com resumo solicitado.'
        : 'Processo encontrado para conferência sem gerar novo resumo.',
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
      cliente: parsed.data.cliente,
      parteContraria: parsed.data.parte_contraria,
      gerarResumo: parsed.data.gerar_resumo,
      forcarResumo: parsed.data.forcar_resumo,
    });

    return {
      success: true,
      message: parsed.data.gerar_resumo
        ? 'Processo baixado e salvo no CRM com resumo.'
        : 'Processo baixado e salvo no CRM sem gerar novo resumo.',
      data: resultado,
    };
  });
}

import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  baixarProcessoParaCRM,
  buscarProcessoPorNumero,
} from '../modules/processos/processoService.js';

function booleanFlag(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'sim', 'on'].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function resumoFlags(data = {}) {
  return {
    gerarResumo: booleanFlag(data.gerar_resumo ?? data.gerarResumo, false),
    forcarResumo: booleanFlag(data.forcar_resumo ?? data.forcarResumo, false),
  };
}

const buscarProcessoSchema = z.object({
  numero_processo: z.string().min(1, 'numero_processo é obrigatório'),
  advogado_id: z.string().optional().nullable(),
  gerar_resumo: z.union([z.boolean(), z.string()]).optional(),
  gerarResumo: z.union([z.boolean(), z.string()]).optional(),
  forcar_resumo: z.union([z.boolean(), z.string()]).optional(),
  forcarResumo: z.union([z.boolean(), z.string()]).optional(),
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
  gerar_resumo: z.union([z.boolean(), z.string()]).optional(),
  gerarResumo: z.union([z.boolean(), z.string()]).optional(),
  forcar_resumo: z.union([z.boolean(), z.string()]).optional(),
  forcarResumo: z.union([z.boolean(), z.string()]).optional(),
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

    const flags = resumoFlags(parsed.data);
    const processo = await buscarProcessoPorNumero(parsed.data.numero_processo, {
      advogadoId: parsed.data.advogado_id,
      gerarResumo: flags.gerarResumo,
      forcarResumo: flags.forcarResumo,
    });

    return {
      success: true,
      message: flags.gerarResumo
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

    const flags = resumoFlags(parsed.data);
    const resultado = await baixarProcessoParaCRM({
      numeroProcesso: parsed.data.numero_processo,
      advogadoId: parsed.data.advogado_id,
      usuarioId: parsed.data.usuario_id,
      cliente: parsed.data.cliente,
      parteContraria: parsed.data.parte_contraria,
      gerarResumo: flags.gerarResumo,
      forcarResumo: flags.forcarResumo,
    });

    return {
      success: true,
      message: flags.gerarResumo
        ? 'Processo baixado e salvo no CRM com resumo.'
        : 'Processo baixado e salvo no CRM sem gerar novo resumo.',
      data: resultado,
    };
  });
}

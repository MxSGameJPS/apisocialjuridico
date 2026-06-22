import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  atualizarProcessoManual,
  atualizarProcessosEmLote,
  importarProcessosEmLote,
} from '../modules/processos/processoFase2Service.js';

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

const pessoaCRMSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório').optional().nullable(),
  tipo: z.enum(['pessoa_fisica', 'pessoa_juridica', 'nao_informado']).optional().nullable(),
  documento: z.string().optional().nullable(),
  email: z.string().email('email inválido').optional().nullable(),
  telefone: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
}).optional().nullable();

const resumoFlagShape = {
  gerar_resumo: z.union([z.boolean(), z.string()]).optional(),
  gerarResumo: z.union([z.boolean(), z.string()]).optional(),
  forcar_resumo: z.union([z.boolean(), z.string()]).optional(),
  forcarResumo: z.union([z.boolean(), z.string()]).optional(),
};

const loteSchema = z.object({
  processos: z.array(z.string().min(1)).min(1, 'Informe ao menos um processo.'),
  advogado_id: z.string().min(1, 'advogado_id é obrigatório'),
  usuario_id: z.string().optional().nullable(),
  cliente: pessoaCRMSchema,
  parte_contraria: pessoaCRMSchema,
  ignorar_duplicados: z.boolean().optional().default(true),
  ...resumoFlagShape,
});

const atualizarSchema = z.object({
  numero_processo: z.string().min(1, 'numero_processo é obrigatório'),
  advogado_id: z.string().min(1, 'advogado_id é obrigatório'),
  usuario_id: z.string().optional().nullable(),
  ...resumoFlagShape,
});

const atualizarLoteSchema = z.object({
  processos: z.array(z.string().min(1)).min(1, 'Informe ao menos um processo.'),
  advogado_id: z.string().min(1, 'advogado_id é obrigatório'),
  usuario_id: z.string().optional().nullable(),
  ...resumoFlagShape,
});

export async function processosFase2Routes(app) {
  app.post('/api/processos/importar-lote', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = loteSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const flags = resumoFlags(parsed.data);
    const resultado = await importarProcessosEmLote({
      processos: parsed.data.processos,
      advogadoId: parsed.data.advogado_id,
      usuarioId: parsed.data.usuario_id,
      cliente: parsed.data.cliente,
      parteContraria: parsed.data.parte_contraria,
      ignorarDuplicados: parsed.data.ignorar_duplicados,
      gerarResumo: flags.gerarResumo,
      forcarResumo: flags.forcarResumo,
    });

    return {
      success: true,
      message: 'Importação em lote processada.',
      data: resultado,
    };
  });

  app.post('/api/processos/atualizar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = atualizarSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const flags = resumoFlags(parsed.data);
    const resultado = await atualizarProcessoManual({
      numeroProcesso: parsed.data.numero_processo,
      advogadoId: parsed.data.advogado_id,
      usuarioId: parsed.data.usuario_id,
      gerarResumo: flags.gerarResumo,
      forcarResumo: flags.forcarResumo,
    });

    return {
      success: true,
      message: 'Processo atualizado manualmente com sucesso.',
      data: resultado,
    };
  });

  app.post('/api/processos/atualizar-lote', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = atualizarLoteSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const flags = resumoFlags(parsed.data);
    const resultado = await atualizarProcessosEmLote({
      processos: parsed.data.processos,
      advogadoId: parsed.data.advogado_id,
      usuarioId: parsed.data.usuario_id,
      gerarResumo: flags.gerarResumo,
      forcarResumo: flags.forcarResumo,
    });

    return {
      success: true,
      message: 'Atualização em lote processada.',
      data: resultado,
    };
  });
}

import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { commercialAuth, registrarUsoComercialOnResponse } from '../middlewares/commercialAuth.js';
import { listarFeedbacksProcessuais, registrarFeedbackProcessual, TIPOS_FEEDBACK } from '../modules/comercial/feedbackProcessualService.js';

const feedbackSchema = z.object({
  owner_ref: z.string().optional().nullable(),
  plataforma_ref: z.string().optional().nullable(),
  evento_id: z.string().uuid().optional().nullable(),
  monitoramento_id: z.string().uuid().optional().nullable(),
  numero_cnj: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  termo_oab: z.string().optional().nullable(),
  tipo_feedback: z.enum(TIPOS_FEEDBACK),
  resultado: z.string().optional().default('registrado'),
  parte: z.object({
    nome: z.string().optional().nullable(),
    polo: z.string().optional().nullable(),
    tipo: z.string().optional().nullable(),
  }).optional().default({}),
  parte_nome: z.string().optional().nullable(),
  parte_polo: z.string().optional().nullable(),
  parte_tipo: z.string().optional().nullable(),
  cliente: z.object({
    id: z.string().optional().nullable(),
    ref: z.string().optional().nullable(),
    nome: z.string().optional().nullable(),
  }).optional().default({}),
  cliente_ref: z.string().optional().nullable(),
  cliente_nome: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  payload: z.record(z.any()).optional().default({}),
});

const listarFeedbackSchema = z.object({
  owner_ref: z.string().optional().nullable(),
  plataforma_ref: z.string().optional().nullable(),
  numero_cnj: z.string().optional().nullable(),
  tipo_feedback: z.enum(TIPOS_FEEDBACK).optional().nullable(),
  limite: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const feedbackComercialSchema = feedbackSchema.omit({ owner_ref: true });
const listarFeedbackComercialSchema = listarFeedbackSchema.omit({ owner_ref: true });

function commercialContext(request) {
  return {
    clienteId: request.apiComercial?.cliente?.id || null,
    apiKeyId: request.apiComercial?.apiKey?.id || null,
  };
}

export async function plataformaFeedbackRoutes(app) {
  app.addHook('onResponse', registrarUsoComercialOnResponse);

  app.post('/api/plataformas/feedback/processual', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = feedbackSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await registrarFeedbackProcessual({
      ...parsed.data,
      ownerRef: parsed.data.owner_ref,
      plataformaRef: parsed.data.plataforma_ref,
      eventoId: parsed.data.evento_id,
      monitoramentoId: parsed.data.monitoramento_id,
    });

    return { success: true, message: 'Feedback processual registrado.', data };
  });

  app.post('/api/plataformas/feedback/processual/listar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = listarFeedbackSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await listarFeedbacksProcessuais({
      ownerRef: parsed.data.owner_ref,
      plataformaRef: parsed.data.plataforma_ref,
      numeroCnj: parsed.data.numero_cnj,
      tipoFeedback: parsed.data.tipo_feedback,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Feedbacks processuais listados.', data: { total: data.length, feedbacks: data } };
  });

  app.post('/api/v1/feedback/processual', { preHandler: commercialAuth }, async (request, reply) => {
    const parsed = feedbackComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const ctx = commercialContext(request);
    const data = await registrarFeedbackProcessual({
      ...parsed.data,
      clienteId: ctx.clienteId,
      apiKeyId: ctx.apiKeyId,
      plataformaRef: parsed.data.plataforma_ref,
      eventoId: parsed.data.evento_id,
      monitoramentoId: parsed.data.monitoramento_id,
    });

    return { success: true, message: 'Feedback processual comercial registrado.', data };
  });

  app.post('/api/v1/feedback/processual/listar', { preHandler: commercialAuth }, async (request, reply) => {
    const parsed = listarFeedbackComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const ctx = commercialContext(request);
    const data = await listarFeedbacksProcessuais({
      clienteId: ctx.clienteId,
      plataformaRef: parsed.data.plataforma_ref,
      numeroCnj: parsed.data.numero_cnj,
      tipoFeedback: parsed.data.tipo_feedback,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Feedbacks processuais comerciais listados.', data: { total: data.length, feedbacks: data } };
  });
}

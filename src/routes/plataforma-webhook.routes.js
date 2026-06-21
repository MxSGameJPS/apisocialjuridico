import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { commercialAuth, registrarUsoComercialOnResponse } from '../middlewares/commercialAuth.js';
import { listarWebhookOutbox, processarWebhookOutbox } from '../modules/comercial/webhookOutboxService.js';

const listarOutboxSchema = z.object({
  owner_ref: z.string().optional().nullable(),
  plataforma_ref: z.string().optional().nullable(),
  status: z.enum(['pendente', 'entregue', 'erro', 'falhou_final']).optional().nullable(),
  limite: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const processarOutboxSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  owner_ref: z.string().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(100).optional().default(25),
});

const listarOutboxComercialSchema = listarOutboxSchema.omit({ owner_ref: true });
const processarOutboxComercialSchema = processarOutboxSchema.omit({ owner_ref: true });

function commercialContext(request) {
  return { clienteId: request.apiComercial?.cliente?.id || null };
}

export async function plataformaWebhookRoutes(app) {
  app.addHook('onResponse', registrarUsoComercialOnResponse);

  app.post('/api/plataformas/webhooks/outbox', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = listarOutboxSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await listarWebhookOutbox({
      ownerRef: parsed.data.owner_ref,
      plataformaRef: parsed.data.plataforma_ref,
      status: parsed.data.status,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Webhook outbox listado.', data: { total: data.length, entregas: data } };
  });

  app.post('/api/plataformas/webhooks/processar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = processarOutboxSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await processarWebhookOutbox({
      id: parsed.data.id,
      ownerRef: parsed.data.owner_ref,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Webhook outbox processado.', data };
  });

  app.post('/api/v1/webhooks/outbox', { preHandler: commercialAuth }, async (request, reply) => {
    const parsed = listarOutboxComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const ctx = commercialContext(request);
    const data = await listarWebhookOutbox({
      clienteId: ctx.clienteId,
      plataformaRef: parsed.data.plataforma_ref,
      status: parsed.data.status,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Webhook outbox comercial listado.', data: { total: data.length, entregas: data } };
  });

  app.post('/api/v1/webhooks/processar', { preHandler: commercialAuth }, async (request, reply) => {
    const parsed = processarOutboxComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const ctx = commercialContext(request);
    const data = await processarWebhookOutbox({
      id: parsed.data.id,
      clienteId: ctx.clienteId,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Webhook outbox comercial processado.', data };
  });
}

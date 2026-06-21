import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { commercialAuth, registrarUsoComercialOnResponse } from '../middlewares/commercialAuth.js';
import { montarPayloadImportacaoCrm } from '../modules/comercial/crmPayloadService.js';

const crmPayloadSchema = z.object({
  numero_cnj: z.string().optional().nullable(),
  processo: z.record(z.any()).optional().default({}),
  owner_ref: z.string().optional().default('interno'),
  plataforma_ref: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  termo_oab: z.string().optional().nullable(),
  incluir_timeline: z.boolean().optional().default(false),
  limite_eventos: z.coerce.number().int().min(0).max(20).optional().default(5),
});

const crmPayloadComercialSchema = crmPayloadSchema.omit({ owner_ref: true }).extend({
  plataforma_ref: z.string().optional().nullable(),
});

function commercialContext(request) {
  return {
    clienteId: request.apiComercial?.cliente?.id || null,
  };
}

export async function plataformaCrmRoutes(app) {
  app.addHook('onResponse', registrarUsoComercialOnResponse);

  app.post('/api/plataformas/crm/payload-processo', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = crmPayloadSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados invalidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await montarPayloadImportacaoCrm({
      numero_cnj: parsed.data.numero_cnj,
      processo: parsed.data.processo,
      ownerRef: parsed.data.owner_ref,
      plataformaRef: parsed.data.plataforma_ref,
      uf: parsed.data.uf,
      oab: parsed.data.oab,
      termoOab: parsed.data.termo_oab,
      incluirTimeline: parsed.data.incluir_timeline,
      limiteEventos: parsed.data.limite_eventos,
    });

    return { success: true, message: 'Payload de importacao CRM gerado.', data };
  });

  app.post('/api/v1/crm/payload-processo', { preHandler: commercialAuth }, async (request, reply) => {
    const parsed = crmPayloadComercialSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados invalidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const ctx = commercialContext(request);
    const data = await montarPayloadImportacaoCrm({
      numero_cnj: parsed.data.numero_cnj,
      processo: parsed.data.processo,
      clienteId: ctx.clienteId,
      plataformaRef: parsed.data.plataforma_ref,
      uf: parsed.data.uf,
      oab: parsed.data.oab,
      termoOab: parsed.data.termo_oab,
      incluirTimeline: parsed.data.incluir_timeline,
      limiteEventos: parsed.data.limite_eventos,
    });

    return { success: true, message: 'Payload comercial de importacao CRM gerado.', data };
  });
}

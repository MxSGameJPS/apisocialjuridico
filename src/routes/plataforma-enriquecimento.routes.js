import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { commercialAuth, registrarUsoComercialOnResponse } from '../middlewares/commercialAuth.js';
import { enriquecerProcessosEmLote } from '../modules/comercial/enriquecimentoLoteService.js';

const processoItemSchema = z.union([
  z.string(),
  z.record(z.any()),
]);

const enriquecimentoLoteSchema = z.object({
  owner_ref: z.string().optional().nullable(),
  plataforma_ref: z.string().optional().nullable(),
  processos: z.array(processoItemSchema).min(1).max(100),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  termo_oab: z.string().optional().nullable(),
  incluir_timeline: z.boolean().optional().default(false),
  limite_eventos: z.coerce.number().int().min(0).max(20).optional().default(5),
  limite: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const enriquecimentoLoteComercialSchema = enriquecimentoLoteSchema.omit({ owner_ref: true });

function commercialContext(request) {
  return {
    clienteId: request.apiComercial?.cliente?.id || null,
  };
}

export async function plataformaEnriquecimentoRoutes(app) {
  app.addHook('onResponse', registrarUsoComercialOnResponse);

  app.post('/api/plataformas/enriquecimento/lote', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = enriquecimentoLoteSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await enriquecerProcessosEmLote({
      processos: parsed.data.processos,
      ownerRef: parsed.data.owner_ref,
      plataformaRef: parsed.data.plataforma_ref,
      uf: parsed.data.uf,
      oab: parsed.data.oab,
      termoOab: parsed.data.termo_oab,
      incluirTimeline: parsed.data.incluir_timeline,
      limiteEventos: parsed.data.limite_eventos,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Processos enriquecidos em lote.', data };
  });

  app.post('/api/v1/enriquecimento/lote', { preHandler: commercialAuth }, async (request, reply) => {
    const parsed = enriquecimentoLoteComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const ctx = commercialContext(request);
    const data = await enriquecerProcessosEmLote({
      processos: parsed.data.processos,
      clienteId: ctx.clienteId,
      plataformaRef: parsed.data.plataforma_ref,
      uf: parsed.data.uf,
      oab: parsed.data.oab,
      termoOab: parsed.data.termo_oab,
      incluirTimeline: parsed.data.incluir_timeline,
      limiteEventos: parsed.data.limite_eventos,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Processos comerciais enriquecidos em lote.', data };
  });
}

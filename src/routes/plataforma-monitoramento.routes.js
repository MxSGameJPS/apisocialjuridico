import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  criarMonitoramentoPlataforma,
  executarMonitoramentosPlataforma,
  listarEventosPlataforma,
  listarMonitoramentosPlataforma,
  marcarEventosLidosPlataforma,
} from '../modules/comercial/monitoramentoPlataformaService.js';

const criarMonitoramentoSchema = z.object({
  tipo: z.enum(['oab', 'cnj']),
  valor: z.string().optional().nullable(),
  termo: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  numero_cnj: z.string().optional().nullable(),
  owner_ref: z.string().optional().default('interno'),
  plataforma_ref: z.string().optional().nullable(),
  webhook_url: z.string().url().optional().nullable(),
  filtros: z.record(z.any()).optional().default({}),
  frequencia_minutos: z.coerce.number().int().min(30).max(10080).optional().default(360),
  ativo: z.boolean().optional().default(true),
});

const listarMonitoramentosSchema = z.object({
  owner_ref: z.string().optional().default('interno'),
  plataforma_ref: z.string().optional().nullable(),
  ativo: z.boolean().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const executarMonitoramentosSchema = z.object({
  owner_ref: z.string().optional().default('interno'),
  plataforma_ref: z.string().optional().nullable(),
  monitoramento_id: z.string().uuid().optional().nullable(),
  limite_monitoramentos: z.coerce.number().int().min(1).max(100).optional().default(25),
  limite_por_monitoramento: z.coerce.number().int().min(1).max(30).optional().default(20),
});

const listarEventosSchema = z.object({
  owner_ref: z.string().optional().default('interno'),
  plataforma_ref: z.string().optional().nullable(),
  monitoramento_id: z.string().uuid().optional().nullable(),
  lido: z.boolean().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const marcarEventosSchema = z.object({
  owner_ref: z.string().optional().default('interno'),
  ids: z.array(z.string().uuid()).min(1),
  lido: z.boolean().optional().default(true),
});

export async function plataformaMonitoramentoRoutes(app) {
  app.post('/api/plataformas/monitoramentos', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = criarMonitoramentoSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await criarMonitoramentoPlataforma({
      tipo: parsed.data.tipo,
      valor: parsed.data.valor,
      termo: parsed.data.termo,
      uf: parsed.data.uf,
      oab: parsed.data.oab,
      numero_cnj: parsed.data.numero_cnj,
      ownerRef: parsed.data.owner_ref,
      plataformaRef: parsed.data.plataforma_ref,
      webhookUrl: parsed.data.webhook_url,
      filtros: parsed.data.filtros,
      frequenciaMinutos: parsed.data.frequencia_minutos,
      ativo: parsed.data.ativo,
    });

    return { success: true, message: 'Monitoramento interno criado ou atualizado.', data };
  });

  app.post('/api/plataformas/monitoramentos/listar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = listarMonitoramentosSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await listarMonitoramentosPlataforma({ ownerRef: parsed.data.owner_ref, plataformaRef: parsed.data.plataforma_ref, ativo: parsed.data.ativo, limite: parsed.data.limite });
    return { success: true, message: 'Monitoramentos internos listados.', data: { total: data.length, monitoramentos: data } };
  });

  app.post('/api/plataformas/monitoramentos/executar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = executarMonitoramentosSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await executarMonitoramentosPlataforma({ ownerRef: parsed.data.owner_ref, plataformaRef: parsed.data.plataforma_ref, monitoramentoId: parsed.data.monitoramento_id, limiteMonitoramentos: parsed.data.limite_monitoramentos, limitePorMonitoramento: parsed.data.limite_por_monitoramento });
    return { success: true, message: 'Monitoramentos internos executados.', data };
  });

  app.post('/api/plataformas/eventos', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = listarEventosSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await listarEventosPlataforma({ ownerRef: parsed.data.owner_ref, plataformaRef: parsed.data.plataforma_ref, monitoramentoId: parsed.data.monitoramento_id, lido: parsed.data.lido, limite: parsed.data.limite });
    return { success: true, message: 'Eventos internos listados.', data: { total: data.length, eventos: data } };
  });

  app.post('/api/plataformas/eventos/marcar-lido', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = marcarEventosSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados invalidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await marcarEventosLidosPlataforma({ ownerRef: parsed.data.owner_ref, ids: parsed.data.ids, lido: parsed.data.lido });
    return { success: true, message: 'Eventos internos atualizados.', data: { total: data.length, eventos: data } };
  });
}

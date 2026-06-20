import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { extrairEntidadesDeProcesso } from '../modules/publico/extratorEntidadesService.js';
import { gerarDossiePublico, listarEntidadesPublicas } from '../modules/publico/dossieService.js';
import { analisarProcessoPublico, estatisticasRecorrencia } from '../modules/publico/inteligenciaJuridicaService.js';

const cnjSchema = z.object({ numero_cnj: z.string().min(10) });
const dossieSchema = z.object({ id: z.string().uuid().optional().nullable(), documento: z.string().optional().nullable(), nome: z.string().optional().nullable() });
const entidadesSchema = z.object({ termo: z.string().optional().nullable(), tipo: z.string().optional().nullable(), limite: z.coerce.number().int().min(1).max(100).optional().default(20) });
const recorrenciaSchema = z.object({ termo: z.string().optional().nullable(), tribunal: z.string().optional().nullable(), classe: z.string().optional().nullable() });

export async function publicoFase789Routes(app) {
  app.post('/api/publico/entidades/extrair', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = cnjSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await extrairEntidadesDeProcesso({ numeroCnj: parsed.data.numero_cnj });
    return { success: true, message: 'Entidades extraídas com sucesso.', data };
  });

  app.post('/api/publico/entidades/listar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = entidadesSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await listarEntidadesPublicas({ termo: parsed.data.termo, tipo: parsed.data.tipo, limite: parsed.data.limite });
    return { success: true, message: 'Entidades listadas com sucesso.', data: { total: data.length, entidades: data } };
  });

  app.post('/api/publico/dossie', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = dossieSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await gerarDossiePublico({ id: parsed.data.id, documento: parsed.data.documento, nome: parsed.data.nome });
    return { success: true, message: 'Dossiê público gerado com sucesso.', data };
  });

  app.post('/api/publico/inteligencia/analisar-processo', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = cnjSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await analisarProcessoPublico({ numeroCnj: parsed.data.numero_cnj });
    return { success: true, message: 'Análise jurídica gerada com sucesso.', data };
  });

  app.post('/api/publico/inteligencia/recorrencia', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = recorrenciaSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await estatisticasRecorrencia({ termo: parsed.data.termo, tribunal: parsed.data.tribunal, classe: parsed.data.classe });
    return { success: true, message: 'Estatísticas de recorrência geradas.', data };
  });
}

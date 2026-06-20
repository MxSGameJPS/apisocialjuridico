import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { buscarPorAdvogado, buscarPorCpfCnpj, buscarPorNome, extrairDocumentosDoIndice } from '../modules/publico/buscaEntidadeService.js';
import { criarAlertaPublico, executarAlertasPublicos } from '../modules/publico/alertasPublicosService.js';
import { encontrarProcessosSimilares } from '../modules/publico/similaridadeService.js';
import { montarTimelineProcessual } from '../modules/publico/timelineService.js';

const cpfSchema = z.object({ documento: z.string().min(3), buscar_djen: z.boolean().optional().default(false), limite: z.coerce.number().int().min(1).max(100).optional().default(20) });
const nomeSchema = z.object({ nome: z.string().min(3), buscar_djen: z.boolean().optional().default(true), limite: z.coerce.number().int().min(1).max(100).optional().default(20) });
const advogadoSchema = z.object({ nome: z.string().optional().nullable(), oab: z.string().optional().nullable(), uf: z.string().optional().nullable(), buscar_djen: z.boolean().optional().default(true), limite: z.coerce.number().int().min(1).max(100).optional().default(20) });
const timelineSchema = z.object({ numero_cnj: z.string().min(10), atualizar_datajud: z.boolean().optional().default(false) });
const alertaSchema = z.object({ tipo: z.enum(['nome', 'cpf_cnpj', 'advogado', 'oab', 'cnj', 'termo']), valor: z.string().min(2), usuario_id: z.string().optional().nullable(), advogado_id: z.string().optional().nullable(), filtros: z.record(z.any()).optional().default({}), ativo: z.boolean().optional().default(true) });
const executarAlertasSchema = z.object({ limite_alertas: z.coerce.number().int().min(1).max(100).optional().default(25), limite_por_alerta: z.coerce.number().int().min(1).max(50).optional().default(10) });
const similaresSchema = z.object({ numero_cnj: z.string().optional().nullable(), texto: z.string().optional().nullable(), limite: z.coerce.number().int().min(1).max(50).optional().default(10), score_minimo: z.coerce.number().min(0).max(1).optional().default(0.12) });
const docsSchema = z.object({ numero_cnj: z.string().min(10) });

export async function publicoFase6Routes(app) {
  app.post('/api/publico/buscar/cpf-cnpj', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = cpfSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await buscarPorCpfCnpj({ documento: parsed.data.documento, buscarDjen: parsed.data.buscar_djen, limite: parsed.data.limite });
    return { success: true, message: 'Busca por CPF/CNPJ executada.', data };
  });

  app.post('/api/publico/buscar/nome', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = nomeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await buscarPorNome({ nome: parsed.data.nome, buscarDjen: parsed.data.buscar_djen, limite: parsed.data.limite });
    return { success: true, message: 'Busca por nome executada.', data };
  });

  app.post('/api/publico/buscar/advogado', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = advogadoSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await buscarPorAdvogado({ nome: parsed.data.nome, oab: parsed.data.oab, uf: parsed.data.uf, buscarDjen: parsed.data.buscar_djen, limite: parsed.data.limite });
    return { success: true, message: 'Busca por advogado executada.', data };
  });

  app.post('/api/publico/processos/timeline', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = timelineSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await montarTimelineProcessual({ numeroCnj: parsed.data.numero_cnj, atualizarDatajud: parsed.data.atualizar_datajud });
    return { success: true, message: 'Timeline processual gerada.', data };
  });

  app.post('/api/publico/alertas', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = alertaSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await criarAlertaPublico({ tipo: parsed.data.tipo, valor: parsed.data.valor, usuarioId: parsed.data.usuario_id, advogadoId: parsed.data.advogado_id, filtros: parsed.data.filtros, ativo: parsed.data.ativo });
    return { success: true, message: 'Alerta público criado.', data };
  });

  app.post('/api/publico/alertas/executar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = executarAlertasSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await executarAlertasPublicos({ limiteAlertas: parsed.data.limite_alertas, limitePorAlerta: parsed.data.limite_por_alerta });
    return { success: true, message: 'Alertas públicos executados.', data };
  });

  app.post('/api/publico/processos/similares', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = similaresSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await encontrarProcessosSimilares({ numeroCnj: parsed.data.numero_cnj, texto: parsed.data.texto, limite: parsed.data.limite, scoreMinimo: parsed.data.score_minimo });
    return { success: true, message: 'Busca de similaridades executada.', data };
  });

  app.post('/api/publico/processos/documentos-extraidos', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = docsSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await extrairDocumentosDoIndice({ numeroCnj: parsed.data.numero_cnj });
    return { success: true, message: 'Documentos extraídos do índice.', data };
  });
}

import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { commercialAuth, registrarUsoComercialOnResponse } from '../middlewares/commercialAuth.js';
import { buscarProcessosFullText } from '../modules/publico/buscaFullTextService.js';
import { gerarDossiePublico } from '../modules/publico/dossieService.js';
import { buscarProcessosPorOabRobusto } from '../modules/publico/oabRobustaService.js';
import { montarTimelineProcessual } from '../modules/publico/timelineService.js';
import {
  alterarStatusApiKey,
  criarApiKeyComercial,
  criarClienteComercial,
  listarUsoComercial,
  limitesDoPlano,
} from '../modules/comercial/apiComercialService.js';

const criarClienteSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  documento: z.string().optional().nullable(),
  plano: z.enum(['free', 'start', 'pro', 'enterprise']).optional().default('free'),
  ativo: z.boolean().optional().default(true),
});

const criarKeySchema = z.object({
  cliente_id: z.string().uuid(),
  nome: z.string().optional().default('Chave principal'),
  plano: z.enum(['free', 'start', 'pro', 'enterprise']).optional().nullable(),
});

const statusKeySchema = z.object({
  api_key_id: z.string().uuid(),
  ativo: z.boolean(),
});

const usoSchema = z.object({
  cliente_id: z.string().uuid().optional().nullable(),
  api_key_id: z.string().uuid().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

const buscaComercialSchema = z.object({
  termo: z.string().optional().nullable(),
  tribunal: z.string().optional().nullable(),
  classe: z.string().optional().nullable(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
  por_pagina: z.coerce.number().int().min(1).max(100).optional().default(20),
  ordenar_por: z.enum(['relevancia', 'data']).optional().default('relevancia'),
});

const dossieComercialSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  documento: z.string().optional().nullable(),
  nome: z.string().optional().nullable(),
});

const timelineComercialSchema = z.object({
  numero_cnj: z.string().min(10),
  atualizar_datajud: z.boolean().optional().default(false),
});

const oabComercialSchema = z.object({
  termo: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  limite_djen: z.coerce.number().int().min(1).max(30).optional().default(20),
  incluir_detalhes: z.boolean().optional().default(true),
  limite_detalhes: z.coerce.number().int().min(0).max(15).optional().default(10),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
});

async function comercialPreHandler(request, reply) {
  const authResult = await commercialAuth(request, reply);
  return authResult;
}

export async function comercialRoutes(app) {
  app.addHook('onResponse', registrarUsoComercialOnResponse);

  app.get('/api/comercial/planos', { preHandler: internalAuth }, async () => ({
    success: true,
    message: 'Planos comerciais disponíveis.',
    data: {
      free: limitesDoPlano('free'),
      start: limitesDoPlano('start'),
      pro: limitesDoPlano('pro'),
      enterprise: limitesDoPlano('enterprise'),
    },
  }));

  app.post('/api/comercial/clientes', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = criarClienteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await criarClienteComercial(parsed.data);
    return { success: true, message: 'Cliente comercial criado.', data };
  });

  app.post('/api/comercial/api-keys', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = criarKeySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await criarApiKeyComercial({ clienteId: parsed.data.cliente_id, nome: parsed.data.nome, plano: parsed.data.plano });
    return { success: true, message: 'API key comercial criada.', data };
  });

  app.post('/api/comercial/api-keys/status', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = statusKeySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await alterarStatusApiKey({ apiKeyId: parsed.data.api_key_id, ativo: parsed.data.ativo });
    return { success: true, message: 'Status da API key alterado.', data };
  });

  app.post('/api/comercial/uso', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = usoSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await listarUsoComercial({ clienteId: parsed.data.cliente_id, apiKeyId: parsed.data.api_key_id, limite: parsed.data.limite });
    return { success: true, message: 'Uso comercial listado.', data: { total: data.length, logs: data } };
  });

  app.post('/api/v1/busca/processos', { preHandler: comercialPreHandler }, async (request, reply) => {
    const parsed = buscaComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await buscarProcessosFullText({ termo: parsed.data.termo, tribunal: parsed.data.tribunal, classe: parsed.data.classe, pagina: parsed.data.pagina, porPagina: parsed.data.por_pagina, ordenarPor: parsed.data.ordenar_por });
    return { success: true, message: 'Busca comercial executada.', data };
  });

  app.post('/api/v1/oab/processos', { preHandler: comercialPreHandler }, async (request, reply) => {
    const parsed = oabComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    try {
      const data = await buscarProcessosPorOabRobusto({
        termo: parsed.data.termo,
        uf: parsed.data.uf,
        oab: parsed.data.oab,
        limiteDjen: parsed.data.limite_djen,
        incluirDetalhes: parsed.data.incluir_detalhes,
        limiteDetalhes: parsed.data.limite_detalhes,
        dataInicio: parsed.data.data_inicio,
        dataFim: parsed.data.data_fim,
      });
      return { success: true, message: 'Busca comercial por OAB executada.', data };
    } catch (error) {
      return reply.code(error.statusCode || 500).send({ success: false, message: error.message || 'Erro ao buscar processos por OAB.' });
    }
  });

  app.post('/api/v1/dossie', { preHandler: comercialPreHandler }, async (request, reply) => {
    const parsed = dossieComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await gerarDossiePublico({ id: parsed.data.id, documento: parsed.data.documento, nome: parsed.data.nome });
    return { success: true, message: 'Dossiê comercial gerado.', data };
  });

  app.post('/api/v1/processos/timeline', { preHandler: comercialPreHandler }, async (request, reply) => {
    const parsed = timelineComercialSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    const data = await montarTimelineProcessual({ numeroCnj: parsed.data.numero_cnj, atualizarDatajud: parsed.data.atualizar_datajud });
    return { success: true, message: 'Timeline comercial gerada.', data };
  });
}

import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  enriquecerBuscaPublicaDjen,
  enriquecerPublicacoesPendentes,
} from '../modules/publico/enriquecimentoPublicoService.js';
import { buscarIndicePublico } from '../modules/publico/indicePublicoService.js';

const filtrosSchema = z.object({
  oab: z.string().optional().nullable(),
  numero_oab: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  uf_oab: z.string().optional().nullable(),
  numero_processo: z.string().optional().nullable(),
  numero_cnj: z.string().optional().nullable(),
  processo: z.string().optional().nullable(),
  tribunal: z.string().optional().nullable(),
  sigla_tribunal: z.string().optional().nullable(),
  nome_parte: z.string().optional().nullable(),
  parte: z.string().optional().nullable(),
  nome_advogado: z.string().optional().nullable(),
  advogado: z.string().optional().nullable(),
  nome_orgao: z.string().optional().nullable(),
  orgao: z.string().optional().nullable(),
  tipo_comunicacao: z.string().optional().nullable(),
  tipo_documento: z.string().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  pagina: z.coerce.number().int().min(1).optional().default(1),
  itens_por_pagina: z.coerce.number().int().min(1).max(100).optional(),
  parametros_extras: z.record(z.any()).optional(),
}).passthrough();

const enriquecerBuscaSchema = z.object({
  filtros: filtrosSchema,
  salvar_busca: z.boolean().optional().default(true),
  usar_datajud: z.boolean().optional().default(true),
  limite: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const enriquecerPendentesSchema = z.object({
  usar_datajud: z.boolean().optional().default(true),
  limite: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const buscarIndiceSchema = z.object({
  termo: z.string().optional().nullable(),
  numero_cnj: z.string().optional().nullable(),
  tribunal: z.string().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function publicoRoutes(app) {
  app.post('/api/publico/processos/enriquecer-busca', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = enriquecerBuscaSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await enriquecerBuscaPublicaDjen({
      filtros: parsed.data.filtros,
      salvarBusca: parsed.data.salvar_busca,
      usarDatajud: parsed.data.usar_datajud,
      limite: parsed.data.limite,
    });

    return {
      success: true,
      message: 'Busca pública enriquecida com sucesso.',
      data: resultado,
    };
  });

  app.post('/api/publico/processos/enriquecer-pendentes', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = enriquecerPendentesSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultado = await enriquecerPublicacoesPendentes({
      usarDatajud: parsed.data.usar_datajud,
      limite: parsed.data.limite,
    });

    return {
      success: true,
      message: 'Publicações pendentes enriquecidas com sucesso.',
      data: resultado,
    };
  });

  app.post('/api/publico/processos/buscar-indice', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = buscarIndiceSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados inválidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const resultados = await buscarIndicePublico({
      termo: parsed.data.termo,
      numeroCnj: parsed.data.numero_cnj,
      tribunal: parsed.data.tribunal,
      limite: parsed.data.limite,
    });

    return {
      success: true,
      message: 'Busca no índice público executada com sucesso.',
      data: {
        total: resultados.length,
        resultados,
      },
    };
  });
}

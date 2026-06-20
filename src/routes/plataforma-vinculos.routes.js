import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import {
  confirmarVinculoProcessualPlataforma,
  desativarVinculoProcessualPlataforma,
  listarVinculosProcessuaisPlataforma,
} from '../modules/comercial/vinculosPlataformaService.js';

const confirmarVinculoSchema = z.object({
  numero_cnj: z.string().min(10),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  termo_oab: z.string().optional().nullable(),
  tipo_vinculo: z.enum(['cliente_confirmado', 'parte_contraria', 'ignorado', 'vinculo_incorreto']).optional().default('cliente_confirmado'),
  parte: z.object({
    nome: z.string().min(2),
    polo: z.string().optional().nullable(),
    tipo: z.string().optional().nullable(),
  }).optional(),
  parte_nome: z.string().optional().nullable(),
  parte_polo: z.string().optional().nullable(),
  parte_tipo: z.string().optional().nullable(),
  owner_ref: z.string().optional().default('interno'),
  plataforma_ref: z.string().optional().nullable(),
  origem: z.string().optional().default('confirmacao_plataforma'),
  confianca: z.coerce.number().min(0).max(1).optional().default(1),
  observacao: z.string().optional().nullable(),
  payload: z.record(z.any()).optional().default({}),
});

const listarVinculosSchema = z.object({
  numero_cnj: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  termo_oab: z.string().optional().nullable(),
  tipo_vinculo: z.string().optional().nullable(),
  owner_ref: z.string().optional().default('interno'),
  ativo: z.boolean().optional().default(true),
  limite: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const desativarVinculoSchema = z.object({
  id: z.string().uuid(),
  owner_ref: z.string().optional().default('interno'),
  motivo: z.string().optional().nullable(),
});

export async function plataformaVinculosRoutes(app) {
  app.post('/api/plataformas/vinculos/confirmar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = confirmarVinculoSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await confirmarVinculoProcessualPlataforma({
      numero_cnj: parsed.data.numero_cnj,
      uf: parsed.data.uf,
      oab: parsed.data.oab,
      termoOab: parsed.data.termo_oab,
      tipo_vinculo: parsed.data.tipo_vinculo,
      parte: parsed.data.parte,
      parte_nome: parsed.data.parte_nome,
      parte_polo: parsed.data.parte_polo,
      parte_tipo: parsed.data.parte_tipo,
      ownerRef: parsed.data.owner_ref,
      plataformaRef: parsed.data.plataforma_ref,
      origem: parsed.data.origem,
      confianca: parsed.data.confianca,
      observacao: parsed.data.observacao,
      payload: parsed.data.payload,
    });

    return { success: true, message: 'Vínculo processual confirmado.', data };
  });

  app.post('/api/plataformas/vinculos/listar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = listarVinculosSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await listarVinculosProcessuaisPlataforma({
      ownerRef: parsed.data.owner_ref,
      numero_cnj: parsed.data.numero_cnj,
      uf: parsed.data.uf,
      oab: parsed.data.oab,
      termoOab: parsed.data.termo_oab,
      tipoVinculo: parsed.data.tipo_vinculo,
      ativo: parsed.data.ativo,
      limite: parsed.data.limite,
    });

    return { success: true, message: 'Vínculos processuais listados.', data: { total: data.length, vinculos: data } };
  });

  app.post('/api/plataformas/vinculos/desativar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = desativarVinculoSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await desativarVinculoProcessualPlataforma({ id: parsed.data.id, ownerRef: parsed.data.owner_ref, motivo: parsed.data.motivo });
    return { success: true, message: 'Vínculo processual desativado.', data };
  });
}

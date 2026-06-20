import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { buscarProcessosPorOabRobusto } from '../modules/publico/oabRobustaService.js';
import { aplicarVinculosConfirmadosNosProcessos } from '../modules/comercial/vinculosPlataformaService.js';

const buscaOabPlataformaSchema = z.object({
  termo: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  oab: z.string().optional().nullable(),
  owner_ref: z.string().optional().default('interno'),
  limite_djen: z.coerce.number().int().min(1).max(30).optional().default(20),
  incluir_detalhes: z.boolean().optional().default(true),
  limite_detalhes: z.coerce.number().int().min(0).max(15).optional().default(10),
  incluir_vinculos_confirmados: z.boolean().optional().default(true),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
});

export async function plataformaBuscaRoutes(app) {
  app.post('/api/plataformas/oab/processos', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = buscaOabPlataformaSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: 'Dados invalidos.',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      let data = await buscarProcessosPorOabRobusto({
        termo: parsed.data.termo,
        uf: parsed.data.uf,
        oab: parsed.data.oab,
        limiteDjen: parsed.data.limite_djen,
        incluirDetalhes: parsed.data.incluir_detalhes,
        limiteDetalhes: parsed.data.limite_detalhes,
        dataInicio: parsed.data.data_inicio,
        dataFim: parsed.data.data_fim,
      });

      if (parsed.data.incluir_vinculos_confirmados) {
        data = await aplicarVinculosConfirmadosNosProcessos(data, {
          ownerRef: parsed.data.owner_ref,
          uf: parsed.data.uf,
          oab: parsed.data.oab,
        });
      }

      return {
        success: true,
        message: 'Busca OAB para plataforma executada com sucesso.',
        data,
      };
    } catch (error) {
      return reply.code(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro ao buscar processos por OAB para plataforma.',
      });
    }
  });
}

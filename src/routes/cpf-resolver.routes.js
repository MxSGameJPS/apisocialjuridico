import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { cadastrarResolucaoCpfCnpj, listarResolucoesCpfCnpj, resolverCpfCnpj } from '../modules/publico/cpfResolverService.js';

const cadastrarSchema = z.object({
  documento: z.string().min(11),
  nome_principal: z.string().min(3),
  nomes_relacionados: z.array(z.string()).optional().default([]),
  origem: z.string().optional().default('manual'),
  confianca: z.coerce.number().min(0).max(1).optional().default(0.9),
});

const resolverSchema = z.object({
  documento: z.string().min(11),
});

const listarSchema = z.object({
  termo: z.string().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export async function cpfResolverRoutes(app) {
  app.post('/api/publico/resolver/cpf-cnpj/cadastrar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = cadastrarSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    }

    const data = await cadastrarResolucaoCpfCnpj({
      documento: parsed.data.documento,
      nomePrincipal: parsed.data.nome_principal,
      nomesRelacionados: parsed.data.nomes_relacionados,
      origem: parsed.data.origem,
      confianca: parsed.data.confianca,
    });

    return { success: true, message: 'CPF/CNPJ resolvido cadastrado com sucesso.', data };
  });

  app.post('/api/publico/resolver/cpf-cnpj', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = resolverSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    }

    const data = await resolverCpfCnpj(parsed.data.documento);
    return { success: true, message: data ? 'CPF/CNPJ resolvido.' : 'CPF/CNPJ não encontrado no resolvedor local.', data };
  });

  app.post('/api/publico/resolver/cpf-cnpj/listar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = listarSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });
    }

    const data = await listarResolucoesCpfCnpj({ termo: parsed.data.termo, limite: parsed.data.limite });
    return { success: true, message: 'Resoluções CPF/CNPJ listadas.', data };
  });
}

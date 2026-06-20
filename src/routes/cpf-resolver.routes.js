import { z } from 'zod';
import { internalAuth } from '../middlewares/internalAuth.js';
import { cadastrarResolucaoCpfCnpj, listarResolucoesCpfCnpj, resolverCpfCnpj } from '../modules/publico/cpfResolverService.js';
import { buscarIndiceDosProcessosVinculados, listarProcessosVinculadosCpfCnpj, vincularCpfCnpjAProcesso } from '../modules/publico/cpfProcessoVinculoService.js';

const cadastrarSchema = z.object({
  documento: z.string().min(11),
  nome_principal: z.string().min(3),
  nomes_relacionados: z.array(z.string()).optional().default([]),
  origem: z.string().optional().default('manual'),
  confianca: z.coerce.number().min(0).max(1).optional().default(0.9),
});

const resolverSchema = z.object({ documento: z.string().min(11) });

const listarSchema = z.object({
  termo: z.string().optional().nullable(),
  limite: z.coerce.number().int().min(1).max(200).optional().default(50),
});

const vincularProcessoSchema = z.object({
  documento: z.string().min(11),
  numero_cnj: z.string().min(20),
  nome_vinculado: z.string().optional().nullable(),
  origem: z.string().optional().default('manual'),
  confianca: z.coerce.number().min(0).max(1).optional().default(0.9),
  observacao: z.string().optional().nullable(),
  enriquecer_datajud: z.boolean().optional().default(true),
});

export async function cpfResolverRoutes(app) {
  app.post('/api/publico/resolver/cpf-cnpj/cadastrar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = cadastrarSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

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
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await resolverCpfCnpj(parsed.data.documento);
    return { success: true, message: data ? 'CPF/CNPJ resolvido.' : 'CPF/CNPJ não encontrado no resolvedor local.', data };
  });

  app.post('/api/publico/resolver/cpf-cnpj/listar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = listarSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await listarResolucoesCpfCnpj({ termo: parsed.data.termo, limite: parsed.data.limite });
    return { success: true, message: 'Resoluções CPF/CNPJ listadas.', data };
  });

  app.post('/api/publico/resolver/cpf-cnpj/processos/vincular', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = vincularProcessoSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await vincularCpfCnpjAProcesso({
      documento: parsed.data.documento,
      numeroCnj: parsed.data.numero_cnj,
      nomeVinculado: parsed.data.nome_vinculado,
      origem: parsed.data.origem,
      confianca: parsed.data.confianca,
      observacao: parsed.data.observacao,
      enriquecerDatajud: parsed.data.enriquecer_datajud,
    });

    return { success: true, message: 'Processo vinculado ao CPF/CNPJ com sucesso.', data };
  });

  app.post('/api/publico/resolver/cpf-cnpj/processos/listar', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = resolverSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await listarProcessosVinculadosCpfCnpj(parsed.data.documento);
    return { success: true, message: 'Processos vinculados ao CPF/CNPJ listados.', data };
  });

  app.post('/api/publico/resolver/cpf-cnpj/processos/indice', { preHandler: internalAuth }, async (request, reply) => {
    const parsed = resolverSchema.safeParse(request.body || {});
    if (!parsed.success) return reply.code(400).send({ success: false, message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors });

    const data = await buscarIndiceDosProcessosVinculados(parsed.data.documento);
    return { success: true, message: 'Índice dos processos vinculados ao CPF/CNPJ retornado.', data };
  });
}

import {
  registrarUsoComercial,
  validarApiKeyComercial,
  verificarLimitesComerciais,
} from '../modules/comercial/apiComercialService.js';

export async function commercialAuth(request, reply) {
  const apiKey = request.headers['x-commercial-api-key'] || request.headers['x-api-client-key'];

  const validacao = await validarApiKeyComercial(apiKey);

  if (!validacao.valido) {
    await registrarUsoComercial({
      apiKey: null,
      cliente: null,
      request,
      statusCode: 401,
      sucesso: false,
      erro: validacao.motivo,
    });

    return reply.code(401).send({
      success: false,
      message: validacao.motivo,
    });
  }

  const limite = await verificarLimitesComerciais(validacao.apiKey);

  if (!limite.permitido) {
    await registrarUsoComercial({
      apiKey: validacao.apiKey,
      cliente: validacao.cliente,
      request,
      statusCode: 429,
      sucesso: false,
      erro: `Limite excedido por ${limite.janela}.`,
    });

    return reply.code(429).send({
      success: false,
      message: `Limite comercial excedido por ${limite.janela}.`,
      data: limite,
    });
  }

  request.apiComercial = {
    apiKey: validacao.apiKey,
    cliente: validacao.cliente,
    uso: limite.uso,
    limites: limite.limites,
  };
}

export async function registrarUsoComercialOnResponse(request, reply) {
  if (!request.apiComercial?.apiKey) return;

  await registrarUsoComercial({
    apiKey: request.apiComercial.apiKey,
    cliente: request.apiComercial.cliente,
    request,
    statusCode: reply.statusCode,
    sucesso: reply.statusCode < 400,
    erro: reply.statusCode >= 400 ? 'Resposta com erro.' : null,
  });
}

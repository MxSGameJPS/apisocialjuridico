import { buscaVivaProcessual } from '../modules/publico/buscaVivaService.js';
import { analisarProcessoPublico } from '../modules/publico/inteligenciaJuridicaService.js';
import { montarTimelineProcessual } from '../modules/publico/timelineService.js';
import { commercialPage, homePage, processPage, searchPage } from '../modules/frontend/publicFrontendTemplates.js';

function html(reply, content) {
  return reply.type('text/html; charset=utf-8').send(content);
}

export async function frontendRoutes(app) {
  app.get('/app', async (_request, reply) => html(reply, homePage()));

  app.get('/app/comercial', async (_request, reply) => html(reply, commercialPage()));

  app.get('/app/busca', async (request, reply) => {
    const query = String(request.query?.q || '').trim();

    if (!query) {
      return html(reply, homePage());
    }

    const resultado = await buscaVivaProcessual({
      termo: query,
      tribunal: request.query?.tribunal || null,
      pagina: Number(request.query?.pagina || 1),
      porPagina: Number(request.query?.por_pagina || 10),
      enriquecer: request.query?.vivo !== 'false',
      limiteDjen: Number(request.query?.limite_djen || 10),
      dataInicio: request.query?.data_inicio || null,
      dataFim: request.query?.data_fim || null,
    });

    return html(reply, searchPage({ query, data: resultado.busca, live: resultado }));
  });

  app.get('/app/processo/:numeroCnj', async (request, reply) => {
    const numeroCnj = String(request.params.numeroCnj || '').replace(/\D/g, '');

    const [timeline, analise] = await Promise.all([
      montarTimelineProcessual({ numeroCnj, atualizarDatajud: false }),
      analisarProcessoPublico({ numeroCnj }).catch(() => null),
    ]);

    return html(reply, processPage({ numeroCnj, timeline, analise }));
  });
}

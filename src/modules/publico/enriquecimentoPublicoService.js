import { supabaseAdmin } from '../../clients/supabase.js';
import { buscarPublicacoesDjenAvancado } from '../djen/djenService.js';
import { enriquecerPublicacaoComDatajud } from './indicePublicoService.js';

export async function enriquecerBuscaPublicaDjen({ filtros, salvarBusca = true, usarDatajud = true, limite = 20 }) {
  const busca = await buscarPublicacoesDjenAvancado({
    filtros: {
      ...filtros,
      itens_por_pagina: filtros?.itens_por_pagina || limite,
    },
    salvar: salvarBusca,
    advogadoId: 'publico',
  });

  const resultados = [];

  for (const publicacao of busca.publicacoes || []) {
    if (!publicacao.numero_cnj) {
      resultados.push({
        numero_cnj: null,
        status: 'sem_cnj',
        mensagem: 'Publicação sem CNJ identificado.',
      });
      continue;
    }

    try {
      const enriquecimento = await enriquecerPublicacaoComDatajud({ publicacao, usarDatajud });
      resultados.push(enriquecimento);
    } catch (error) {
      resultados.push({
        numero_cnj: publicacao.numero_cnj,
        status: 'erro',
        mensagem: error.message || 'Erro ao enriquecer publicação.',
      });
    }
  }

  return {
    busca: {
      total_retornado: busca.total_retornado,
      url_consultada: busca.url_consultada,
    },
    resumo: {
      total: resultados.length,
      enriquecidos: resultados.filter((item) => item.status === 'enriquecido_datajud').length,
      indexados_sem_datajud: resultados.filter((item) => item.status === 'indexado_sem_datajud').length,
      sem_cnj: resultados.filter((item) => item.status === 'sem_cnj').length,
      erros: resultados.filter((item) => item.status === 'erro' || item.status === 'erro_datajud').length,
    },
    resultados,
  };
}

export async function enriquecerPublicacoesPendentes({ limite = 25, usarDatajud = true } = {}) {
  const { data: publicacoes, error } = await supabaseAdmin
    .from('djen_publicacoes')
    .select('*')
    .not('numero_cnj', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limite);

  if (error) {
    throw new Error(`Erro ao buscar publicações pendentes: ${error.message}`);
  }

  const resultados = [];

  for (const registro of publicacoes || []) {
    const publicacao = {
      comunicacao_id: registro.comunicacao_id,
      numero_cnj: registro.numero_cnj,
      numero_cnj_formatado: registro.numero_cnj_formatado,
      tribunal: registro.tribunal,
      orgao: registro.orgao,
      classe: registro.classe,
      codigo_classe: registro.codigo_classe,
      data_publicacao: registro.data_publicacao,
      data_disponibilizacao: registro.data_disponibilizacao,
      tipo: registro.tipo,
      tipo_documento: registro.tipo_documento,
      texto: registro.texto,
      link: registro.link,
      partes: registro.partes || [],
      advogados: registro.advogados || [],
      raw: registro.raw_djen || registro,
    };

    try {
      const enriquecimento = await enriquecerPublicacaoComDatajud({ publicacao, usarDatajud });
      resultados.push(enriquecimento);
    } catch (error) {
      resultados.push({
        numero_cnj: publicacao.numero_cnj,
        status: 'erro',
        mensagem: error.message || 'Erro ao enriquecer publicação pendente.',
      });
    }
  }

  return {
    resumo: {
      total: resultados.length,
      enriquecidos: resultados.filter((item) => item.status === 'enriquecido_datajud').length,
      erros: resultados.filter((item) => item.status === 'erro' || item.status === 'erro_datajud').length,
    },
    resultados,
  };
}

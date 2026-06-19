import { env } from '../../config/env.js';

export async function buscarProcessoNoDataJud({ numeroCNJ, tribunal }) {
  if (!env.DATAJUD_API_KEY) {
    throw new Error('DATAJUD_API_KEY não configurada no .env.');
  }

  if (!tribunal?.aliasDataJud) {
    throw new Error('Tribunal não suportado para consulta no DataJud.');
  }

  const endpoint = `${env.DATAJUD_BASE_URL}/api_publica_${tribunal.aliasDataJud}/_search`;

  const body = {
    size: 1,
    query: {
      bool: {
        must: [
          {
            match: {
              numeroProcesso: numeroCNJ,
            },
          },
        ],
      },
    },
    sort: [
      {
        dataHoraUltimaAtualizacao: {
          order: 'desc',
        },
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `APIKey ${env.DATAJUD_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.reason || data?.message || `Erro ao consultar DataJud: HTTP ${response.status}`
    );
  }

  const hit = data?.hits?.hits?.[0];

  if (!hit) {
    return null;
  }

  return hit._source || null;
}

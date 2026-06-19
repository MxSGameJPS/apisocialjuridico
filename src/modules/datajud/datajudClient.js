import { env } from '../../config/env.js';
import { formatarNumeroCNJ, limparNumeroCNJ } from '../tribunais/tribunalDetector.js';

export async function buscarProcessoNoDataJud({ numeroCNJ, tribunal }) {
  if (!env.DATAJUD_API_KEY) {
    throw new Error('DATAJUD_API_KEY não configurada no .env.');
  }

  if (!tribunal?.aliasDataJud) {
    throw new Error('Tribunal não suportado para consulta no DataJud.');
  }

  const numeroLimpo = limparNumeroCNJ(numeroCNJ);
  const numeroFormatado = formatarNumeroCNJ(numeroCNJ);
  const endpoint = `${env.DATAJUD_BASE_URL}/api_publica_${tribunal.aliasDataJud}/_search`;

  const body = {
    size: 1,
    query: {
      bool: {
        should: [
          { term: { numeroProcesso: numeroLimpo } },
          { match_phrase: { numeroProcesso: numeroLimpo } },
          { match: { numeroProcesso: numeroLimpo } },
          { term: { numeroProcesso: numeroFormatado } },
          { match_phrase: { numeroProcesso: numeroFormatado } },
          { match: { numeroProcesso: numeroFormatado } },
        ],
        minimum_should_match: 1,
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

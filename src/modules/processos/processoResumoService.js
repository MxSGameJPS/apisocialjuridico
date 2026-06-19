import { env } from '../../config/env.js';

function montarTextoMovimentacoes(movimentacoes) {
  if (!movimentacoes?.length) {
    return 'Nenhuma movimentação encontrada.';
  }

  return movimentacoes
    .slice(0, 10)
    .map((movimento, index) => {
      return `${index + 1}. Data: ${movimento.data || 'não informada'} | Movimento: ${movimento.nome || 'não informado'}`;
    })
    .join('\n');
}

export async function gerarResumoProcesso(processo) {
  if (!env.OPENAI_API_KEY) {
    return {
      resumo: 'Resumo por IA não gerado porque OPENAI_API_KEY não está configurada.',
      gerado_por_ia: false,
    };
  }

  const prompt = `
Você é um assistente jurídico para um CRM de advogados.
Resuma o processo abaixo de forma objetiva, sem inventar informações e sem dar aconselhamento jurídico.
Use somente os dados fornecidos.

Dados do processo:
Número: ${processo.numero_cnj}
Tribunal: ${processo.tribunal?.codigo || ''} - ${processo.tribunal?.nome || ''}
Classe: ${processo.capa?.classe || 'não informada'}
Órgão julgador: ${processo.capa?.orgao_julgador || 'não informado'}
Assuntos: ${(processo.capa?.assuntos || []).map((a) => a.nome).filter(Boolean).join(', ') || 'não informados'}
Parte principal: ${processo.parte_principal?.nome || 'não informada'}

Últimas movimentações:
${montarTextoMovimentacoes(processo.ultimas_movimentacoes)}

Retorne um resumo curto em português brasileiro com:
- identificação geral do processo;
- situação aparente com base nas movimentações;
- principais pontos observáveis;
- alerta de que o resumo se baseia apenas em dados públicos disponíveis.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'Você resume movimentações processuais para uso interno de advogados em um CRM jurídico.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      resumo: `Resumo por IA não gerado. Erro OpenAI: ${data?.error?.message || response.status}`,
      gerado_por_ia: false,
    };
  }

  return {
    resumo: data?.choices?.[0]?.message?.content?.trim() || 'Resumo por IA não retornou conteúdo.',
    gerado_por_ia: true,
  };
}

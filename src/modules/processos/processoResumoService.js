import { env } from '../../config/env.js';

let janelaResumoInicio = 0;
let totalResumosNaJanela = 0;

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

function montarPromptResumo(processo) {
  return `
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
}

function verificarRateLimitResumo() {
  const agora = Date.now();
  const minuto = 60 * 1000;

  if (!janelaResumoInicio || agora - janelaResumoInicio >= minuto) {
    janelaResumoInicio = agora;
    totalResumosNaJanela = 0;
  }

  if (totalResumosNaJanela >= env.AI_SUMMARY_MAX_PER_MINUTE) {
    return false;
  }

  totalResumosNaJanela += 1;
  return true;
}

async function gerarResumoComGemini({ prompt }) {
  if (!env.GEMINI_API_KEY) {
    return {
      resumo: 'Resumo por IA não gerado porque GEMINI_API_KEY não está configurada.',
      gerado_por_ia: false,
      provider: 'gemini',
    };
  }

  const endpoint = `${env.GEMINI_BASE_URL}/models/${env.GEMINI_MODEL}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: 'Você resume movimentações processuais para uso interno de advogados em um CRM jurídico. Não dê aconselhamento jurídico e não invente informações.',
          },
        ],
      },
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      resumo: `Resumo por IA não gerado. Erro Gemini: ${data?.error?.message || response.status}`,
      gerado_por_ia: false,
      provider: 'gemini',
    };
  }

  const texto = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  return {
    resumo: texto || 'Resumo por IA não retornou conteúdo.',
    gerado_por_ia: Boolean(texto),
    provider: 'gemini',
  };
}

async function gerarResumoComOpenAI({ prompt }) {
  if (!env.OPENAI_API_KEY) {
    return {
      resumo: 'Resumo por IA não gerado porque OPENAI_API_KEY não está configurada.',
      gerado_por_ia: false,
      provider: 'openai',
    };
  }

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
          content: 'Você resume movimentações processuais para uso interno de advogados em um CRM jurídico. Não dê aconselhamento jurídico e não invente informações.',
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
      provider: 'openai',
    };
  }

  return {
    resumo: data?.choices?.[0]?.message?.content?.trim() || 'Resumo por IA não retornou conteúdo.',
    gerado_por_ia: true,
    provider: 'openai',
  };
}

export async function gerarResumoProcesso(processo, { gerarResumo = env.AI_SUMMARY_ENABLED_DEFAULT } = {}) {
  if (!gerarResumo) {
    return {
      resumo: null,
      gerado_por_ia: false,
      provider: env.AI_PROVIDER,
      status: 'nao_solicitado',
    };
  }

  if (env.AI_PROVIDER === 'none') {
    return {
      resumo: 'Resumo por IA não gerado porque AI_PROVIDER=none.',
      gerado_por_ia: false,
      provider: 'none',
      status: 'desativado',
    };
  }

  if (!verificarRateLimitResumo()) {
    return {
      resumo: 'Resumo por IA não gerado porque o limite interno de resumos por minuto foi atingido.',
      gerado_por_ia: false,
      provider: env.AI_PROVIDER,
      status: 'rate_limited',
    };
  }

  const prompt = montarPromptResumo(processo);

  if (env.AI_PROVIDER === 'gemini') {
    return gerarResumoComGemini({ prompt });
  }

  if (env.AI_PROVIDER === 'openai') {
    return gerarResumoComOpenAI({ prompt });
  }

  return {
    resumo: `Resumo por IA não gerado porque AI_PROVIDER=${env.AI_PROVIDER} não é suportado.`,
    gerado_por_ia: false,
    provider: env.AI_PROVIDER,
    status: 'provider_invalido',
  };
}

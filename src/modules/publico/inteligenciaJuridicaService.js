import { supabaseAdmin } from '../../clients/supabase.js';
import { normalizarTexto, somenteDigitos } from './fase6Utils.js';

function classificarArea(texto = '') {
  const t = normalizarTexto(texto);
  if (/criminal|penal|crime|reu|denuncia|furto|roubo|apropriacao/.test(t)) return 'penal';
  if (/trabalhista|reclamante|reclamada|verbas trabalhistas/.test(t)) return 'trabalhista';
  if (/tributario|execucao fiscal|fazenda|icms|iss|iptu/.test(t)) return 'tributario';
  if (/familia|alimentos|divorcio|guarda|inventario/.test(t)) return 'familia_sucessoes';
  if (/consumidor|produto|servico|banco|telefonia|sabesp|energia/.test(t)) return 'consumidor';
  if (/civel|procedimento comum|indenizacao|obrigacao/.test(t)) return 'civel';
  return 'nao_classificado';
}

function classificarFase(texto = '') {
  const t = normalizarTexto(texto);
  if (/distribuicao|distribuido/.test(t)) return 'inicial';
  if (/citado|citacao|intimado|intimacao/.test(t)) return 'citacao_intimacao';
  if (/contestacao|resposta|manifestacao/.test(t)) return 'postulatoria';
  if (/provas|testemunhas|instrucao/.test(t)) return 'instrucao';
  if (/sentenca|julgado|procedente|improcedente/.test(t)) return 'sentenca';
  if (/recurso|apelacao|agravo/.test(t)) return 'recursal';
  if (/baixa|arquivado|transitado/.test(t)) return 'encerrado';
  return 'andamento';
}

function calcularRisco(texto = '') {
  const t = normalizarTexto(texto);
  let pontos = 0;
  const motivos = [];

  if (/prazo|10 dias|15 dias|cinco dias|5 dias/.test(t)) { pontos += 2; motivos.push('Há menção a prazo.'); }
  if (/citado|citacao|intimado|intimacao/.test(t)) { pontos += 2; motivos.push('Há ato de citação ou intimação.'); }
  if (/sentenca|decisao|despacho/.test(t)) { pontos += 1; motivos.push('Há ato decisório ou despacho.'); }
  if (/reu|denuncia|criminal|penal/.test(t)) { pontos += 1; motivos.push('Há indicativo penal/criminal.'); }
  if (/lugar incerto|nao sabido|edital/.test(t)) { pontos += 1; motivos.push('Há publicação por edital ou localização incerta.'); }

  const nivel = pontos >= 5 ? 'alto' : pontos >= 3 ? 'medio' : pontos >= 1 ? 'baixo' : 'informativo';
  return { nivel, pontos, motivos };
}

function sugestoes(texto = '') {
  const t = normalizarTexto(texto);
  const acoes = [];
  if (/prazo|10 dias|15 dias|5 dias|cinco dias/.test(t)) acoes.push('Verificar prazo processual e criar alerta de vencimento.');
  if (/citacao|citado/.test(t)) acoes.push('Verificar necessidade de resposta/contestação.');
  if (/intimacao|intimado/.test(t)) acoes.push('Analisar teor da intimação e providência cabível.');
  if (/edital/.test(t)) acoes.push('Classificar como publicação por edital e revisar dados extraídos.');
  if (!acoes.length) acoes.push('Acompanhar próximas movimentações e publicações.');
  return acoes;
}

export async function analisarProcessoPublico({ numeroCnj }) {
  const cnj = somenteDigitos(numeroCnj);
  const { data: processo, error } = await supabaseAdmin
    .from('indice_publico_processos')
    .select('*')
    .eq('numero_cnj', cnj)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar processo para análise: ${error.message}`);
  if (!processo) return { encontrado: false, numero_cnj: cnj };

  const texto = [processo.texto_indexavel, processo.ultima_publicacao_texto, processo.resumo_ia].filter(Boolean).join(' ');
  const analise = {
    area: classificarArea(texto),
    fase: classificarFase(texto),
    risco: calcularRisco(texto),
    sugestoes: sugestoes(texto),
    recorrencia: {
      tribunal: processo.tribunal,
      classe: processo.classe,
    },
  };

  const { data, error: upsertError } = await supabaseAdmin
    .from('analises_juridicas_publicas')
    .upsert({
      numero_cnj: cnj,
      area: analise.area,
      fase: analise.fase,
      risco: analise.risco,
      sugestoes: analise.sugestoes,
      recorrencia: analise.recorrencia,
      modelo: 'heuristico-v1',
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'numero_cnj' })
    .select()
    .single();

  if (upsertError) throw new Error(`Erro ao salvar análise jurídica: ${upsertError.message}`);

  return { encontrado: true, numero_cnj: cnj, analise: data };
}

export async function estatisticasRecorrencia({ termo, tribunal, classe }) {
  let query = supabaseAdmin
    .from('indice_publico_processos')
    .select('numero_cnj, tribunal, classe, parte_ativa, parte_passiva, ultima_publicacao_em, texto_indexavel')
    .limit(500);

  if (tribunal) query = query.eq('tribunal', tribunal);
  if (classe) query = query.eq('classe', classe);
  if (termo) query = query.ilike('texto_indexavel', `%${termo}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao gerar recorrência: ${error.message}`);

  const porTribunal = {};
  const porClasse = {};
  for (const p of data || []) {
    if (p.tribunal) porTribunal[p.tribunal] = (porTribunal[p.tribunal] || 0) + 1;
    if (p.classe) porClasse[p.classe] = (porClasse[p.classe] || 0) + 1;
  }

  return {
    total: data?.length || 0,
    por_tribunal: porTribunal,
    por_classe: porClasse,
    amostra: (data || []).slice(0, 20),
  };
}

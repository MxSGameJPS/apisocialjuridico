export function normalizarTexto(valor = '') {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function somenteDigitos(valor = '') {
  return String(valor || '').replace(/\D/g, '');
}

export function extrairCpfCnpj(texto = '') {
  const bruto = String(texto || '');
  const matches = bruto.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g) || [];
  return [...new Set(matches.map(somenteDigitos))];
}

export function tokensRelevantes(texto = '') {
  const ignorar = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'para', 'por', 'com', 'sem', 'um', 'uma']);
  return normalizarTexto(texto)
    .split(' ')
    .filter((token) => token.length >= 3 && !ignorar.has(token));
}

export function scoreSimilaridade(a = '', b = '') {
  const tokensA = new Set(tokensRelevantes(a));
  const tokensB = new Set(tokensRelevantes(b));

  if (!tokensA.size || !tokensB.size) return 0;

  let intersecao = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersecao += 1;
  }

  const uniao = new Set([...tokensA, ...tokensB]).size;
  return Number((intersecao / uniao).toFixed(4));
}

export function montarOab(uf, numero) {
  if (!uf && !numero) return null;
  return `${String(uf || '').toUpperCase()}${somenteDigitos(numero)}`;
}

import crypto from 'node:crypto';

const CNJ_REGEX = /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g;

export function normalizarOab(oab) {
  return String(oab || '').replace(/\D/g, '');
}

export function normalizarUf(uf) {
  return String(uf || '').trim().toUpperCase();
}

export function extrairCnjsDoTexto(texto = '') {
  const matches = String(texto).match(CNJ_REGEX) || [];
  const vistos = new Set();

  return matches
    .map((numero) => numero.replace(/\D/g, ''))
    .filter((numero) => numero.length === 20)
    .filter((numero) => {
      if (vistos.has(numero)) return false;
      vistos.add(numero);
      return true;
    });
}

export function gerarHashPublicacao(publicacao) {
  const base = [
    publicacao?.numero_cnj || '',
    publicacao?.data_publicacao || '',
    publicacao?.data_disponibilizacao || '',
    publicacao?.texto || '',
    publicacao?.oab || '',
    publicacao?.uf || '',
  ].join('|');

  return crypto.createHash('sha256').update(base).digest('hex');
}

export function normalizarListaPublicacoes(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.comunicacoes)) return payload.comunicacoes;
  if (Array.isArray(payload?.resultado)) return payload.resultado;
  return [];
}

export function formatarDataYYYYMMDD(date) {
  return date.toISOString().slice(0, 10);
}

export function calcularPeriodoRetroativo(dias) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - Number(dias || 7));

  return {
    dataInicio: formatarDataYYYYMMDD(inicio),
    dataFim: formatarDataYYYYMMDD(fim),
  };
}

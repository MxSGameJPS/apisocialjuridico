const TRIBUNAIS_POR_SEGMENTO = {
  // Justiça Estadual
  '8.01': { codigo: 'TJAC', aliasDataJud: 'tjac', nome: 'Tribunal de Justiça do Acre' },
  '8.02': { codigo: 'TJAL', aliasDataJud: 'tjal', nome: 'Tribunal de Justiça de Alagoas' },
  '8.03': { codigo: 'TJAP', aliasDataJud: 'tjap', nome: 'Tribunal de Justiça do Amapá' },
  '8.04': { codigo: 'TJAM', aliasDataJud: 'tjam', nome: 'Tribunal de Justiça do Amazonas' },
  '8.05': { codigo: 'TJBA', aliasDataJud: 'tjba', nome: 'Tribunal de Justiça da Bahia' },
  '8.06': { codigo: 'TJCE', aliasDataJud: 'tjce', nome: 'Tribunal de Justiça do Ceará' },
  '8.07': { codigo: 'TJDFT', aliasDataJud: 'tjdft', nome: 'Tribunal de Justiça do Distrito Federal e Territórios' },
  '8.08': { codigo: 'TJES', aliasDataJud: 'tjes', nome: 'Tribunal de Justiça do Espírito Santo' },
  '8.09': { codigo: 'TJGO', aliasDataJud: 'tjgo', nome: 'Tribunal de Justiça de Goiás' },
  '8.10': { codigo: 'TJMA', aliasDataJud: 'tjma', nome: 'Tribunal de Justiça do Maranhão' },
  '8.11': { codigo: 'TJMT', aliasDataJud: 'tjmt', nome: 'Tribunal de Justiça do Mato Grosso' },
  '8.12': { codigo: 'TJMS', aliasDataJud: 'tjms', nome: 'Tribunal de Justiça do Mato Grosso do Sul' },
  '8.13': { codigo: 'TJMG', aliasDataJud: 'tjmg', nome: 'Tribunal de Justiça de Minas Gerais' },
  '8.14': { codigo: 'TJPA', aliasDataJud: 'tjpa', nome: 'Tribunal de Justiça do Pará' },
  '8.15': { codigo: 'TJPB', aliasDataJud: 'tjpb', nome: 'Tribunal de Justiça da Paraíba' },
  '8.16': { codigo: 'TJPR', aliasDataJud: 'tjpr', nome: 'Tribunal de Justiça do Paraná' },
  '8.17': { codigo: 'TJPE', aliasDataJud: 'tjpe', nome: 'Tribunal de Justiça de Pernambuco' },
  '8.18': { codigo: 'TJPI', aliasDataJud: 'tjpi', nome: 'Tribunal de Justiça do Piauí' },
  '8.19': { codigo: 'TJRJ', aliasDataJud: 'tjrj', nome: 'Tribunal de Justiça do Rio de Janeiro' },
  '8.20': { codigo: 'TJRN', aliasDataJud: 'tjrn', nome: 'Tribunal de Justiça do Rio Grande do Norte' },
  '8.21': { codigo: 'TJRS', aliasDataJud: 'tjrs', nome: 'Tribunal de Justiça do Rio Grande do Sul' },
  '8.22': { codigo: 'TJRO', aliasDataJud: 'tjro', nome: 'Tribunal de Justiça de Rondônia' },
  '8.23': { codigo: 'TJRR', aliasDataJud: 'tjrr', nome: 'Tribunal de Justiça de Roraima' },
  '8.24': { codigo: 'TJSC', aliasDataJud: 'tjsc', nome: 'Tribunal de Justiça de Santa Catarina' },
  '8.25': { codigo: 'TJSE', aliasDataJud: 'tjse', nome: 'Tribunal de Justiça de Sergipe' },
  '8.26': { codigo: 'TJSP', aliasDataJud: 'tjsp', nome: 'Tribunal de Justiça de São Paulo' },
  '8.27': { codigo: 'TJTO', aliasDataJud: 'tjto', nome: 'Tribunal de Justiça do Tocantins' },

  // Justiça Federal
  '4.01': { codigo: 'TRF1', aliasDataJud: 'trf1', nome: 'Tribunal Regional Federal da 1ª Região' },
  '4.02': { codigo: 'TRF2', aliasDataJud: 'trf2', nome: 'Tribunal Regional Federal da 2ª Região' },
  '4.03': { codigo: 'TRF3', aliasDataJud: 'trf3', nome: 'Tribunal Regional Federal da 3ª Região' },
  '4.04': { codigo: 'TRF4', aliasDataJud: 'trf4', nome: 'Tribunal Regional Federal da 4ª Região' },
  '4.05': { codigo: 'TRF5', aliasDataJud: 'trf5', nome: 'Tribunal Regional Federal da 5ª Região' },
  '4.06': { codigo: 'TRF6', aliasDataJud: 'trf6', nome: 'Tribunal Regional Federal da 6ª Região' },
};

export function limparNumeroCNJ(numero) {
  return String(numero || '').replace(/\D/g, '');
}

export function formatarNumeroCNJ(numero) {
  const limpo = limparNumeroCNJ(numero);

  if (limpo.length !== 20) return numero;

  return `${limpo.slice(0, 7)}-${limpo.slice(7, 9)}.${limpo.slice(9, 13)}.${limpo.slice(13, 14)}.${limpo.slice(14, 16)}.${limpo.slice(16, 20)}`;
}

export function validarNumeroCNJ(numero) {
  return limparNumeroCNJ(numero).length === 20;
}

export function detectarTribunalPorCNJ(numero) {
  const limpo = limparNumeroCNJ(numero);

  if (limpo.length !== 20) {
    return null;
  }

  const ramoJustica = limpo.slice(13, 14);
  const tribunal = limpo.slice(14, 16);
  const segmento = `${ramoJustica}.${tribunal}`;

  return TRIBUNAIS_POR_SEGMENTO[segmento] || null;
}

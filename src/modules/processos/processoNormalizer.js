function extrairNome(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return valor;
  return valor.nome || valor.name || valor.razaoSocial || null;
}

function normalizarPartes(processoBruto) {
  const partes = [];

  const possiveisPartes = [
    ...(Array.isArray(processoBruto.partes) ? processoBruto.partes : []),
    ...(Array.isArray(processoBruto.poloAtivo) ? processoBruto.poloAtivo : []),
    ...(Array.isArray(processoBruto.poloPassivo) ? processoBruto.poloPassivo : []),
  ];

  for (const parte of possiveisPartes) {
    const nome = extrairNome(parte);

    if (!nome) continue;

    partes.push({
      nome,
      tipo: parte.tipo || parte.tipoParte || parte.polo || null,
      documento: parte.documento || parte.cpf || parte.cnpj || null,
      advogados: Array.isArray(parte.advogados)
        ? parte.advogados.map((advogado) => ({
            nome: extrairNome(advogado),
            oab: advogado.oab || advogado.numeroOab || null,
            ufOab: advogado.ufOab || advogado.uf_oab || null,
          }))
        : [],
    });
  }

  const nomesUnicos = new Set();

  return partes.filter((parte) => {
    const chave = `${parte.nome}-${parte.tipo || ''}`.toLowerCase();
    if (nomesUnicos.has(chave)) return false;
    nomesUnicos.add(chave);
    return true;
  });
}

function normalizarMovimentacoes(processoBruto) {
  const movimentos = Array.isArray(processoBruto.movimentos)
    ? processoBruto.movimentos
    : Array.isArray(processoBruto.movimentacoes)
      ? processoBruto.movimentacoes
      : [];

  return movimentos
    .map((movimento) => ({
      data: movimento.dataHora || movimento.data || movimento.dataMovimento || null,
      nome: movimento.nome || movimento.descricao || movimento.tipo || null,
      codigo: movimento.codigo || null,
      complemento: movimento.complemento || movimento.complementosTabelados || null,
      raw: movimento,
    }))
    .filter((movimento) => movimento.nome || movimento.data)
    .sort((a, b) => {
      if (!a.data || !b.data) return 0;
      return new Date(b.data) - new Date(a.data);
    })
    .slice(0, 20);
}

function normalizarAssuntos(processoBruto) {
  const assuntos = Array.isArray(processoBruto.assuntos) ? processoBruto.assuntos : [];

  return assuntos
    .map((assunto) => ({
      codigo: assunto.codigo || null,
      nome: assunto.nome || assunto.descricao || null,
    }))
    .filter((assunto) => assunto.nome || assunto.codigo);
}

export function normalizarProcessoDataJud({ processoBruto, tribunalDetectado }) {
  const partes = normalizarPartes(processoBruto);
  const movimentacoes = normalizarMovimentacoes(processoBruto);
  const assuntos = normalizarAssuntos(processoBruto);

  return {
    numero_cnj: processoBruto.numeroProcesso || null,
    tribunal: {
      codigo: tribunalDetectado?.codigo || processoBruto.tribunal || null,
      nome: tribunalDetectado?.nome || processoBruto.tribunal || null,
      alias_datajud: tribunalDetectado?.aliasDataJud || null,
    },
    capa: {
      classe: processoBruto.classe?.nome || processoBruto.classe || null,
      classe_codigo: processoBruto.classe?.codigo || null,
      area: processoBruto.area || null,
      grau: processoBruto.grau || null,
      sistema: processoBruto.sistema?.nome || processoBruto.sistema || null,
      formato: processoBruto.formato?.nome || processoBruto.formato || null,
      orgao_julgador: processoBruto.orgaoJulgador?.nome || processoBruto.orgaoJulgador || null,
      orgao_julgador_codigo: processoBruto.orgaoJulgador?.codigo || null,
      data_ajuizamento: processoBruto.dataAjuizamento || null,
      data_ultima_atualizacao: processoBruto.dataHoraUltimaAtualizacao || null,
      nivel_sigilo: processoBruto.nivelSigilo ?? null,
      assuntos,
    },
    parte_principal: partes[0] || null,
    demais_partes: partes.slice(1),
    partes,
    ultimas_movimentacoes: movimentacoes,
    raw: processoBruto,
    avisos: partes.length === 0
      ? ['O DataJud pode não retornar nomes das partes para todos os tribunais/processos.']
      : [],
  };
}

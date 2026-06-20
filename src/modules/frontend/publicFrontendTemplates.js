function layout({ title = 'Busca Processual', body = '', extraScript = '' }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | API Social Jurídico</title>
  <style>
    :root { --bg:#0f1115; --panel:#171a21; --muted:#9ca3af; --text:#f9fafb; --brand:#8b1e2d; --brand2:#b91c1c; --line:#2a2f3a; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:linear-gradient(180deg,#111827,#0f1115); color:var(--text); }
    a { color:inherit; }
    .wrap { max-width:1120px; margin:0 auto; padding:28px 18px 60px; }
    .nav { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:46px; }
    .logo { display:flex; align-items:center; gap:12px; font-weight:800; letter-spacing:-.02em; }
    .mark { width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,var(--brand),var(--brand2)); display:grid; place-items:center; box-shadow:0 10px 30px rgba(185,28,28,.25); }
    .nav a { text-decoration:none; color:var(--muted); font-size:14px; margin-left:18px; }
    .hero { text-align:center; padding:54px 0 32px; }
    h1 { font-size:clamp(34px,5vw,64px); line-height:1.02; margin:0 0 18px; letter-spacing:-.05em; }
    .lead { color:#cbd5e1; max-width:760px; margin:0 auto 28px; font-size:18px; line-height:1.6; }
    .searchBox { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:22px; padding:12px; display:flex; gap:10px; max-width:820px; margin:0 auto; box-shadow:0 20px 60px rgba(0,0,0,.25); }
    input, select { width:100%; background:#0b0d11; color:var(--text); border:1px solid var(--line); border-radius:14px; padding:15px 16px; font-size:16px; outline:none; }
    button,.btn { background:linear-gradient(135deg,var(--brand),var(--brand2)); color:white; border:0; border-radius:14px; padding:15px 22px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; white-space:nowrap; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:32px; }
    .card { background:rgba(255,255,255,.055); border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:20px; }
    .card h3 { margin:0 0 8px; font-size:18px; }
    .muted { color:var(--muted); }
    .results { margin-top:26px; display:grid; gap:14px; }
    .result { background:#151922; border:1px solid var(--line); border-radius:18px; padding:18px; }
    .result h2 { font-size:19px; margin:0 0 8px; }
    .pill { display:inline-flex; border:1px solid var(--line); color:#cbd5e1; padding:5px 10px; border-radius:999px; font-size:12px; margin:4px 6px 4px 0; }
    .meta { color:var(--muted); font-size:14px; line-height:1.6; }
    .actions { margin-top:14px; display:flex; gap:10px; flex-wrap:wrap; }
    .secondary { background:#232936; }
    .sectionTitle { margin:28px 0 12px; }
    .timeline { border-left:2px solid var(--line); padding-left:18px; display:grid; gap:14px; }
    .event { position:relative; background:#151922; border:1px solid var(--line); border-radius:16px; padding:16px; }
    .event:before { content:''; position:absolute; left:-26px; top:18px; width:12px; height:12px; border-radius:50%; background:var(--brand2); }
    .footer { margin-top:48px; color:var(--muted); font-size:13px; text-align:center; }
    @media (max-width:800px){ .searchBox{flex-direction:column}.grid{grid-template-columns:1fr}.nav{align-items:flex-start}.navLinks{display:none} }
  </style>
</head>
<body>
  <main class="wrap">
    <nav class="nav">
      <div class="logo"><span class="mark">SJ</span><span>API Social Jurídico</span></div>
      <div class="navLinks"><a href="/app">Buscar</a><a href="/docs">API Docs</a><a href="/app/comercial">API Comercial</a></div>
    </nav>
    ${body}
    <div class="footer">Dados processuais públicos. Protótipo de produto público da API Social Jurídico.</div>
  </main>
  ${extraScript}
</body>
</html>`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resultCard(item) {
  return `<article class="result">
    <h2>${escapeHtml(item.numero_cnj_formatado || item.numero_cnj || 'Processo')}</h2>
    <div><span class="pill">${escapeHtml(item.tribunal || 'Tribunal')}</span><span class="pill">${escapeHtml(item.classe || 'Classe não informada')}</span><span class="pill">Score ${item.score ?? '-'}</span></div>
    <p class="meta"><b>Órgão:</b> ${escapeHtml(item.orgao || '-')}<br/><b>Parte ativa:</b> ${escapeHtml(item.parte_ativa || '-')}<br/><b>Parte passiva:</b> ${escapeHtml(item.parte_passiva || '-')}<br/><b>Última publicação:</b> ${escapeHtml(item.ultima_publicacao_em || '-')}</p>
    ${item.resumo_ia ? `<p class="meta">${escapeHtml(item.resumo_ia).slice(0, 420)}...</p>` : ''}
    <div class="actions"><a class="btn" href="/app/processo/${item.numero_cnj}">Ver processo</a><a class="btn secondary" href="/app/busca?q=${encodeURIComponent(item.parte_passiva || item.parte_ativa || item.numero_cnj)}">Buscar relacionados</a></div>
  </article>`;
}

export function homePage() {
  return layout({
    title: 'Busca Processual',
    body: `<section class="hero">
      <h1>Busque processos, partes, empresas e advogados.</h1>
      <p class="lead">Protótipo público da API Social Jurídico com índice processual, dossiê, timeline e inteligência jurídica.</p>
      <form class="searchBox" action="/app/busca" method="get">
        <input name="q" placeholder="Digite nome, empresa, CPF/CNPJ, OAB ou CNJ" required />
        <button type="submit">Buscar</button>
      </form>
      <div class="grid">
        <div class="card"><h3>Busca pública</h3><p class="muted">Pesquisa textual, ranking e paginação.</p></div>
        <div class="card"><h3>Dossiê</h3><p class="muted">Pessoas, empresas e processos vinculados.</p></div>
        <div class="card"><h3>Timeline</h3><p class="muted">Eventos processuais em ordem cronológica.</p></div>
      </div>
    </section>`
  });
}

export function searchPage({ query, data }) {
  const resultados = data?.resultados || [];
  return layout({
    title: `Busca por ${query || ''}`,
    body: `<section>
      <h1>Resultados de busca</h1>
      <form class="searchBox" action="/app/busca" method="get">
        <input name="q" value="${escapeHtml(query || '')}" placeholder="Digite nome, empresa, CPF/CNPJ, OAB ou CNJ" required />
        <button type="submit">Buscar</button>
      </form>
      <p class="muted">${data?.total || 0} resultado(s), página ${data?.pagina || 1} de ${data?.total_paginas || 1}.</p>
      <div class="results">${resultados.length ? resultados.map(resultCard).join('') : '<div class="card"><h3>Nenhum resultado encontrado</h3><p class="muted">Tente outro termo ou enriqueça a base pelo DJEN.</p></div>'}</div>
    </section>`
  });
}

export function processPage({ numeroCnj, timeline, analise }) {
  const processo = timeline?.processo || {};
  const eventos = timeline?.eventos || [];
  const risco = analise?.analise?.risco;
  return layout({
    title: processo.numero_cnj_formatado || numeroCnj,
    body: `<section>
      <h1>${escapeHtml(processo.numero_cnj_formatado || numeroCnj)}</h1>
      <p class="lead">${escapeHtml(processo.classe || 'Processo público')} — ${escapeHtml(processo.tribunal || '')}</p>
      <div class="grid">
        <div class="card"><h3>Parte ativa</h3><p class="muted">${escapeHtml(processo.parte_ativa || '-')}</p></div>
        <div class="card"><h3>Parte passiva</h3><p class="muted">${escapeHtml(processo.parte_passiva || '-')}</p></div>
        <div class="card"><h3>Risco IA</h3><p class="muted">${escapeHtml(risco?.nivel || 'não analisado')}</p></div>
      </div>
      <h2 class="sectionTitle">Timeline processual</h2>
      <div class="timeline">${eventos.length ? eventos.map(e => `<div class="event"><b>${escapeHtml(e.titulo || e.tipo)}</b><p class="meta">${escapeHtml(e.data || '-')} · ${escapeHtml(e.origem || '-')}</p><p class="meta">${escapeHtml(e.descricao || '').slice(0, 520)}</p></div>`).join('') : '<div class="card">Nenhum evento encontrado.</div>'}</div>
    </section>`
  });
}

export function commercialPage() {
  return layout({
    title: 'API Comercial',
    body: `<section class="hero"><h1>API Comercial Social Jurídico</h1><p class="lead">Endpoints comerciais com API keys, limites por plano, logs de uso e rotas versionadas.</p>
      <div class="grid"><div class="card"><h3>Free</h3><p class="muted">Teste e validação.</p></div><div class="card"><h3>Start/Pro</h3><p class="muted">Uso comercial escalável.</p></div><div class="card"><h3>Enterprise</h3><p class="muted">Alto volume e integrações.</p></div></div>
      <div class="actions" style="justify-content:center;margin-top:26px"><a class="btn" href="/docs">Ver documentação</a></div></section>`
  });
}

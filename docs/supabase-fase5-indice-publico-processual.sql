create table if not exists public.indice_publico_processos (
  id uuid primary key default gen_random_uuid(),
  numero_cnj text not null,
  numero_cnj_formatado text null,
  tribunal text null,
  orgao text null,
  classe text null,
  codigo_classe text null,
  assunto jsonb not null default '[]'::jsonb,
  parte_ativa text null,
  parte_passiva text null,
  partes jsonb not null default '[]'::jsonb,
  advogados jsonb not null default '[]'::jsonb,
  oabs text[] not null default '{}',
  ultima_publicacao_em text null,
  ultima_publicacao_tipo text null,
  ultima_publicacao_texto text null,
  ultima_publicacao_id text null,
  resumo_ia text null,
  raw_datajud jsonb null,
  raw_publicacao jsonb null,
  texto_indexavel text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint indice_publico_processos_numero_cnj_unique unique (numero_cnj)
);

create index if not exists indice_publico_processos_numero_cnj_idx
  on public.indice_publico_processos (numero_cnj);

create index if not exists indice_publico_processos_tribunal_idx
  on public.indice_publico_processos (tribunal);

create index if not exists indice_publico_processos_classe_idx
  on public.indice_publico_processos (classe);

create index if not exists indice_publico_processos_atualizado_em_idx
  on public.indice_publico_processos (atualizado_em desc);

create index if not exists indice_publico_processos_partes_gin_idx
  on public.indice_publico_processos using gin (partes);

create index if not exists indice_publico_processos_advogados_gin_idx
  on public.indice_publico_processos using gin (advogados);

create index if not exists indice_publico_processos_oabs_gin_idx
  on public.indice_publico_processos using gin (oabs);

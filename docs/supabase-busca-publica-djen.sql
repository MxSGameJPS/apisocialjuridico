create table if not exists public.buscas_publicas_djen (
  id uuid primary key default gen_random_uuid(),
  fonte text not null default 'DJEN',
  filtros jsonb not null default '{}'::jsonb,
  total_retornado integer not null default 0,
  url_consultada text null,
  raw_resumo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.djen_publicacoes
  add column if not exists comunicacao_id text null;

alter table public.djen_publicacoes
  add column if not exists numero_cnj_formatado text null;

alter table public.djen_publicacoes
  add column if not exists classe text null;

alter table public.djen_publicacoes
  add column if not exists codigo_classe text null;

alter table public.djen_publicacoes
  add column if not exists tipo_documento text null;

alter table public.djen_publicacoes
  add column if not exists partes jsonb not null default '[]'::jsonb;

alter table public.djen_publicacoes
  add column if not exists advogados jsonb not null default '[]'::jsonb;

create index if not exists buscas_publicas_djen_created_at_idx
  on public.buscas_publicas_djen (created_at desc);

create index if not exists buscas_publicas_djen_filtros_gin_idx
  on public.buscas_publicas_djen using gin (filtros);

create index if not exists djen_publicacoes_classe_idx
  on public.djen_publicacoes (classe);

create index if not exists djen_publicacoes_comunicacao_id_idx
  on public.djen_publicacoes (comunicacao_id);

create table if not exists public.entidades_publicas (
  id uuid primary key default gen_random_uuid(),
  nome text null,
  nome_normalizado text not null,
  tipo text not null default 'pessoa_fisica',
  documento_principal text null,
  documentos text[] not null default '{}',
  origem text null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint entidades_publicas_documento_unique unique (documento_principal),
  constraint entidades_publicas_nome_unique unique (nome_normalizado)
);

create table if not exists public.entidades_processos (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references public.entidades_publicas(id) on delete cascade,
  numero_cnj text not null,
  papel text null,
  origem text null,
  created_at timestamptz not null default now(),
  constraint entidades_processos_unique unique (entidade_id, numero_cnj, papel)
);

create table if not exists public.analises_juridicas_publicas (
  id uuid primary key default gen_random_uuid(),
  numero_cnj text not null,
  area text null,
  fase text null,
  risco jsonb not null default '{}'::jsonb,
  sugestoes jsonb not null default '[]'::jsonb,
  recorrencia jsonb not null default '{}'::jsonb,
  modelo text not null default 'heuristico-v1',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint analises_juridicas_publicas_numero_cnj_unique unique (numero_cnj)
);

create index if not exists entidades_publicas_nome_idx on public.entidades_publicas (nome_normalizado);
create index if not exists entidades_publicas_tipo_idx on public.entidades_publicas (tipo);
create index if not exists entidades_publicas_documento_idx on public.entidades_publicas (documento_principal);
create index if not exists entidades_processos_entidade_id_idx on public.entidades_processos (entidade_id);
create index if not exists entidades_processos_numero_cnj_idx on public.entidades_processos (numero_cnj);
create index if not exists analises_juridicas_publicas_numero_cnj_idx on public.analises_juridicas_publicas (numero_cnj);
create index if not exists analises_juridicas_publicas_area_idx on public.analises_juridicas_publicas (area);
create index if not exists analises_juridicas_publicas_fase_idx on public.analises_juridicas_publicas (fase);

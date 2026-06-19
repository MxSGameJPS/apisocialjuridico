create table if not exists public.processos_importados (
  id uuid primary key default gen_random_uuid(),
  numero_cnj text not null,
  advogado_id text not null,
  usuario_id text null,
  tribunal_codigo text null,
  tribunal_nome text null,
  capa jsonb not null default '{}'::jsonb,
  parte_principal jsonb null,
  demais_partes jsonb not null default '[]'::jsonb,
  partes jsonb not null default '[]'::jsonb,
  cliente_manual jsonb null,
  parte_contraria_manual jsonb null,
  ultimas_movimentacoes jsonb not null default '[]'::jsonb,
  resumo_ia text null,
  resumo_ia_gerado boolean not null default false,
  raw_datajud jsonb not null default '{}'::jsonb,
  avisos jsonb not null default '[]'::jsonb,
  baixado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint processos_importados_numero_advogado_unique unique (numero_cnj, advogado_id)
);

alter table public.processos_importados
  add column if not exists cliente_manual jsonb null;

alter table public.processos_importados
  add column if not exists parte_contraria_manual jsonb null;

create index if not exists processos_importados_numero_cnj_idx
  on public.processos_importados (numero_cnj);

create index if not exists processos_importados_advogado_id_idx
  on public.processos_importados (advogado_id);

create index if not exists processos_importados_tribunal_codigo_idx
  on public.processos_importados (tribunal_codigo);

create index if not exists processos_importados_cliente_manual_nome_idx
  on public.processos_importados ((cliente_manual->>'nome'));

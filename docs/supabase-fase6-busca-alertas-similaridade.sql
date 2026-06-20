create extension if not exists pg_trgm;

create table if not exists public.alertas_publicos (
  id uuid primary key default gen_random_uuid(),
  usuario_id text null,
  advogado_id text null,
  tipo text not null,
  valor text not null,
  valor_normalizado text not null,
  filtros jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  ultima_execucao timestamptz null,
  status_ultima_execucao text null,
  mensagem_ultima_execucao text null,
  total_ocorrencias integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alertas_publicos_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  alerta_id uuid not null references public.alertas_publicos(id) on delete cascade,
  numero_cnj text null,
  hash_publicacao text not null,
  titulo text null,
  resumo text null,
  raw jsonb not null default '{}'::jsonb,
  lida boolean not null default false,
  created_at timestamptz not null default now(),
  constraint alertas_publicos_ocorrencias_unique unique (alerta_id, hash_publicacao)
);

create index if not exists alertas_publicos_tipo_idx
  on public.alertas_publicos (tipo);

create index if not exists alertas_publicos_valor_normalizado_idx
  on public.alertas_publicos (valor_normalizado);

create index if not exists alertas_publicos_ativo_idx
  on public.alertas_publicos (ativo);

create index if not exists alertas_publicos_ocorrencias_alerta_id_idx
  on public.alertas_publicos_ocorrencias (alerta_id);

create index if not exists alertas_publicos_ocorrencias_numero_cnj_idx
  on public.alertas_publicos_ocorrencias (numero_cnj);

create index if not exists indice_publico_processos_texto_trgm_idx
  on public.indice_publico_processos using gin (texto_indexavel gin_trgm_ops);

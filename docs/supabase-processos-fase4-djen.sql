create table if not exists public.advogados_monitoramento (
  id uuid primary key default gen_random_uuid(),
  advogado_id text not null,
  usuario_id text null,
  oab text not null,
  uf text not null,
  ativo boolean not null default true,
  ultima_consulta timestamptz null,
  status_ultima_consulta text null,
  mensagem_ultima_consulta text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advogados_monitoramento_unique unique (advogado_id, oab, uf)
);

create table if not exists public.djen_publicacoes (
  id uuid primary key default gen_random_uuid(),
  advogado_id text not null,
  processo_importado_id uuid null references public.processos_importados(id) on delete set null,
  numero_cnj text null,
  oab text not null,
  uf text not null,
  tribunal text null,
  orgao text null,
  data_publicacao text null,
  data_disponibilizacao text null,
  tipo text null,
  texto text null,
  link text null,
  hash_publicacao text not null,
  processado boolean not null default false,
  status_processamento text null,
  processado_em timestamptz null,
  raw_djen jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint djen_publicacoes_hash_unique unique (hash_publicacao)
);

create table if not exists public.notificacoes_processos (
  id uuid primary key default gen_random_uuid(),
  advogado_id text not null,
  tipo text not null,
  titulo text not null,
  mensagem text null,
  lida boolean not null default false,
  numero_cnj text null,
  processo_importado_id uuid null references public.processos_importados(id) on delete set null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

create index if not exists advogados_monitoramento_advogado_id_idx
  on public.advogados_monitoramento (advogado_id);

create index if not exists advogados_monitoramento_oab_uf_idx
  on public.advogados_monitoramento (oab, uf);

create index if not exists djen_publicacoes_advogado_id_idx
  on public.djen_publicacoes (advogado_id);

create index if not exists djen_publicacoes_numero_cnj_idx
  on public.djen_publicacoes (numero_cnj);

create index if not exists djen_publicacoes_hash_idx
  on public.djen_publicacoes (hash_publicacao);

create index if not exists notificacoes_processos_advogado_id_idx
  on public.notificacoes_processos (advogado_id);

create index if not exists notificacoes_processos_lida_idx
  on public.notificacoes_processos (lida);

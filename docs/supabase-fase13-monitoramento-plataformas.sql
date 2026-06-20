-- Fase 13 — Monitoramento OAB/CNJ para plataformas
-- Execute no SQL Editor do Supabase antes de usar os endpoints /api/v1/monitoramentos/*.

create extension if not exists pgcrypto;

create table if not exists public.api_monitoramentos_plataforma (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid null references public.api_clientes(id),
  api_key_id uuid null references public.api_keys(id),
  owner_ref text null,
  tipo text not null check (tipo in ('oab', 'cnj')),
  valor text not null,
  valor_normalizado text not null,
  uf text null,
  oab text null,
  numero_cnj text null,
  plataforma_ref text null,
  webhook_url text null,
  filtros jsonb not null default '{}'::jsonb,
  frequencia_minutos integer not null default 360 check (frequencia_minutos >= 30),
  ativo boolean not null default true,
  status_ultima_execucao text null,
  mensagem_ultima_execucao text null,
  ultima_execucao timestamptz null,
  proxima_execucao timestamptz null,
  total_eventos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists api_monitoramentos_plataforma_cliente_tipo_valor_idx
  on public.api_monitoramentos_plataforma (cliente_id, tipo, valor_normalizado)
  where cliente_id is not null;

create index if not exists api_monitoramentos_plataforma_due_idx
  on public.api_monitoramentos_plataforma (ativo, proxima_execucao, ultima_execucao);

create index if not exists api_monitoramentos_plataforma_owner_idx
  on public.api_monitoramentos_plataforma (owner_ref, tipo, valor_normalizado);

create table if not exists public.api_monitoramento_eventos (
  id uuid primary key default gen_random_uuid(),
  monitoramento_id uuid not null references public.api_monitoramentos_plataforma(id),
  cliente_id uuid null references public.api_clientes(id),
  api_key_id uuid null references public.api_keys(id),
  tipo text not null check (tipo in ('novo_processo_oab', 'publicacao_djen', 'movimentacao_datajud', 'processo_atualizado')),
  chave_evento text not null,
  numero_cnj text null,
  hash_publicacao text null,
  titulo text null,
  descricao text null,
  fonte text null,
  data_evento timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  lido boolean not null default false,
  entregue_webhook boolean not null default false,
  tentativas_webhook integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists api_monitoramento_eventos_monitoramento_chave_idx
  on public.api_monitoramento_eventos (monitoramento_id, chave_evento);

create index if not exists api_monitoramento_eventos_cliente_idx
  on public.api_monitoramento_eventos (cliente_id, created_at desc);

create index if not exists api_monitoramento_eventos_lido_idx
  on public.api_monitoramento_eventos (cliente_id, lido, created_at desc);

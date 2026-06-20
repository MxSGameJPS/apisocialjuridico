-- Fase 13.2 — Confirmação de vínculos e árvore OAB -> processo -> parte

create extension if not exists pgcrypto;

create table if not exists public.api_vinculos_processuais_plataforma (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid null references public.api_clientes(id),
  api_key_id uuid null references public.api_keys(id),
  owner_ref text null,
  plataforma_ref text null,
  tipo_vinculo text not null check (tipo_vinculo in ('cliente_confirmado', 'parte_contraria', 'ignorado', 'vinculo_incorreto')),
  numero_cnj text not null,
  uf text null,
  oab text null,
  oab_normalizada text null,
  parte_nome text not null,
  parte_polo text null check (parte_polo in ('ativa', 'passiva', 'outras') or parte_polo is null),
  parte_tipo text null,
  parte_documento_hash text null,
  parte_documento_mascarado text null,
  origem text not null default 'confirmacao_plataforma',
  confianca numeric(3,2) not null default 1.00,
  observacao text null,
  payload jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_vinculos_processuais_cliente_idx
  on public.api_vinculos_processuais_plataforma (cliente_id, numero_cnj, ativo);

create index if not exists api_vinculos_processuais_owner_idx
  on public.api_vinculos_processuais_plataforma (owner_ref, numero_cnj, ativo);

create index if not exists api_vinculos_processuais_oab_idx
  on public.api_vinculos_processuais_plataforma (oab_normalizada, numero_cnj, ativo);

create unique index if not exists api_vinculos_processuais_unique_cliente_idx
  on public.api_vinculos_processuais_plataforma (cliente_id, numero_cnj, oab_normalizada, parte_nome, coalesce(parte_polo, ''), tipo_vinculo)
  where cliente_id is not null and ativo = true;

create unique index if not exists api_vinculos_processuais_unique_owner_idx
  on public.api_vinculos_processuais_plataforma (owner_ref, numero_cnj, oab_normalizada, parte_nome, coalesce(parte_polo, ''), tipo_vinculo)
  where cliente_id is null and ativo = true;

create table if not exists public.api_vinculos_processuais_auditoria (
  id uuid primary key default gen_random_uuid(),
  vinculo_id uuid null references public.api_vinculos_processuais_plataforma(id),
  cliente_id uuid null references public.api_clientes(id),
  owner_ref text null,
  acao text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_vinculos_processuais_auditoria_vinculo_idx
  on public.api_vinculos_processuais_auditoria (vinculo_id, created_at desc);

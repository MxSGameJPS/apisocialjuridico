create table if not exists public.api_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  documento text null,
  plano text not null default 'free',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_clientes_email_unique unique (email)
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.api_clientes(id) on delete cascade,
  nome text not null default 'Chave principal',
  key_hash text not null,
  key_prefix text not null,
  key_masked text not null,
  plano text not null default 'free',
  ativo boolean not null default true,
  limite_minuto integer not null default 10,
  limite_dia integer not null default 100,
  limite_mes integer not null default 1000,
  ultimo_uso_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_keys_hash_unique unique (key_hash)
);

create table if not exists public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid null references public.api_keys(id) on delete set null,
  cliente_id uuid null references public.api_clientes(id) on delete set null,
  metodo text null,
  rota text null,
  ip text null,
  user_agent text null,
  status_code integer null,
  sucesso boolean not null default true,
  erro text null,
  created_at timestamptz not null default now()
);

create index if not exists api_clientes_email_idx on public.api_clientes (email);
create index if not exists api_clientes_plano_idx on public.api_clientes (plano);
create index if not exists api_keys_cliente_id_idx on public.api_keys (cliente_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);
create index if not exists api_keys_ativo_idx on public.api_keys (ativo);
create index if not exists api_usage_logs_api_key_id_created_idx on public.api_usage_logs (api_key_id, created_at desc);
create index if not exists api_usage_logs_cliente_id_created_idx on public.api_usage_logs (cliente_id, created_at desc);
create index if not exists api_usage_logs_rota_idx on public.api_usage_logs (rota);

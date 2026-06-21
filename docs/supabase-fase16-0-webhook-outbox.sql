-- Fase 16.0 - Webhook Outbox basico

create table if not exists public.api_webhook_outbox (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.api_monitoramento_eventos(id) on delete cascade,
  monitoramento_id uuid references public.api_monitoramentos_plataforma(id) on delete cascade,
  cliente_id uuid null references public.api_clientes(id) on delete set null,
  api_key_id uuid null references public.api_keys(id) on delete set null,
  owner_ref text,
  plataforma_ref text,
  webhook_url text not null,
  event_type text not null,
  event_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pendente' check (status in ('pendente', 'entregue', 'erro', 'falhou_final')),
  tentativas integer not null default 0,
  http_status integer,
  resposta text,
  ultimo_erro text,
  proxima_tentativa timestamptz not null default now(),
  entregue_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists api_webhook_outbox_evento_url_unique_idx
  on public.api_webhook_outbox (evento_id, webhook_url);

create index if not exists api_webhook_outbox_status_next_idx
  on public.api_webhook_outbox (status, proxima_tentativa, created_at);

create index if not exists api_webhook_outbox_owner_idx
  on public.api_webhook_outbox (owner_ref, plataforma_ref, status, created_at desc);

create index if not exists api_webhook_outbox_cliente_idx
  on public.api_webhook_outbox (cliente_id, status, created_at desc);

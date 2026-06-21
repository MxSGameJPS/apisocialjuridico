-- Fase 16.1 - Webhook profissional
-- Assinatura HMAC, retry avancado e logs de entrega.

alter table public.api_monitoramentos_plataforma
  add column if not exists webhook_secret text null;

alter table public.api_webhook_outbox
  add column if not exists max_tentativas integer not null default 5,
  add column if not exists ultima_tentativa_em timestamptz null,
  add column if not exists assinatura text null,
  add column if not exists assinatura_payload text null,
  add column if not exists headers_enviados jsonb not null default '{}'::jsonb;

create table if not exists public.api_webhook_entrega_logs (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.api_webhook_outbox(id) on delete cascade,
  tentativa integer not null,
  status text not null,
  http_status integer null,
  erro text null,
  resposta text null,
  duracao_ms integer null,
  webhook_url text not null,
  headers_enviados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_webhook_entrega_logs_outbox_idx
  on public.api_webhook_entrega_logs (outbox_id, created_at desc);

create index if not exists api_webhook_outbox_retry_idx
  on public.api_webhook_outbox (status, proxima_tentativa, tentativas, created_at);

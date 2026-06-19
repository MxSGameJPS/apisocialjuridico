create table if not exists public.processos_monitoramento_logs (
  id uuid primary key default gen_random_uuid(),
  processo_importado_id uuid null references public.processos_importados(id) on delete set null,
  advogado_id text null,
  numero_cnj text not null,
  status text not null,
  sucesso boolean not null default false,
  novas_movimentacoes jsonb not null default '[]'::jsonb,
  total_novas_movimentacoes integer not null default 0,
  mensagem text null,
  iniciado_em timestamptz null,
  finalizado_em timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists processos_monitoramento_logs_numero_cnj_idx
  on public.processos_monitoramento_logs (numero_cnj);

create index if not exists processos_monitoramento_logs_advogado_id_idx
  on public.processos_monitoramento_logs (advogado_id);

create index if not exists processos_monitoramento_logs_status_idx
  on public.processos_monitoramento_logs (status);

create index if not exists processos_monitoramento_logs_created_at_idx
  on public.processos_monitoramento_logs (created_at desc);

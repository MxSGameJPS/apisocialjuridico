-- Fase 14 - Feedback Loop processual

create table if not exists public.api_feedback_processual_plataforma (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid null references public.api_clientes(id) on delete set null,
  api_key_id uuid null references public.api_keys(id) on delete set null,
  owner_ref text,
  plataforma_ref text,
  evento_id uuid null references public.api_monitoramento_eventos(id) on delete set null,
  monitoramento_id uuid null references public.api_monitoramentos_plataforma(id) on delete set null,
  vinculo_id uuid null references public.api_vinculos_processuais_plataforma(id) on delete set null,
  numero_cnj text,
  uf text,
  oab text,
  oab_normalizada text,
  tipo_feedback text not null check (tipo_feedback in (
    'cliente_confirmado',
    'parte_contraria_confirmada',
    'processo_importado_crm',
    'processo_ignorado',
    'evento_relevante',
    'evento_irrelevante',
    'notificacao_enviada',
    'notificacao_lida',
    'erro_integracao'
  )),
  resultado text not null default 'registrado',
  parte_nome text,
  parte_polo text,
  parte_tipo text,
  cliente_ref text,
  cliente_nome text,
  observacao text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_feedback_processual_owner_idx
  on public.api_feedback_processual_plataforma (owner_ref, coalesce(plataforma_ref, ''), numero_cnj, created_at desc);

create index if not exists api_feedback_processual_cliente_idx
  on public.api_feedback_processual_plataforma (cliente_id, numero_cnj, created_at desc);

create index if not exists api_feedback_processual_evento_idx
  on public.api_feedback_processual_plataforma (evento_id, tipo_feedback, created_at desc);

create index if not exists api_feedback_processual_tipo_idx
  on public.api_feedback_processual_plataforma (tipo_feedback, created_at desc);

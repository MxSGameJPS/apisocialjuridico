alter table public.processos_importados
  add column if not exists ultima_consulta timestamptz null;

alter table public.processos_importados
  add column if not exists ultima_atualizacao_manual timestamptz null;

alter table public.processos_importados
  add column if not exists ultima_atualizacao_datajud timestamptz null;

alter table public.processos_importados
  add column if not exists total_movimentacoes integer not null default 0;

alter table public.processos_importados
  add column if not exists sincronizado boolean not null default false;

alter table public.processos_importados
  add column if not exists status_sincronizacao text null;

create index if not exists processos_importados_ultima_consulta_idx
  on public.processos_importados (ultima_consulta);

create index if not exists processos_importados_status_sincronizacao_idx
  on public.processos_importados (status_sincronizacao);

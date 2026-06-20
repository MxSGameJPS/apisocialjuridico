create table if not exists public.cpf_cnpj_processos_vinculados (
  id uuid primary key default gen_random_uuid(),
  documento_hash text not null,
  documento_mascarado text not null,
  numero_cnj text not null,
  nome_vinculado text null,
  origem text not null default 'manual',
  confianca numeric not null default 0.9,
  observacao text null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cpf_cnpj_processos_vinculados_unique unique (documento_hash, numero_cnj)
);

create index if not exists cpf_cnpj_processos_vinculados_hash_idx on public.cpf_cnpj_processos_vinculados (documento_hash);
create index if not exists cpf_cnpj_processos_vinculados_cnj_idx on public.cpf_cnpj_processos_vinculados (numero_cnj);
create index if not exists cpf_cnpj_processos_vinculados_ativo_idx on public.cpf_cnpj_processos_vinculados (ativo);

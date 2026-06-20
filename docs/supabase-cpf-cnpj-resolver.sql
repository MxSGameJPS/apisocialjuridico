create table if not exists public.cpf_cnpj_resolvidos (
  id uuid primary key default gen_random_uuid(),
  documento_hash text not null,
  documento_mascarado text not null,
  nome_principal text not null,
  nome_normalizado text not null,
  nomes_relacionados jsonb not null default '[]'::jsonb,
  nomes_normalizados jsonb not null default '[]'::jsonb,
  origem text not null default 'manual',
  confianca numeric not null default 0.9,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cpf_cnpj_resolvidos_hash_unique unique (documento_hash)
);

create index if not exists cpf_cnpj_resolvidos_hash_idx on public.cpf_cnpj_resolvidos (documento_hash);
create index if not exists cpf_cnpj_resolvidos_nome_idx on public.cpf_cnpj_resolvidos (nome_normalizado);
create index if not exists cpf_cnpj_resolvidos_ativo_idx on public.cpf_cnpj_resolvidos (ativo);

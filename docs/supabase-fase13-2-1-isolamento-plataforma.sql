-- Fase 13.2.1 - Isolamento por plataforma_ref

-- Remove os indices unicos antigos que nao isolavam por plataforma_ref.
drop index if exists public.api_vinculos_processuais_unique_cliente_idx;
drop index if exists public.api_vinculos_processuais_unique_owner_idx;

-- Novo isolamento interno: owner_ref + plataforma_ref + OAB + CNJ + parte + tipo.
create unique index if not exists api_vinculos_processuais_unique_owner_plataforma_idx
  on public.api_vinculos_processuais_plataforma (
    owner_ref,
    coalesce(plataforma_ref, ''),
    numero_cnj,
    coalesce(oab_normalizada, ''),
    parte_nome,
    coalesce(parte_polo, ''),
    tipo_vinculo
  )
  where cliente_id is null and ativo = true;

-- Novo isolamento comercial: cliente_id + plataforma_ref + OAB + CNJ + parte + tipo.
create unique index if not exists api_vinculos_processuais_unique_cliente_plataforma_idx
  on public.api_vinculos_processuais_plataforma (
    cliente_id,
    coalesce(plataforma_ref, ''),
    numero_cnj,
    coalesce(oab_normalizada, ''),
    parte_nome,
    coalesce(parte_polo, ''),
    tipo_vinculo
  )
  where cliente_id is not null and ativo = true;

create index if not exists api_vinculos_processuais_plataforma_ref_idx
  on public.api_vinculos_processuais_plataforma (owner_ref, plataforma_ref, numero_cnj, ativo);

create index if not exists api_vinculos_processuais_cliente_plataforma_ref_idx
  on public.api_vinculos_processuais_plataforma (cliente_id, plataforma_ref, numero_cnj, ativo);

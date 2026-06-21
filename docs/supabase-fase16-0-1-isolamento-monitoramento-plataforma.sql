-- Fase 16.0.1 - Isolamento de monitoramentos por plataforma_ref

-- Remove unicidade antiga que impedia varios monitoramentos comerciais
-- do mesmo CNJ/OAB por plataforma_ref diferente.
drop index if exists public.api_monitoramentos_plataforma_cliente_tipo_valor_idx;

-- Nova unicidade comercial: cliente + plataforma_ref + tipo + valor.
create unique index if not exists api_monitoramentos_plataforma_cliente_tipo_valor_plataforma_idx
  on public.api_monitoramentos_plataforma (cliente_id, coalesce(plataforma_ref, ''), tipo, valor_normalizado)
  where cliente_id is not null;

-- Indice interno para consultas por plataforma_ref.
create index if not exists api_monitoramentos_plataforma_owner_plataforma_idx
  on public.api_monitoramentos_plataforma (owner_ref, coalesce(plataforma_ref, ''), tipo, valor_normalizado);

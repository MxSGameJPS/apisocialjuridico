create extension if not exists pg_trgm;

alter table public.indice_publico_processos
  add column if not exists texto_search tsvector;

update public.indice_publico_processos
set texto_search = to_tsvector('portuguese', coalesce(texto_indexavel, ''))
where texto_search is null;

create index if not exists indice_publico_processos_texto_search_idx
  on public.indice_publico_processos using gin (texto_search);

create index if not exists indice_publico_processos_texto_indexavel_trgm_idx
  on public.indice_publico_processos using gin (texto_indexavel gin_trgm_ops);

create or replace function public.indice_publico_processos_texto_search_trigger()
returns trigger as $$
begin
  new.texto_search := to_tsvector('portuguese', coalesce(new.texto_indexavel, ''));
  return new;
end
$$ language plpgsql;

drop trigger if exists trg_indice_publico_processos_texto_search on public.indice_publico_processos;

create trigger trg_indice_publico_processos_texto_search
before insert or update of texto_indexavel on public.indice_publico_processos
for each row execute function public.indice_publico_processos_texto_search_trigger();

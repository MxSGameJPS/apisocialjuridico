-- Correção emergencial do worker de webhook outbox.
-- Motivo: entregas com status final ('entregue' ou 'falhou_final') não precisam de próxima tentativa.
-- O código já usa proxima_tentativa = null para falha final; portanto a coluna deve aceitar null.

alter table public.api_webhook_outbox
  alter column proxima_tentativa drop not null;

-- Garante performance somente para linhas que ainda podem ser processadas.
create index if not exists api_webhook_outbox_processamento_idx
  on public.api_webhook_outbox (status, proxima_tentativa)
  where status in ('pendente', 'erro') and proxima_tentativa is not null;

-- Opcional: corrige registros finais antigos caso tenham ficado com data indevida.
update public.api_webhook_outbox
set proxima_tentativa = null,
    updated_at = now()
where status in ('entregue', 'falhou_final');

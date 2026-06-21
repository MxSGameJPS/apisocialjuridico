# Fase 16.0 - Webhook Outbox basico

Esta fase cria a camada transacional de entrega de eventos juridicos para plataformas.

A API nao envia e-mail, WhatsApp ou push. A API apenas entrega o evento por webhook para a plataforma. A plataforma decide como avisar o advogado.

## SQL

Execute no Supabase:

```txt
docs/supabase-fase16-0-webhook-outbox.sql
```

## Fluxo

```txt
monitoramento executado
↓
novo evento juridico detectado
↓
registro em api_monitoramento_eventos
↓
registro pendente em api_webhook_outbox
↓
processamento do outbox
↓
POST para webhook_url da plataforma
```

## Rotas internas

```txt
POST /api/plataformas/webhooks/outbox
POST /api/plataformas/webhooks/processar
```

## Rotas comerciais

```txt
POST /api/v1/webhooks/outbox
POST /api/v1/webhooks/processar
```

## Criar monitoramento com webhook_url

```json
{
  "tipo": "cnj",
  "numero_cnj": "50336208020258210033",
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_dev",
  "webhook_url": "https://www.socialjuridico.com.br/api/webhooks/processual",
  "frequencia_minutos": 360,
  "ativo": true
}
```

## Payload enviado para a plataforma

```json
{
  "event_id": "uuid-evento",
  "event_type": "publicacao_djen",
  "event_key": "hash",
  "monitoramento_id": "uuid-monitoramento",
  "owner_ref": "social_juridico",
  "plataforma_ref": "advogado_123",
  "tipo_monitoramento": "cnj",
  "valor_monitorado": "50336208020258210033",
  "numero_cnj": "50336208020258210033",
  "titulo": "Publicacao DJEN encontrada",
  "descricao": "Nova publicacao encontrada.",
  "fonte": "DJEN",
  "data_evento": "2026-06-21T00:00:00.000Z",
  "payload": {}
}
```

## Headers enviados

```txt
content-type: application/json
user-agent: API-Social-Juridico-Webhook/1.0
x-socialjuridico-delivery-id: uuid-entrega
x-socialjuridico-event-id: uuid-evento
x-socialjuridico-event-type: publicacao_djen
```

## Status da entrega

```txt
pendente
entregue
erro
falhou_final
```

## Observacao

A assinatura HMAC, retry avancado, logs completos e politica de falha ficam para a Fase 16.1.

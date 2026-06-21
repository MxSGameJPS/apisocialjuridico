# Fase 16.1 - Webhook Profissional

Esta fase evolui o Webhook Outbox basico para uma entrega profissional, segura e auditavel.

## Recursos implementados

```txt
assinatura HMAC SHA-256
headers padronizados
anti-replay por timestamp
retry progressivo
falha final apos max_tentativas
logs de entrega por tentativa
timeout de entrega
registro de headers enviados
```

## SQL

Execute no Supabase:

```txt
docs/supabase-fase16-1-webhook-profissional.sql
```

## Headers enviados

```txt
x-socialjuridico-delivery-id
x-socialjuridico-event-id
x-socialjuridico-event-type
x-socialjuridico-timestamp
x-socialjuridico-signature
x-socialjuridico-signature-version
```

A assinatura e gerada quando o monitoramento possui `webhook_secret`.

Formato:

```txt
x-socialjuridico-signature: sha256=<hmac>
```

Base assinada:

```txt
timestamp.body
```

Pseudocodigo de verificacao no consumidor:

```js
const base = `${timestamp}.${rawBody}`;
const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(base).digest('hex');
const received = signature.replace('sha256=', '');
const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
```

## Retry progressivo

As tentativas seguem backoff aproximado:

```txt
1 min
5 min
15 min
60 min
180 min
360 min
```

Quando `tentativas >= max_tentativas`, o status vira:

```txt
falhou_final
```

## Logs

Cada tentativa gera registro em:

```txt
api_webhook_entrega_logs
```

Campos principais:

```txt
outbox_id
tentativa
status
http_status
erro
resposta
duracao_ms
webhook_url
headers_enviados
created_at
```

## Webhook secret

A coluna `webhook_secret` fica em:

```txt
api_monitoramentos_plataforma.webhook_secret
```

Ela pode ser configurada diretamente no Supabase ou via futuras rotas de configuracao da plataforma.

Exemplo temporario para teste:

```sql
update public.api_monitoramentos_plataforma
set webhook_secret = 'segredo_teste_123'
where owner_ref = 'sandbox_social_juridico'
  and plataforma_ref = 'teste_webhook_final'
  and valor_normalizado = '50336208020258210033';
```

## Status possiveis do outbox

```txt
pendente
erro
entregue
falhou_final
```

## Proximo passo

Apos validar a Fase 16.1, o proximo passo natural e a Fase 17: Billing, dashboard comercial, logs publicos por cliente e documentacao de venda.

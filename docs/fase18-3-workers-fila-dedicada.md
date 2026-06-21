# Fase 18.3 - Workers e Fila Dedicada

Esta fase separa processamento pesado do processo HTTP principal da API.

## Decisao tecnica

Nesta etapa nao foi adicionado Redis/BullMQ ainda. A fila inicial utiliza o proprio banco/outbox ja existente:

```txt
api_webhook_outbox
```

Isso reduz risco operacional porque a infraestrutura atual permanece:

```txt
VPS Napoleon
Supabase Postgres
PM2
```

## Novo desenho

Antes:

```txt
Processo HTTP da API
  - responde requisicoes
  - roda monitoramentos
  - processa webhooks
```

Agora recomendado:

```txt
apisocialjuridico-http
  - responde requisicoes HTTP
  - nao processa jobs pesados

apisocialjuridico-webhooks-worker
  - processa api_webhook_outbox em lotes
  - entrega webhooks
  - aplica retry/backoff ja existente

apisocialjuridico-monitoramentos-worker
  - roda cron de DataJud
  - roda cron de DJEN
  - gera eventos/outbox
```

## Scripts adicionados

```bash
npm run worker:webhooks
npm run worker:monitoramentos
```

## Worker de webhooks

Arquivo:

```txt
src/workers/webhookOutboxWorker.js
```

Variaveis opcionais:

```txt
WEBHOOK_WORKER_INTERVAL_MS=15000
WEBHOOK_WORKER_IDLE_INTERVAL_MS=15000
WEBHOOK_WORKER_BATCH_SIZE=20
```

## Worker de monitoramentos

Arquivo:

```txt
src/workers/monitoramentoWorker.js
```

Usa as variaveis ja existentes:

```txt
PROCESS_MONITORING_ENABLED
PROCESS_MONITORING_CRON
DJEN_MONITORING_ENABLED
DJEN_MONITORING_CRON
DJEN_ITENS_POR_PAGINA
```

Variavel opcional:

```txt
WORKER_RUN_ON_START=true
PROCESS_WORKER_BATCH_SIZE=25
```

## Recomendacao de producao

No processo HTTP principal, desativar jobs internos:

```env
PROCESS_MONITORING_ENABLED=false
DJEN_MONITORING_ENABLED=false
```

No worker de monitoramentos, subir com as variaveis ativas no ambiente PM2:

```txt
PROCESS_MONITORING_ENABLED=true
DJEN_MONITORING_ENABLED=true
```

Assim a API HTTP nao fica responsavel por processamento pesado.

## PM2 sugerido

```bash
pm2 start npm --name apisocialjuridico-webhooks-worker -- run worker:webhooks

PROCESS_MONITORING_ENABLED=true DJEN_MONITORING_ENABLED=true \
pm2 start npm --name apisocialjuridico-monitoramentos-worker -- run worker:monitoramentos
```

## Validacao

```bash
pm2 list
pm2 logs apisocialjuridico-webhooks-worker --lines 50
pm2 logs apisocialjuridico-monitoramentos-worker --lines 50

curl -s https://n8n.socialjuridico.com.br/api/infra/observabilidade \
  -H "x-api-key: $API_SECRET_KEY" | jq '.metricas.webhooks, .alertas'
```

## Proximas evolucoes

A fase atual e segura para a realidade Napoleon + Supabase. Quando o volume crescer, evoluir para:

```txt
Redis + BullMQ
workers com concorrencia configuravel
lock distribuido
fila por prioridade
fila por tipo de cliente
monitoramento de backlog por worker
```

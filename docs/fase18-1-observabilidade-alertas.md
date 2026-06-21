# Fase 18.1 - Observabilidade e Alertas Internos

Esta fase adiciona uma camada interna de observabilidade para a API Social Juridico.

## Objetivo

Permitir que a equipe tecnica acompanhe a saude operacional da API sem depender apenas de SSH, PM2 logs ou testes manuais.

A observabilidade cobre:

```txt
readiness
latencia Supabase
memoria do processo
webhooks pendentes
webhooks com falha final
uso e erros das rotas comerciais nas ultimas 24h
alertas warning e critical
```

## Rotas internas

Todas exigem:

```txt
x-api-key
```

### Observabilidade completa

```txt
GET /api/infra/observabilidade
```

Retorna:

```txt
status geral
thresholds
resumo
checks
runtime
metricas
alertas
```

### Alertas resumidos

```txt
GET /api/infra/alertas
```

Retorna apenas:

```txt
success
status
resumo
alertas
```

## Severidades

```txt
ok: sem alertas
warning: exige atencao, mas nao derruba operacao
critical: exige acao imediata
```

## Thresholds iniciais

```txt
Supabase warning: >= 800ms
Supabase critical: >= 1500ms
Memoria RSS warning: >= 700MB
Memoria RSS critical: >= 900MB
Webhook pendente warning: >= 100
Webhook pendente critical: >= 500
Falha final webhook 24h warning: >= 5
Falha final webhook 24h critical: >= 20
Taxa erro API 24h warning: >= 5%
Taxa erro API 24h critical: >= 15%
```

## Comandos de validacao

```bash
curl -s https://n8n.socialjuridico.com.br/api/infra/observabilidade \
  -H "x-api-key: $API_SECRET_KEY" | jq

curl -s https://n8n.socialjuridico.com.br/api/infra/alertas \
  -H "x-api-key: $API_SECRET_KEY" | jq
```

## Uso recomendado

A rota `/api/infra/alertas` deve ser monitorada por uma ferramenta externa na proxima etapa, como UptimeRobot, Better Stack, Healthchecks.io ou outro monitor.

## Relacao com filas

Esta fase nao implementa fila, mas passa a medir sinais que indicam necessidade de fila:

```txt
webhooks pendentes crescendo
falhas finais crescendo
latencia Supabase elevada
erros 5xx nas rotas comerciais
```

A fila dedicada fica planejada para a Fase 18.3.

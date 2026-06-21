# Fase 18.0 - Infraestrutura Segura da API Social Juridico

Esta fase fortalece a API como infraestrutura operacional segura, mantendo a VPS Napoleon e o Supabase como base atual.

## Objetivo

A API passa a ter uma camada minima de infraestrutura segura:

```txt
headers HTTP de seguranca
request id por requisicao
liveness probe
readiness probe
status interno de infraestrutura
checagem de Supabase
checagem de variaveis essenciais sem expor segredos
base para monitoramento externo
```

## Rotas publicas de healthcheck

```txt
GET /health
GET /health/live
GET /health/ready
```

### /health e /health/live

Usadas para confirmar que o processo Node esta vivo.

Retornam:

```txt
status
uptime_seconds
started_at
memory
timestamp
```

### /health/ready

Usada para confirmar que a API esta pronta para receber trafego.

Valida:

```txt
Supabase acessivel
variaveis essenciais presentes
```

Se houver falha, retorna HTTP 503.

## Rota interna de infraestrutura

```txt
GET /api/infra/status
```

Autenticacao:

```txt
x-api-key
```

Retorna detalhes operacionais sem expor segredos:

```txt
runtime
memory
configuracao por flags
checks de dependencia
seguranca
```

## Headers HTTP de seguranca

A API passa a enviar:

```txt
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
X-Permitted-Cross-Domain-Policies: none
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
Cross-Origin-Opener-Policy: same-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload em producao
Content-Security-Policy restritiva fora do Swagger
```

O Swagger `/docs` fica isento da CSP restritiva para evitar quebra da interface.

## Request ID

A API passa a gerar ou respeitar `x-request-id`.

Em erros internos, a resposta passa a incluir:

```txt
request_id
```

Isso facilita auditoria, suporte e rastreabilidade.

## O que esta fase nao faz ainda

Esta fase nao implementa ainda:

```txt
fila Redis/BullMQ
worker separado
CI/CD
staging isolado
backup automatizado
observabilidade externa
```

Esses pontos ficam para as proximas subfases:

```txt
18.1 - Observabilidade e alertas
18.2 - CI/CD e staging
18.3 - Workers e fila dedicada
18.4 - Backup, restore e DRP
18.5 - hardening operacional da VPS
```

## Comandos de validacao

```bash
curl -s https://n8n.socialjuridico.com.br/ | jq
curl -s https://n8n.socialjuridico.com.br/health/live | jq
curl -s https://n8n.socialjuridico.com.br/health/ready | jq
curl -I https://n8n.socialjuridico.com.br/health/live
curl -s https://n8n.socialjuridico.com.br/api/infra/status -H "x-api-key: $API_SECRET_KEY" | jq
```

## Resultado esperado

```txt
version: 1.4.9
/health/live: success true
/health/ready: status ready
/api/infra/status: nao expor segredo, apenas flags
headers de seguranca presentes
```

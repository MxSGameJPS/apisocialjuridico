# Fase 17 - Dashboard Comercial, Billing Tecnico e Logs

Esta fase transforma a API Social Juridico em um produto comercial observavel.

## Objetivo

```txt
cliente comercial
↓
api key
↓
uso por endpoint
↓
limites por plano
↓
dashboard de consumo
↓
logs detalhados
↓
base para billing
```

## Rotas administrativas

```txt
POST /api/comercial/dashboard
POST /api/comercial/logs
```

Autenticacao:

```txt
x-api-key
```

## Rotas comerciais self-service

```txt
POST /api/v1/dashboard
POST /api/v1/logs
```

Autenticacao:

```txt
x-commercial-api-key
```

## Periodos aceitos

```txt
hoje
7d
30d
mes_atual
```

Tambem e possivel enviar `data_inicio` e `data_fim`.

## Exemplo - dashboard admin por cliente

```json
{
  "cliente_id": "uuid-do-cliente",
  "periodo": "mes_atual",
  "limite_logs": 100
}
```

## Exemplo - dashboard por owner_ref interno

```json
{
  "owner_ref": "sandbox_social_juridico",
  "periodo": "30d",
  "limite_logs": 50
}
```

## Exemplo - dashboard comercial da propria API key

```json
{
  "periodo": "7d",
  "limite_logs": 50
}
```

## Retorno principal

```txt
periodo
cliente
limites
uso
billing
operacionais
top_rotas
uso_por_dia
api_keys
logs_recentes
```

## Indicadores de uso

```txt
total_requisicoes
sucesso
erros
taxa_sucesso
taxa_erro
```

## Indicadores operacionais

```txt
monitoramentos
eventos
webhooks
vinculos
feedbacks
```

## Billing tecnico

A API ainda nao calcula valor financeiro final. Ela entrega a base tecnica para cobranca:

```txt
plano
consumo_periodo
limites
percentual_limite_mes
status_limite
unidade: requisicoes
```

O valor financeiro pode ser definido posteriormente por tabela comercial.

## Proximas evolucoes

```txt
preco por plano
excedente por mil requisicoes
exportacao CSV
painel web administrativo
alertas de limite
bloqueio automatico por inadimplencia
ambiente sandbox separado
```

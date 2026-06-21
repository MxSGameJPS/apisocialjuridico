# Fase 14 - Feedback Loop Processual

Esta fase fecha o ciclo de aprendizado entre a API Social Juridico e uma plataforma consumidora, como o Social Juridico.

## Objetivo

```txt
API encontra evento/processo
↓
API envia webhook para a plataforma
↓
advogado toma uma acao na plataforma
↓
plataforma devolve feedback para a API
↓
API registra feedback e, quando aplicavel, cria/atualiza vinculo processual
```

## SQL

Execute no Supabase:

```txt
docs/supabase-fase14-feedback-loop.sql
```

## Rotas internas

```txt
POST /api/plataformas/feedback/processual
POST /api/plataformas/feedback/processual/listar
```

## Rotas comerciais

```txt
POST /api/v1/feedback/processual
POST /api/v1/feedback/processual/listar
```

## Tipos de feedback

```txt
cliente_confirmado
parte_contraria_confirmada
processo_importado_crm
processo_ignorado
evento_relevante
evento_irrelevante
notificacao_enviada
notificacao_lida
erro_integracao
```

## Feedback que gera aprendizado automatico

Quando `tipo_feedback` for:

```txt
cliente_confirmado
parte_contraria_confirmada
```

A API tambem cria ou atualiza automaticamente um registro em:

```txt
api_vinculos_processuais_plataforma
```

## Exemplo - cliente confirmado

```json
{
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_webhook_final",
  "numero_cnj": "50336208020258210033",
  "uf": "RS",
  "oab": "140234",
  "tipo_feedback": "cliente_confirmado",
  "resultado": "confirmado",
  "parte": {
    "nome": "SUELEN MACHADO CAETANO",
    "polo": "ativa",
    "tipo": "parte_ativa"
  },
  "cliente": {
    "id": "cliente_sandbox_001",
    "nome": "SUELEN MACHADO CAETANO"
  },
  "observacao": "Advogado confirmou a cliente apos receber evento da API"
}
```

## Exemplo - processo importado no CRM

```json
{
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_webhook_final",
  "numero_cnj": "50336208020258210033",
  "tipo_feedback": "processo_importado_crm",
  "resultado": "importado",
  "cliente": {
    "id": "cliente_sandbox_001",
    "nome": "SUELEN MACHADO CAETANO"
  }
}
```

## Beneficio pratico

A partir desta fase, a API deixa de apenas enviar informacao e passa a receber aprendizagem operacional:

```txt
quem e cliente
quem e parte contraria
qual processo foi importado
qual evento foi relevante
qual evento foi ignorado
qual notificacao foi lida
```

Esse feedback melhora futuras buscas por OAB, payloads de CRM, monitoramentos e decisoes comerciais.

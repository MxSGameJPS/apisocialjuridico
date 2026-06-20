# Fase 13 — Monitoramento OAB/CNJ para plataformas

Esta fase prepara a API Social Jurídico para uso por plataformas jurídicas, CRMs e legaltechs.

Objetivo:

```txt
plataforma cadastra OAB ou CNJ
API executa consulta recorrente/manual
API compara com histórico
API gera eventos
plataforma consulta eventos
```

## Migration

Execute no Supabase:

```txt
docs/supabase-fase13-monitoramento-plataformas.sql
```

## Rotas internas

Usam o header interno `x-api-key`.

```txt
POST /api/plataformas/monitoramentos
POST /api/plataformas/monitoramentos/listar
POST /api/plataformas/monitoramentos/executar
POST /api/plataformas/eventos
POST /api/plataformas/eventos/marcar-lido
```

## Rotas comerciais

Usam `x-commercial-api-key` e ficam isoladas pelo cliente dono da chave.

```txt
POST /api/v1/monitoramentos
POST /api/v1/monitoramentos/listar
POST /api/v1/monitoramentos/executar
POST /api/v1/eventos
POST /api/v1/eventos/marcar-lido
```

## Criar monitoramento de OAB

```json
{
  "tipo": "oab",
  "uf": "RS",
  "oab": "140234",
  "owner_ref": "social_juridico",
  "plataforma_ref": "advogado_123",
  "frequencia_minutos": 360,
  "ativo": true
}
```

## Criar monitoramento de CNJ

```json
{
  "tipo": "cnj",
  "numero_cnj": "50336208020258210033",
  "owner_ref": "social_juridico",
  "plataforma_ref": "cliente_456",
  "frequencia_minutos": 360,
  "ativo": true
}
```

## Executar monitoramentos

```json
{
  "owner_ref": "social_juridico",
  "limite_monitoramentos": 10,
  "limite_por_monitoramento": 20
}
```

## Listar eventos

```json
{
  "owner_ref": "social_juridico",
  "lido": false,
  "limite": 50
}
```

## Tipos de eventos

```txt
novo_processo_oab
publicacao_djen
movimentacao_datajud
processo_atualizado
```

## Observação de produto

Esta fase não é voltada ao produto público. Ela serve para que plataformas integradas alimentem a base da API com uso real, gerando histórico de OABs, CNJs, publicações e movimentações. Esse histórico será a base para um produto público mais forte no futuro.

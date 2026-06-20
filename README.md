# API Social Jurídico

API processual para DataJud, DJEN, busca pública, CRM, dossiês, inteligência jurídica, API comercial e frontend público inicial.

## Front público

```txt
https://n8n.socialjuridico.com.br/app
```

Rotas HTML:

```txt
/app
/app/busca?q=SABESP
/app/processo/15033935120258260269
/app/comercial
```

## Documentação Swagger

```txt
https://n8n.socialjuridico.com.br/docs
```

## Banco de dados

Execute no Supabase:

```txt
docs/supabase-processos-importados.sql
docs/supabase-processos-fase2.sql
docs/supabase-processos-fase3.sql
docs/supabase-processos-fase4-djen.sql
docs/supabase-busca-publica-djen.sql
docs/supabase-fase5-indice-publico-processual.sql
docs/supabase-fase6-busca-alertas-similaridade.sql
docs/supabase-fases7-8-9-entidades-dossie-inteligencia.sql
docs/supabase-fase10-busca-fulltext.sql
docs/supabase-fase11-api-comercial.sql
```

## Segurança

Admin interno:

```http
x-api-key: sua_API_SECRET_KEY
```

API comercial:

```http
x-commercial-api-key: sj_live_xxxxx
```

## Fase 12 — Front público

### GET `/app`

Página inicial do buscador processual.

### GET `/app/busca?q=SABESP`

Página de resultados usando o índice full-text.

### GET `/app/processo/:numeroCnj`

Página pública do processo com timeline e análise jurídica.

### GET `/app/comercial`

Página inicial institucional da API comercial.

## Fase 11 — API Comercial

### GET `/api/comercial/planos`

Lista limites dos planos `free`, `start`, `pro` e `enterprise`.

### POST `/api/comercial/clientes`

```json
{
  "nome": "Cliente API Teste",
  "email": "cliente@empresa.com.br",
  "documento": "00.000.000/0001-00",
  "plano": "start",
  "ativo": true
}
```

### POST `/api/comercial/api-keys`

```json
{
  "cliente_id": "uuid-do-cliente",
  "nome": "Chave produção",
  "plano": "start"
}
```

A chave retorna apenas uma vez no campo `api_key`.

## API Comercial v1

### POST `/api/v1/busca/processos`

```json
{
  "termo": "SABESP",
  "tribunal": "TJSP",
  "pagina": 1,
  "por_pagina": 20,
  "ordenar_por": "relevancia"
}
```

### POST `/api/v1/dossie`

```json
{
  "documento": "537.012.468-07"
}
```

### POST `/api/v1/processos/timeline`

```json
{
  "numero_cnj": "15033935120258260269",
  "atualizar_datajud": false
}
```

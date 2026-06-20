# API Social Jurídico

API processual para importação, normalização, resumo, monitoramento, busca pública, entidades, dossiês, inteligência jurídica e busca full-text.

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
```

## Segurança

```http
x-api-key: sua_API_SECRET_KEY
```

## Fase 10 — Busca full-text, ranking e paginação

### POST `/api/publico/busca/full-text`

```json
{
  "termo": "SABESP",
  "tribunal": "TJSP",
  "pagina": 1,
  "por_pagina": 20,
  "ordenar_por": "relevancia"
}
```

Também aceita busca direta por CNJ:

```json
{
  "termo": "15033935120258260269",
  "pagina": 1,
  "por_pagina": 10
}
```

## Fase 7 — Motor de Entidades

### POST `/api/publico/entidades/extrair`

```json
{
  "numero_cnj": "15033935120258260269"
}
```

### POST `/api/publico/entidades/listar`

```json
{
  "termo": "augusto",
  "tipo": "pessoa_fisica",
  "limite": 20
}
```

## Fase 8 — Dossiê Público

### POST `/api/publico/dossie`

```json
{
  "documento": "537.012.468-07"
}
```

## Fase 9 — Inteligência Jurídica

### POST `/api/publico/inteligencia/analisar-processo`

```json
{
  "numero_cnj": "15033935120258260269"
}
```

### POST `/api/publico/inteligencia/recorrencia`

```json
{
  "termo": "SABESP",
  "tribunal": "TJSP"
}
```

## Fase 6 — Produto público estilo Escavador

### POST `/api/publico/buscar/cpf-cnpj`

```json
{
  "documento": "537.012.468-07",
  "buscar_djen": false,
  "limite": 20
}
```

### POST `/api/publico/buscar/nome`

```json
{
  "nome": "SABESP",
  "buscar_djen": true,
  "limite": 20
}
```

### POST `/api/publico/buscar/advogado`

```json
{
  "oab": "463170",
  "uf": "SP",
  "buscar_djen": true,
  "limite": 20
}
```

### POST `/api/publico/processos/timeline`

```json
{
  "numero_cnj": "15033935120258260269",
  "atualizar_datajud": false
}
```

### POST `/api/publico/alertas`

```json
{
  "tipo": "nome",
  "valor": "SABESP",
  "filtros": { "tribunal": "TJSP" },
  "ativo": true
}
```

### POST `/api/publico/processos/similares`

```json
{
  "numero_cnj": "15033935120258260269",
  "limite": 10,
  "score_minimo": 0.12
}
```

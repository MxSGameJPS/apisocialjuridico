# API Social Jurídico

API processual para DataJud, DJEN, busca pública, CRM, dossiês, inteligência jurídica, resolvedor CPF/CNPJ, busca robusta por OAB, vínculos processuais, API comercial e frontend público inicial.

## Front público

```txt
https://n8n.socialjuridico.com.br/app
```

Rotas HTML:

```txt
/app
/app/busca?q=SABESP
/app/busca?q=CPF_OU_CNPJ
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
docs/supabase-cpf-cnpj-resolver.sql
docs/supabase-cpf-cnpj-processos-vinculados.sql
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

## Fase 13 — Busca robusta por OAB

A busca robusta por OAB consulta DJEN, extrai CNJs, deduplica processos, enriquece com DataJud quando possível e retorna uma resposta própria para integrações.

### POST `/api/publico/oab/processos`

Requer `x-api-key` interno.

```json
{
  "uf": "RS",
  "oab": "140234",
  "limite_djen": 20,
  "incluir_detalhes": true,
  "limite_detalhes": 10
}
```

Também aceita:

```json
{
  "termo": "RS 140234"
}
```

### POST `/api/v1/oab/processos`

Rota comercial, requer `x-commercial-api-key`.

```json
{
  "uf": "RS",
  "oab": "140234",
  "limite_djen": 20,
  "incluir_detalhes": true,
  "limite_detalhes": 10
}
```

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "consulta": {
      "tipo": "oab",
      "uf": "RS",
      "numero": "140234",
      "termo": "RS 140234"
    },
    "metricas": {
      "processos_unicos": 0,
      "detalhados_datajud": 0,
      "djen_total": 0,
      "cnjs_extraidos_djen": 0
    },
    "processos": []
  }
}
```

Cada processo pode incluir capa, partes agrupadas, advogados, últimas movimentações, resumo IA, fontes e `vinculo_oab`. Se a fonte não confirmar qual parte é representada pela OAB, a API retorna alerta para confirmação manual.

## Resolvedor CPF/CNPJ

CPF/CNPJ não costuma vir como campo público pesquisável no DJEN/DataJud. Para permitir busca estilo Escavador, a API possui uma camada local de resolução de identidade usando hash do documento.

### POST `/api/publico/resolver/cpf-cnpj/cadastrar`

```json
{
  "documento": "CPF_OU_CNPJ",
  "nome_principal": "Nome completo autorizado",
  "nomes_relacionados": ["Nome alternativo"],
  "origem": "manual_autorizado",
  "confianca": 0.95
}
```

### POST `/api/publico/resolver/cpf-cnpj/processos/vincular`

```json
{
  "documento": "CPF_OU_CNPJ",
  "numero_cnj": "NUMERO_CNJ",
  "nome_vinculado": "Nome completo autorizado",
  "origem": "manual_autorizado",
  "confianca": 0.95,
  "enriquecer_datajud": true
}
```

### POST `/api/publico/resolver/cpf-cnpj/processos/listar`

```json
{
  "documento": "CPF_OU_CNPJ"
}
```

### POST `/api/publico/resolver/cpf-cnpj/processos/indice`

```json
{
  "documento": "CPF_OU_CNPJ"
}
```

## Fase 12 — Front público

### GET `/app`

Página inicial do buscador processual.

### GET `/app/busca?q=SABESP`

Página de resultados usando busca viva e índice full-text.

### GET `/app/processo/:numeroCnj`

Página pública do processo com timeline e análise jurídica.

### GET `/app/comercial`

Página inicial institucional da API comercial.

## Fase 11 — API Comercial

### GET `/api/comercial/planos`

Lista limites dos planos `free`, `start`, `pro` e `enterprise`.

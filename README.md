# API Social Jurídico

API processual para DataJud, DJEN, busca pública, CRM, dossiês, inteligência jurídica, resolvedor CPF/CNPJ, API comercial e frontend público inicial.

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

### POST `/api/publico/resolver/cpf-cnpj`

```json
{
  "documento": "CPF_OU_CNPJ"
}
```

### POST `/api/publico/resolver/cpf-cnpj/listar`

```json
{
  "termo": "nome",
  "limite": 50
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

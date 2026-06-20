# API Social Jurídico

API processual para DataJud, DJEN, busca pública, CRM, dossiês, inteligência jurídica, resolvedor CPF/CNPJ, busca robusta por OAB, monitoramento para plataformas, eventos, vínculos processuais, API comercial e frontend público inicial.

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
docs/supabase-fase13-monitoramento-plataformas.sql
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

## Fase 13 — Monitoramento OAB/CNJ para plataformas

Guia completo:

```txt
docs/fase13-monitoramento-plataformas.md
```

Rotas internas:

```txt
POST /api/plataformas/monitoramentos
POST /api/plataformas/monitoramentos/listar
POST /api/plataformas/monitoramentos/executar
POST /api/plataformas/eventos
POST /api/plataformas/eventos/marcar-lido
```

Rotas comerciais:

```txt
POST /api/v1/monitoramentos
POST /api/v1/monitoramentos/listar
POST /api/v1/monitoramentos/executar
POST /api/v1/eventos
POST /api/v1/eventos/marcar-lido
```

## Fase 13 — Busca robusta por OAB

```txt
POST /api/publico/oab/processos
POST /api/v1/oab/processos
```

Payload:

```json
{
  "uf": "RS",
  "oab": "140234",
  "limite_djen": 20,
  "incluir_detalhes": true,
  "limite_detalhes": 10
}
```

## Resolvedor CPF/CNPJ

CPF/CNPJ não costuma vir como campo público pesquisável no DJEN/DataJud. Para permitir busca estilo Escavador, a API possui uma camada local de resolução de identidade usando hash do documento.

```txt
POST /api/publico/resolver/cpf-cnpj/cadastrar
POST /api/publico/resolver/cpf-cnpj/processos/vincular
POST /api/publico/resolver/cpf-cnpj/processos/listar
POST /api/publico/resolver/cpf-cnpj/processos/indice
```

## Front público

```txt
/app
/app/busca?q=SABESP
/app/busca?q=CPF_OU_CNPJ
/app/processo/15033935120258260269
/app/comercial
```

## Fase 11 — API Comercial

```txt
GET  /api/comercial/planos
POST /api/comercial/clientes
POST /api/comercial/api-keys
POST /api/comercial/api-keys/status
POST /api/comercial/uso
```

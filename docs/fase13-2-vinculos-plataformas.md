# Fase 13.2 - Vinculos de plataforma

Esta fase grava a confirmacao enviada por uma plataforma sobre a relacao entre OAB, processo e parte.

## SQL

Execute:

```txt
docs/supabase-fase13-2-vinculos-plataformas.sql
```

Depois execute tambem a microfase de isolamento:

```txt
docs/supabase-fase13-2-1-isolamento-plataforma.sql
```

## Isolamento por plataforma_ref

A partir da Fase 13.2.1, o vinculo deve ser isolado por:

```txt
owner_ref + plataforma_ref + OAB + CNJ + parte + tipo_vinculo
```

No Social Juridico, o recomendado e:

```txt
owner_ref: social_juridico
plataforma_ref: ID interno do advogado ou escritorio
```

Para testes, use:

```txt
owner_ref: sandbox_social_juridico
plataforma_ref: teste_dev
```

## Rotas internas

```txt
POST /api/plataformas/oab/processos
POST /api/plataformas/vinculos/confirmar
POST /api/plataformas/vinculos/listar
POST /api/plataformas/vinculos/desativar
```

## Rotas comerciais

```txt
POST /api/v1/oab/processos
POST /api/v1/vinculos/confirmar
POST /api/v1/vinculos/listar
POST /api/v1/vinculos/desativar
```

## Confirmar vinculo

```json
{
  "numero_cnj": "50336208020258210033",
  "uf": "RS",
  "oab": "140234",
  "tipo_vinculo": "cliente_confirmado",
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_dev",
  "parte": {
    "nome": "PARTE TESTE",
    "polo": "ativa",
    "tipo": "parte_ativa"
  },
  "confianca": 1
}
```

## Buscar OAB com vinculo isolado

```json
{
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_dev",
  "uf": "RS",
  "oab": "140234",
  "incluir_vinculos_confirmados": true
}
```

## Tipos

```txt
cliente_confirmado
parte_contraria
ignorado
vinculo_incorreto
```

A rota `/api/plataformas/oab/processos` e a rota comercial `/api/v1/oab/processos` podem retornar `vinculos_confirmados`, `cliente_confirmado` e `cliente_confirmado_detalhe` quando o `plataforma_ref` bater com o vinculo gravado.

# Fase 13.2 - Vinculos de plataforma

Esta fase grava a confirmacao enviada por uma plataforma sobre a relacao entre OAB, processo e parte.

## SQL

Execute:

```txt
docs/supabase-fase13-2-vinculos-plataformas.sql
```

## Rotas internas

```txt
POST /api/plataformas/vinculos/confirmar
POST /api/plataformas/vinculos/listar
POST /api/plataformas/vinculos/desativar
```

## Rotas comerciais

```txt
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
  "owner_ref": "social_juridico",
  "plataforma_ref": "advogado_123",
  "parte": {
    "nome": "PARTE TESTE",
    "polo": "ativa",
    "tipo": "parte_ativa"
  },
  "confianca": 1
}
```

## Tipos

```txt
cliente_confirmado
parte_contraria
ignorado
vinculo_incorreto
```

A rota comercial `/api/v1/oab/processos` pode retornar `vinculos_confirmados`, `cliente_confirmado` e `cliente_confirmado_detalhe`.

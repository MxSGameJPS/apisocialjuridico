# Fase 15 - Enriquecimento em Lote

Esta fase cria um endpoint para enriquecer varios processos em uma unica chamada.

## Objetivo

Receber uma lista de CNJs ou objetos de processo e devolver cada item com:

```txt
cliente confirmado
parte contraria
vinculos confirmados
feedbacks
status CRM
eventos recentes
acao recomendada
payload CRM completo
alertas
```

## Rotas internas

```txt
POST /api/plataformas/enriquecimento/lote
```

## Rotas comerciais

```txt
POST /api/v1/enriquecimento/lote
```

## Exemplo simples

```json
{
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_webhook_final",
  "processos": [
    "50336208020258210033"
  ],
  "uf": "RS",
  "oab": "140234",
  "incluir_timeline": false,
  "limite_eventos": 5,
  "limite": 10
}
```

## Exemplo com objeto de processo

```json
{
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_webhook_final",
  "processos": [
    {
      "ref_externa": "crm_temp_001",
      "numero_cnj": "50336208020258210033",
      "processo": {
        "classe": "Embargos a Execucao",
        "tribunal": "TJRS",
        "orgao": "5 Vara Civel da Comarca de Sao Leopoldo",
        "parte_ativa": "SUELEN MACHADO CAETANO",
        "parte_passiva": "ELISABETE DA LUZ LANGER"
      }
    }
  ],
  "uf": "RS",
  "oab": "140234"
}
```

## Campos importantes da resposta

```txt
status_crm
acao_recomendada
pronto_para_importar
cliente
parte_contraria
vinculos_confirmados
feedbacks
eventos_recentes
payload_crm
```

## Status CRM possiveis

```txt
importado
ignorado
pronto_para_importar
pendente_confirmacao_cliente
```

## Uso no Social Juridico

A plataforma pode usar esse endpoint para:

```txt
atualizar CRM em massa
preparar importacao assistida de processos
recalcular status de processos monitorados
montar painel de eventos recentes por advogado/escritorio
identificar processos prontos para importacao
identificar processos pendentes de confirmacao de cliente
```

# Fase 13.1 — Normalização de partes em processos e eventos

Esta correção melhora a resposta da busca robusta por OAB e dos eventos de monitoramento.

## Problema observado

Alguns processos retornavam campos simples preenchidos:

```json
{
  "parte_ativa": "NOME DA PARTE ATIVA",
  "parte_passiva": "NOME DA PARTE PASSIVA"
}
```

Mas o objeto estruturado vinha vazio:

```json
{
  "partes": {
    "ativa": [],
    "passiva": [],
    "outras": [],
    "todas": []
  }
}
```

## Correção

Quando o DataJud não retorna lista detalhada de partes, a API agora cria partes estruturadas a partir do índice público/DJEN:

```json
{
  "partes": {
    "ativa": [
      {
        "nome": "NOME DA PARTE ATIVA",
        "tipo": "parte_ativa",
        "polo": "ativa",
        "fonte": "indice_publico",
        "confianca": 0.75
      }
    ],
    "passiva": [
      {
        "nome": "NOME DA PARTE PASSIVA",
        "tipo": "parte_passiva",
        "polo": "passiva",
        "fonte": "indice_publico",
        "confianca": 0.75
      }
    ],
    "todas": []
  }
}
```

## Impacto para plataformas

A plataforma pode consumir sempre `partes.ativa`, `partes.passiva` e `partes.todas`, mesmo quando a fonte pública só trouxe `parte_ativa` e `parte_passiva` no índice.

## Observação de segurança

Quando a parte é montada a partir do índice público, a API adiciona alerta pedindo confirmação manual antes de vincular ao cliente no CRM.

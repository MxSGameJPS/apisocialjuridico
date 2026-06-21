# Fase 13.3 - Payload de importacao para CRM

Esta fase cria um pacote estruturado para a plataforma importar um processo no CRM com seguranca.

A API nao grava o processo no CRM da plataforma. Ela apenas monta o payload de importacao.

## Rotas

```txt
POST /api/plataformas/crm/payload-processo
POST /api/v1/crm/payload-processo
```

## Objetivo

Transformar um processo encontrado pela OAB ou CNJ em um pacote pronto para acao:

```txt
processo
cliente confirmado
parte contraria
partes sugeridas
vinculos confirmados
monitoramento sugerido
acao recomendada
```

## Payload interno

```json
{
  "owner_ref": "sandbox_social_juridico",
  "plataforma_ref": "teste_dev",
  "numero_cnj": "50336208020258210033",
  "uf": "RS",
  "oab": "140234",
  "processo": {
    "numero_cnj": "50336208020258210033",
    "classe": "Procedimento Comum Civel",
    "orgao": "Vara Judicial",
    "parte_ativa": "PARTE TESTE",
    "parte_passiva": "PARTE CONTRARIA TESTE"
  },
  "incluir_timeline": false,
  "limite_eventos": 5
}
```

## Retorno esperado

```json
{
  "pronto_para_importar": true,
  "acao_recomendada": "importar_para_crm",
  "processo": {},
  "cliente": {},
  "parte_contraria": {},
  "partes_sugeridas": [],
  "vinculos_confirmados": [],
  "monitoramento_sugerido": true,
  "monitoramento_payload": {
    "tipo": "cnj",
    "numero_cnj": "50336208020258210033",
    "ativo": true
  },
  "eventos_recentes": [],
  "alertas": []
}
```

## Regras

Se houver `cliente_confirmado` para o mesmo `owner_ref`, `plataforma_ref`, OAB e CNJ, a API retorna:

```txt
pronto_para_importar: true
acao_recomendada: importar_para_crm
```

Se nao houver cliente confirmado, a API retorna:

```txt
pronto_para_importar: false
acao_recomendada: confirmar_cliente_antes_de_importar
```

## Importante

O Social Juridico deve usar este payload para:

```txt
1. mostrar revisao final ao advogado
2. criar cliente no CRM, se necessario
3. criar parte contraria, se necessario
4. salvar o processo no CRM
5. criar monitoramento por CNJ
6. exibir confirmacao ao usuario
```

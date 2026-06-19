# API Social Jurídico

API interna do Social Jurídico para importação, normalização, resumo e monitoramento de processos judiciais.

## Stack inicial

- Node.js
- JavaScript ES Modules
- Fastify
- Swagger/OpenAPI
- Supabase Admin Client
- Zod
- DataJud/CNJ
- DJEN configurável por endpoint
- OpenAI para resumo das movimentações
- Node Cron para monitoramento automático

## Instalação

```bash
npm install
npm run dev
```

## Configuração

```bash
cp .env.example .env
```

Preencha o `.env` local com Supabase, DataJud, OpenAI e `API_SECRET_KEY`.

## Documentação Swagger

Local:

```txt
http://localhost:3333/docs
```

Produção temporária:

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
```

## Segurança interna

Rotas sensíveis usam o header:

```http
x-api-key: sua_API_SECRET_KEY
```

## Rotas principais

### POST `/api/processos/buscar`

Consulta o DataJud pelo número CNJ e retorna os dados para conferência antes de salvar.

```json
{
  "numero_processo": "0000000-00.0000.8.26.0000"
}
```

### POST `/api/processos/baixar`

Consulta o DataJud, gera resumo e salva na tabela `processos_importados`.

```json
{
  "numero_processo": "0000000-00.0000.8.26.0000",
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario"
}
```

## Busca pública estilo Escavador

### POST `/api/publico/djen/buscar`

Busca publicações públicas no DJEN usando filtros flexíveis. Essa rota prepara a API para um produto público separado, similar a motores de busca processual.

```json
{
  "salvar": true,
  "filtros": {
    "oab": "380494",
    "uf": "SP",
    "numero_processo": "0800039-86.2026.9.26.0060",
    "tribunal": "TJSP",
    "nome_parte": "ISMAEL FABRIS",
    "nome_advogado": "JULIANA GALERA",
    "nome_orgao": "2ª Auditoria Militar Estadual",
    "tipo_comunicacao": "Intimação",
    "tipo_documento": "EDITAL DE INTIMAÇÃO",
    "data_inicio": "2026-06-01",
    "data_fim": "2026-06-19",
    "pagina": 1,
    "itens_por_pagina": 50
  }
}
```

Filtros aceitos pela camada de normalização:

```txt
oab
numero_oab
uf
uf_oab
numero_processo
numero_cnj
processo
tribunal
sigla_tribunal
nome_parte
parte
nome_destinatario
nome_advogado
advogado
nome_orgao
orgao
tipo_comunicacao
tipo_documento
data_inicio
data_fim
data_disponibilizacao_inicio
data_disponibilizacao_fim
pagina
itens_por_pagina
parametros_extras
```

`parametros_extras` permite testar parâmetros diretos do DJEN sem alterar código:

```json
{
  "filtros": {
    "parametros_extras": {
      "nomeClasse": "AGRAVO DE INSTRUMENTO"
    }
  }
}
```

## Fase 2 — Importação em lote e atualização manual

### POST `/api/processos/importar-lote`

Importa vários CNJs em sequência, detecta duplicados e retorna relatório por processo.

```json
{
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario",
  "ignorar_duplicados": true,
  "processos": [
    "10033944320248260394",
    "1003394-43.2024.8.26.0394"
  ]
}
```

### POST `/api/processos/atualizar`

Atualiza manualmente um processo já importado, consultando novamente o DataJud e gerando novo resumo IA.

```json
{
  "numero_processo": "10033944320248260394",
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario"
}
```

### POST `/api/processos/atualizar-lote`

Atualiza vários processos manualmente.

```json
{
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario",
  "processos": [
    "10033944320248260394",
    "00000000000000000000"
  ]
}
```

## Fase 3 — Monitoramento automático DataJud

### POST `/api/monitoramento/datajud/executar`

Executa o monitoramento manualmente.

```json
{
  "advogado_id": "id-opcional-do-advogado",
  "limite": 25
}
```

## Fase 4 — DJEN por OAB

### POST `/api/djen/monitoramentos`

Cadastra uma OAB para monitoramento.

```json
{
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario",
  "oab": "123456",
  "uf": "SP",
  "ativo": true
}
```

### POST `/api/djen/consultar`

Consulta o DJEN por OAB/UF e opcionalmente salva as publicações encontradas.

```json
{
  "advogado_id": "id-do-advogado",
  "oab": "123456",
  "uf": "SP",
  "data_inicio": "2026-06-01",
  "data_fim": "2026-06-19",
  "salvar": true
}
```

### POST `/api/djen/processar`

Consulta, salva, extrai CNJ, cria notificação e opcionalmente importa o processo pelo DataJud.

```json
{
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario",
  "oab": "123456",
  "uf": "SP",
  "importar_processos": false,
  "limite": 50
}
```

### POST `/api/djen/monitorar`

Executa manualmente o monitoramento de todas as OABs ativas cadastradas em `advogados_monitoramento`.

```json
{
  "limite_por_oab": 50
}
```

## Observação

O client DJEN foi deixado configurável por `.env` porque o contrato público do serviço pode variar conforme endpoint oficial utilizado. Caso a resposta do DJEN venha com campos diferentes, ajuste a normalização em `src/modules/djen/djenClient.js`.

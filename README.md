# API Social Jurídico

API processual para importação, normalização, resumo, monitoramento e busca pública de processos judiciais.

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
```

## Segurança interna

Rotas sensíveis usam o header:

```http
x-api-key: sua_API_SECRET_KEY
```

## Busca pública estilo Escavador

### POST `/api/publico/djen/buscar`

Busca publicações públicas no DJEN usando filtros flexíveis.

```json
{
  "salvar": true,
  "filtros": {
    "tribunal": "TJSP",
    "data_inicio": "2026-06-01",
    "data_fim": "2026-06-19",
    "itens_por_pagina": 10
  }
}
```

### POST `/api/publico/processos/enriquecer-busca`

Busca no DJEN, extrai CNJs, consulta DataJud e salva/atualiza o índice público processual.

```json
{
  "salvar_busca": true,
  "usar_datajud": true,
  "limite": 5,
  "filtros": {
    "tribunal": "TJSP",
    "data_inicio": "2026-06-19",
    "data_fim": "2026-06-19",
    "itens_por_pagina": 5
  }
}
```

### POST `/api/publico/processos/enriquecer-pendentes`

Pega publicações já salvas em `djen_publicacoes`, consulta DataJud e atualiza o índice público.

```json
{
  "usar_datajud": true,
  "limite": 10
}
```

### POST `/api/publico/processos/buscar-indice`

Busca dentro da base pública já indexada.

```json
{
  "termo": "SABESP",
  "tribunal": "TJSP",
  "limite": 20
}
```

Também aceita busca direta por CNJ:

```json
{
  "numero_cnj": "40004565820268260069"
}
```

## Rotas principais DataJud

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

## Fase 2 — Importação em lote e atualização manual

### POST `/api/processos/importar-lote`

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

```json
{
  "numero_processo": "10033944320248260394",
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario"
}
```

### POST `/api/processos/atualizar-lote`

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

```json
{
  "advogado_id": "id-opcional-do-advogado",
  "limite": 25
}
```

## Fase 4 — DJEN por OAB

### POST `/api/djen/monitoramentos`

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

```json
{
  "limite_por_oab": 50
}
```

## Observação

O client DJEN foi deixado configurável por `.env` porque o contrato público do serviço pode variar conforme endpoint oficial utilizado.

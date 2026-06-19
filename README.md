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
- OpenAI para resumo das movimentações

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

> Nunca suba o arquivo `.env` para o GitHub.

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
```

## Segurança interna

Rotas sensíveis usam o header:

```http
x-api-key: sua_API_SECRET_KEY
```

## Rotas principais

### GET `/`

Informações básicas da API.

### GET `/health`

Status da API.

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
  "usuario_id": "id-opcional-do-usuario",
  "cliente": {
    "nome": "Nome do Cliente",
    "tipo": "pessoa_fisica",
    "documento": "000.000.000-00",
    "email": "cliente@email.com",
    "telefone": "(11) 99999-9999"
  },
  "parte_contraria": {
    "nome": "Nome da Parte Contrária",
    "tipo": "pessoa_juridica",
    "documento": "00.000.000/0001-00"
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

Retorno resumido:

```json
{
  "success": true,
  "message": "Importação em lote processada.",
  "data": {
    "resumo": {
      "total": 2,
      "importados": 1,
      "atualizados": 0,
      "duplicados": 1,
      "erros": 0
    },
    "resultados": []
  }
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

## Observação

Nem todo retorno do DataJud traz nomes das partes. Quando isso acontecer, a API retorna um aviso no campo `avisos` e continua entregando os dados públicos disponíveis. O frontend deve pedir ao advogado para informar ou selecionar o cliente antes de salvar no CRM.

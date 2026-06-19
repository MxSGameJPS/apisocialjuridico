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

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Preencha o `.env` local com Supabase, DataJud, OpenAI e `API_SECRET_KEY`.

> Nunca suba o arquivo `.env` para o GitHub.

## Documentação Swagger

Com a API rodando, acesse:

```txt
http://localhost:3333/docs
```

Em produção temporária:

```txt
https://n8n.socialjuridico.com.br/docs
```

A documentação mostra endpoints, métodos, headers, bodies e schemas de resposta.

## Banco de dados

Execute no Supabase o SQL em:

```txt
docs/supabase-processos-importados.sql
```

## Segurança interna

Rotas sensíveis usam o header:

```http
x-api-key: sua_API_SECRET_KEY
```

## Rotas

### GET `/`

Informações básicas da API.

### GET `/health`

Status da API.

### POST `/api/processos/buscar`

Consulta o DataJud pelo número CNJ e retorna os dados para conferência antes de salvar.

Body:

```json
{
  "numero_processo": "0000000-00.0000.8.26.0000"
}
```

### POST `/api/processos/baixar`

Consulta o DataJud, gera resumo e salva na tabela `processos_importados`.

Body:

```json
{
  "numero_processo": "0000000-00.0000.8.26.0000",
  "advogado_id": "id-do-advogado",
  "usuario_id": "id-opcional-do-usuario"
}
```

## Observação

Nem todo retorno do DataJud traz nomes das partes. Quando isso acontecer, a API retorna um aviso no campo `avisos` e continua entregando os dados públicos disponíveis.

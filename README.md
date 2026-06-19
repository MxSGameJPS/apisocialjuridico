# API Social Jurídico

API interna do Social Jurídico para importação, normalização, resumo e monitoramento de processos judiciais.

## Stack inicial

- Node.js
- JavaScript ES Modules
- Fastify
- Supabase Admin Client
- Zod
- DataJud/CNJ
- OpenAI, futuramente para resumo das movimentações

## Requisitos

- Node.js 20+
- Conta Supabase configurada
- `.env` local preenchido

## Instalação

```bash
npm install
```

## Configuração

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Preencha as variáveis:

```env
PORT=3333
API_SECRET_KEY=sua_chave_forte
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
DATAJUD_API_KEY=sua_chave_datajud
OPENAI_API_KEY=sua_chave_openai
```

> Nunca suba o arquivo `.env` para o GitHub.

## Rodar em desenvolvimento

```bash
npm run dev
```

## Verificar ambiente

```bash
npm run check:env
```

## Rotas iniciais

### GET `/`

Retorna informações básicas da API.

### GET `/health`

Retorna status da API.

Exemplo:

```json
{
  "success": true,
  "service": "apisocialjuridico",
  "status": "online"
}
```

## Segurança interna

Rotas sensíveis deverão usar o header:

```http
x-api-key: sua_API_SECRET_KEY
```

O middleware já está criado em:

```txt
src/middlewares/internalAuth.js
```

## Próximos módulos planejados

```txt
src/modules/processos
src/modules/datajud
src/modules/tribunais
src/modules/ia
src/jobs
```

## MVP proposto

Primeiro endpoint funcional:

```http
POST /api/processos/importar
```

Entrada prevista:

```json
{
  "numero_cnj": "0000000-00.0000.8.26.0000",
  "advogado_id": "id-do-advogado"
}
```

Fluxo:

1. Validar número CNJ.
2. Identificar tribunal pelo número.
3. Consultar DataJud.
4. Normalizar capa, partes e movimentações.
5. Gerar resumo por IA.
6. Salvar no Supabase.
7. Retornar processo importado.

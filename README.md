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

Se a tabela já existir, execute novamente o SQL para adicionar as colunas:

```txt
cliente_manual
parte_contraria_manual
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

Quando o DataJud não retornar as partes, o frontend pode enviar os dados manuais do cliente para vincular corretamente o processo ao CRM.

Body:

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
    "telefone": "(11) 99999-9999",
    "observacoes": "Cliente informado manualmente pelo advogado."
  },
  "parte_contraria": {
    "nome": "Nome da Parte Contrária",
    "tipo": "pessoa_juridica",
    "documento": "00.000.000/0001-00"
  }
}
```

Campos aceitos em `cliente` e `parte_contraria`:

```txt
nome
tipo: pessoa_fisica | pessoa_juridica | nao_informado
documento
email
telefone
observacoes
```

## Observação

Nem todo retorno do DataJud traz nomes das partes. Quando isso acontecer, a API retorna um aviso no campo `avisos` e continua entregando os dados públicos disponíveis. O frontend deve pedir ao advogado para informar ou selecionar o cliente antes de salvar no CRM.

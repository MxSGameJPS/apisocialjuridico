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

Variáveis relevantes para monitoramento:

```env
PROCESS_MONITORING_ENABLED=true
PROCESS_MONITORING_CRON="0 3 * * *"
```

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
docs/supabase-processos-fase3.sql
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
  "usuario_id": "id-opcional-do-usuario"
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

A API executa automaticamente uma rotina de monitoramento conforme `PROCESS_MONITORING_CRON`.

A rotina:

- busca processos importados;
- consulta novamente o DataJud;
- compara movimentações anteriores e atuais;
- atualiza capa, movimentações e resumo IA;
- registra logs em `processos_monitoramento_logs`;
- marca status como `novas_movimentacoes`, `sem_novidades` ou `erro`.

### POST `/api/monitoramento/datajud/executar`

Executa o monitoramento manualmente.

```json
{
  "advogado_id": "id-opcional-do-advogado",
  "limite": 25
}
```

Retorno resumido:

```json
{
  "success": true,
  "message": "Monitoramento DataJud executado com sucesso.",
  "data": {
    "resumo": {
      "total": 10,
      "com_novidades": 1,
      "sem_novidades": 8,
      "erros": 1
    },
    "resultados": []
  }
}
```

## Observação

Nem todo retorno do DataJud traz nomes das partes. Quando isso acontecer, a API retorna um aviso no campo `avisos` e continua entregando os dados públicos disponíveis. O frontend deve pedir ao advogado para informar ou selecionar o cliente antes de salvar no CRM.

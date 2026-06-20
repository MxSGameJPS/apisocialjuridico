# API Social Jurídico

API processual para importação, normalização, resumo, monitoramento e busca pública de processos judiciais.

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
docs/supabase-fase6-busca-alertas-similaridade.sql
```

## Segurança

```http
x-api-key: sua_API_SECRET_KEY
```

## Fase 6 — Produto público estilo Escavador

### POST `/api/publico/buscar/cpf-cnpj`

```json
{
  "documento": "537.012.468-07",
  "buscar_djen": false,
  "limite": 20
}
```

### POST `/api/publico/buscar/nome`

```json
{
  "nome": "SABESP",
  "buscar_djen": true,
  "limite": 20
}
```

### POST `/api/publico/buscar/advogado`

```json
{
  "oab": "463170",
  "uf": "SP",
  "buscar_djen": true,
  "limite": 20
}
```

Também aceita busca por nome do advogado:

```json
{
  "nome": "IGOR GOMIDES BALMANTE",
  "buscar_djen": true,
  "limite": 20
}
```

### POST `/api/publico/processos/timeline`

```json
{
  "numero_cnj": "15033935120258260269",
  "atualizar_datajud": false
}
```

### POST `/api/publico/alertas`

```json
{
  "tipo": "nome",
  "valor": "SABESP",
  "filtros": {
    "tribunal": "TJSP"
  },
  "ativo": true
}
```

Tipos de alerta:

```txt
nome
cpf_cnpj
advogado
oab
cnj
termo
```

### POST `/api/publico/alertas/executar`

```json
{
  "limite_alertas": 25,
  "limite_por_alerta": 10
}
```

### POST `/api/publico/processos/similares`

```json
{
  "numero_cnj": "15033935120258260269",
  "limite": 10,
  "score_minimo": 0.12
}
```

Também aceita texto livre:

```json
{
  "texto": "procedimento comum cível prática abusiva sabesp",
  "limite": 10
}
```

### POST `/api/publico/processos/documentos-extraidos`

Extrai CPF/CNPJ presentes no texto indexável do processo.

```json
{
  "numero_cnj": "15033935120258260269"
}
```

## Rotas anteriores principais

### POST `/api/publico/djen/buscar`

Busca publicações públicas no DJEN usando filtros flexíveis.

### POST `/api/publico/processos/enriquecer-busca`

Busca no DJEN, extrai CNJs, consulta DataJud e salva/atualiza o índice público processual.

### POST `/api/publico/processos/enriquecer-pendentes`

Pega publicações já salvas em `djen_publicacoes`, consulta DataJud e atualiza o índice público.

### POST `/api/publico/processos/buscar-indice`

Busca dentro da base pública já indexada.

### POST `/api/processos/buscar`

Consulta o DataJud pelo número CNJ.

### POST `/api/processos/baixar`

Consulta o DataJud, gera resumo e salva no CRM.

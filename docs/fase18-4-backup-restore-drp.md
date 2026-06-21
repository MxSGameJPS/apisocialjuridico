# Fase 18.4 - Backup, Restore e DRP

Esta fase documenta e prepara a recuperacao operacional da API Social Juridico em caso de falha de VPS, banco, deploy, configuracao ou perda parcial de dados.

## Objetivo

Criar uma base auditavel para SOC2, ISO 27001, ISO 27701 e LGPD cobrindo:

```txt
inventario do que precisa ser protegido
backup seguro da aplicacao
backup seguro do banco Supabase/Postgres
backup criptografado de segredos
procedimento de restore
procedimento de desastre
RTO/RPO inicial
validacao periodica
```

## Escopo atual

Infraestrutura atual:

```txt
VPS Napoleon
Ubuntu 24.04
PM2
Node.js
Supabase Postgres
Cloudflare
GitHub
```

## Responsabilidades

### GitHub

Fonte de verdade do codigo.

Protege:

```txt
src/
docs/
scripts/
package.json
package-lock.json
```

### VPS

Executa runtime.

Precisa proteger:

```txt
.env
PM2 dump
configuracao operacional
scripts locais
logs relevantes
```

### Supabase

Fonte de verdade dos dados operacionais.

Precisa proteger:

```txt
api_clientes
api_keys
api_usage_logs
api_monitoramentos_plataforma
api_monitoramento_eventos
api_webhook_outbox
api_webhook_entrega_logs
api_vinculos_processuais_plataforma
api_feedback_processual_plataforma
```

## RTO e RPO iniciais

Para beta/producao controlada:

```txt
RTO alvo: ate 4 horas
RPO alvo: ate 24 horas
```

Interpretação:

```txt
RTO: tempo maximo desejado para voltar a operar.
RPO: janela maxima aceitavel de perda de dados.
```

Como o Supabase ja possui backup automatico, o RPO real pode ser melhor, mas deve ser validado no painel/plano contratado.

## Scripts criados

### Validar pre-requisitos

```bash
bash scripts/backup/validate-backup-prereqs.sh
```

### Backup da aplicacao/runtime

```bash
BACKUP_ENCRYPTION_PASSPHRASE='senha-forte-fora-do-servidor' \
bash scripts/backup/backup-app-runtime.sh
```

Cria backup de:

```txt
codigo sem node_modules
package.json
package-lock.json
PM2 list
PM2 jlist
metadata de runtime
.env criptografado, se BACKUP_ENCRYPTION_PASSPHRASE estiver definido
checksums SHA256
```

### Backup do Supabase/Postgres

Requer `SUPABASE_DB_URL` com a connection string Postgres.

```bash
export SUPABASE_DB_URL='postgresql://...'
export BACKUP_ENCRYPTION_PASSPHRASE='senha-forte-fora-do-servidor'

bash scripts/backup/backup-supabase-postgres.sh
```

Cria:

```txt
schema SQL
backup custom dump dos dados
criptografia opcional do dump
metadata
checksums SHA256
```

## Politica de segredos

O arquivo `.env` nunca deve ser salvo em texto puro.

Regra:

```txt
.env sem criptografia: proibido
.env criptografado com AES-256-CBC/PBKDF2: permitido em backup controlado
senha do backup: fora da VPS
```

A senha de criptografia deve ficar em cofre externo, por exemplo:

```txt
1Password
Bitwarden
Vault
cofre interno administrativo
```

## Procedimento de restore da aplicacao

Em uma nova VPS:

```bash
apt update
apt install -y git curl tar openssl postgresql-client

# instalar Node/PM2 conforme padrao operacional
npm install -g pm2

git clone https://github.com/MxSGameJPS/apisocialjuridico.git
cd apisocialjuridico
npm install
```

Restaurar `.env` criptografado:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in env.enc \
  -out .env \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE

chmod 600 .env
```

Subir processos:

```bash
pm2 start npm --name apisocialjuridico -- start
pm2 start npm --name apisocialjuridico-webhooks-worker -- run worker:webhooks

NODE_ENV=production PROCESS_MONITORING_ENABLED=true DJEN_MONITORING_ENABLED=true \
pm2 start npm --name apisocialjuridico-monitoramentos-worker -- run worker:monitoramentos

pm2 save
```

Validar:

```bash
curl -s https://n8n.socialjuridico.com.br/health/ready | jq
curl -s https://n8n.socialjuridico.com.br/api/infra/observabilidade -H "x-api-key: $API_SECRET_KEY" | jq
```

## Procedimento de restore do banco

Preferencia operacional:

```txt
1. Usar restore nativo do Supabase, se disponivel no plano.
2. Usar dump proprio apenas se necessario.
```

Restore via dump custom:

```bash
pg_restore "$SUPABASE_DB_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  supabase-data.dump
```

Se o dump estiver criptografado:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in supabase-data.dump.enc \
  -out supabase-data.dump \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE
```

## Procedimento DRP resumido

### Cenario: API fora do ar

```txt
1. Verificar Cloudflare.
2. Verificar VPS Napoleon.
3. Verificar pm2 list.
4. Verificar logs da API.
5. Verificar /health/ready.
6. Reiniciar apenas processo afetado.
7. Se VPS indisponivel, provisionar nova VPS e restaurar aplicacao.
```

### Cenario: Supabase degradado

```txt
1. Verificar painel Supabase.
2. Verificar /health/ready.
3. Pausar jobs pesados, se necessario.
4. Reduzir batch dos workers.
5. Usar restore nativo se houver perda de dados.
```

### Cenario: deploy quebrou API

```txt
1. Verificar commit atual.
2. Voltar para commit anterior estavel.
3. npm install se necessario.
4. pm2 restart.
5. Validar /health/ready.
```

Rollback rapido:

```bash
git log --oneline -5
git checkout <commit_estavel>
npm install
pm2 restart apisocialjuridico --update-env
```

## Validacao mensal recomendada

```txt
1. Rodar backup app.
2. Rodar backup banco.
3. Conferir SHA256SUMS.
4. Testar descriptografia do .env em ambiente isolado.
5. Testar pg_restore em banco de homologacao/staging.
6. Registrar data, responsavel e resultado.
```

## Evidencias para auditoria

Manter registros de:

```txt
data do backup
responsavel
local do backup
hash SHA256
resultado do teste de restore
incidentes/ajustes
```

## Status da fase

```txt
18.4 implementa scripts e runbook.
18.4 so deve ser considerada validada depois de pelo menos um backup app e uma validacao de pre-requisitos.
Restore de banco deve ser testado em staging antes de qualquer uso em producao.
```

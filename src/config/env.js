import 'dotenv/config';
import { z } from 'zod';

function envBoolean(defaultValue = false) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;

    const normalized = String(value).trim().toLowerCase();

    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;

    return value;
  }, z.boolean()).default(defaultValue);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  API_SECRET_KEY: z.string().min(16, 'API_SECRET_KEY deve ter pelo menos 16 caracteres'),

  SUPABASE_URL: z.string().url('SUPABASE_URL inválida'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY é obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatória'),

  DATAJUD_BASE_URL: z.string().url().default('https://api-publica.datajud.cnj.jus.br'),
  DATAJUD_API_KEY: z.string().optional(),

  DJEN_BASE_URL: z.string().url().default('https://comunicaapi.pje.jus.br/api/v1/comunicacao'),
  DJEN_API_KEY: z.string().optional(),
  DJEN_ITENS_POR_PAGINA: z.coerce.number().int().min(1).max(100).default(50),
  DJEN_DIAS_RETROATIVOS: z.coerce.number().int().min(1).max(90).default(7),
  DJEN_MONITORING_ENABLED: envBoolean(false),
  DJEN_MONITORING_CRON: z.string().default('0 */6 * * *'),

  AI_PROVIDER: z.enum(['none', 'gemini', 'openai']).default('none'),
  AI_SUMMARY_ENABLED_DEFAULT: envBoolean(false),
  AI_SUMMARY_MAX_PER_MINUTE: z.coerce.number().int().min(1).max(100).default(10),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  GEMINI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  PROCESS_MONITORING_ENABLED: envBoolean(false),
  PROCESS_MONITORING_CRON: z.string().default('0 3 * * *'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('\n❌ Variáveis de ambiente inválidas:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;

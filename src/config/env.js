import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  API_SECRET_KEY: z.string().min(16, 'API_SECRET_KEY deve ter pelo menos 16 caracteres'),

  SUPABASE_URL: z.string().url('SUPABASE_URL inválida'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY é obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatória'),

  DATAJUD_BASE_URL: z.string().url().default('https://api-publica.datajud.cnj.jus.br'),
  DATAJUD_API_KEY: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  PROCESS_MONITORING_ENABLED: z.coerce.boolean().default(true),
  PROCESS_MONITORING_CRON: z.string().default('0 3 * * *'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('\n❌ Variáveis de ambiente inválidas:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;

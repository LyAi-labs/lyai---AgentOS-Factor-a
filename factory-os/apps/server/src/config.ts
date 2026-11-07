import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(0).max(65_535).default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Si se define, se usa PostgreSQL; si no, almacenamiento en memoria (modo demo). */
  DATABASE_URL: z.url().optional(),
  SIM_SPEED: z.coerce.number().min(0.1).max(100).default(10),
  SIM_ARRIVAL_RATE: z.coerce.number().min(0).max(120).default(2),
  SIM_AUTO_APPROVE: bool.default(false),
  SIM_AUTOSTART: bool.default(true),
  SIM_SEED: z.coerce.number().int().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

/** Falla rápido y con mensaje claro si la configuración es inválida. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuración inválida:\n${issues}`);
  }
  return parsed.data;
}

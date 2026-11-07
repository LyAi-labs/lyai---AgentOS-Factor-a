import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { MemoryRepository } from './persistence/memoryRepository.js';
import { PostgresRepository } from './persistence/postgresRepository.js';
import type { Repository } from './persistence/repository.js';
import { FactoryRuntime } from './runtime.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const repo: Repository = config.DATABASE_URL
    ? new PostgresRepository(config.DATABASE_URL)
    : new MemoryRepository();

  // Arranque con reintentos: en compose la BD puede tardar unos segundos aunque el healthcheck pase.
  let runtime: FactoryRuntime | null = null;
  for (let attempt = 1; attempt <= 10 && !runtime; attempt++) {
    try {
      runtime = await FactoryRuntime.create({
        repo,
        logger: console,
        settings: {
          running: config.SIM_AUTOSTART,
          speed: config.SIM_SPEED,
          arrivalRatePerMin: config.SIM_ARRIVAL_RATE,
          autoApprove: config.SIM_AUTO_APPROVE,
        },
        ...(config.SIM_SEED !== undefined ? { seed: config.SIM_SEED } : {}),
      });
    } catch (error) {
      if (attempt === 10) throw error;
      console.warn(`Persistencia no disponible (intento ${attempt}/10): ${(error as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  if (!runtime) throw new Error('No se pudo inicializar el runtime');

  const { app } = buildApp({ runtime, logger: { level: config.LOG_LEVEL } });
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'apagado ordenado');
    try {
      await app.close();
      await runtime.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'error en el apagado');
      process.exit(1);
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.HOST, port: config.PORT });
  app.log.info({ storage: repo.kind }, 'factory-os server escuchando');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

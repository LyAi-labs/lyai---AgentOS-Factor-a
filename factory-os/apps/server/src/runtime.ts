/**
 * Composición: motor + repositorio + escritura diferida + bucle de reloj.
 * Es la única pieza con temporizadores; el motor en sí es determinista y testeable sin ellos.
 */
import { EDGES, LAYERS, NODES } from '@factory-os/shared';
import type { NodeConfig, NodeConfigUpdate } from '@factory-os/shared';
import { FactoryEngine } from './engine/engine.js';
import type { EngineSettings } from './engine/engine.js';
import { SimulatedExecutor } from './engine/executor.js';
import type { StageExecutor } from './engine/executor.js';
import { createRng } from './engine/random.js';
import type { Repository } from './persistence/repository.js';
import { WriteBehind } from './persistence/writeBehind.js';

export interface Logger {
  info(obj: object | string, msg?: string): void;
  warn(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
}

export interface RuntimeOptions {
  repo: Repository;
  logger: Logger;
  settings?: Partial<EngineSettings>;
  seed?: number;
  executor?: StageExecutor;
  tickMs?: number;
  flushMs?: number;
  /** false en tests: el reloj se avanza a mano con engine.tick(). */
  startClock?: boolean;
  now?: () => number;
}

export class FactoryRuntime {
  readonly engine: FactoryEngine;
  readonly writer: WriteBehind;
  readonly repo: Repository;
  private readonly logger: Logger;
  private timer: NodeJS.Timeout | null = null;
  private lastTick = 0;
  private readonly tickMs: number;
  private readonly now: () => number;
  private readonly startedAt: number;

  private constructor(options: RuntimeOptions, configs: readonly NodeConfig[]) {
    this.repo = options.repo;
    this.logger = options.logger;
    this.tickMs = options.tickMs ?? 100;
    this.now = options.now ?? Date.now;
    this.startedAt = this.now();
    const rng = createRng(options.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.engine = new FactoryEngine({
      rng,
      executor: options.executor ?? new SimulatedExecutor(rng),
      startTime: this.now(),
      configs,
      ...(options.settings ? { settings: options.settings } : {}),
      onListenerError: (error) => this.logger.error({ err: error }, 'listener del motor falló'),
    });
    this.writer = new WriteBehind(this.repo, options.flushMs ?? 250, (error) =>
      this.logger.error({ err: error }, 'fallo al persistir lote; se reintentará'),
    );
    this.engine.subscribe({
      onTaskChanged: (task) => this.writer.enqueueTask(task),
      onStageRun: (run) => this.writer.enqueueRun(run),
    });
  }

  static async create(options: RuntimeOptions): Promise<FactoryRuntime> {
    const { repo, logger } = options;
    await repo.migrate();
    await repo.seedTopology(LAYERS, NODES, EDGES);
    const configs = await repo.loadNodeConfigs();
    const runtime = new FactoryRuntime(options, configs);
    const open = await repo.loadOpenTasks();
    const restored = runtime.engine.restore(open);
    logger.info({ storage: repo.kind, restored }, 'runtime listo');
    if (options.startClock !== false) runtime.startClock();
    runtime.writer.start();
    return runtime;
  }

  startClock(): void {
    if (this.timer) return;
    this.lastTick = this.now();
    this.timer = setInterval(() => {
      const now = this.now();
      const dt = now - this.lastTick;
      this.lastTick = now;
      try {
        this.engine.advance(dt);
      } catch (error) {
        this.logger.error({ err: error }, 'error en el tick del motor; se pausa la simulación');
        this.engine.updateSettings({ running: false });
      }
    }, this.tickMs);
    this.timer.unref();
  }

  async updateNodeConfig(nodeId: string, patch: NodeConfigUpdate): Promise<NodeConfig> {
    const config = this.engine.updateNodeConfig(nodeId, patch);
    await this.repo.saveNodeConfig(config);
    return config;
  }

  async health(): Promise<{
    status: 'ok' | 'degraded';
    storage: Repository['kind'];
    database: 'ok' | 'error';
    persistence: ReturnType<WriteBehind['getStatus']>;
    uptimeSec: number;
  }> {
    let database: 'ok' | 'error' = 'ok';
    try {
      await this.repo.ping();
    } catch {
      database = 'error';
    }
    const persistence = this.writer.getStatus();
    const degraded = database === 'error' || persistence.lastError !== null;
    return {
      status: degraded ? 'degraded' : 'ok',
      storage: this.repo.kind,
      database,
      persistence,
      uptimeSec: Math.round((this.now() - this.startedAt) / 1000),
    };
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.writer.stop();
    await this.repo.close();
  }
}

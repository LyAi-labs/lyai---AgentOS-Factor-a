/**
 * Escritura diferida: el motor es síncrono y rápido; la BD se actualiza en lotes cada `intervalMs`.
 * - Coalescencia: N cambios de una tarea entre dos vaciados = 1 upsert con el último estado.
 * - Serialización: nunca hay dos vaciados concurrentes (orden de escritura garantizado).
 * - Resiliencia: si un lote falla, se reencola y se reintenta en el siguiente ciclo.
 */
import type { StageRunRecord, TaskView } from '@factory-os/shared';
import type { Repository } from './repository.js';

export interface WriteBehindStatus {
  pendingTasks: number;
  pendingRuns: number;
  flushes: number;
  failedFlushes: number;
  /** Registros descartados por violar restricciones de integridad (nunca bloquean al resto). */
  dropped: number;
  lastError: string | null;
}

/** Código SQLSTATE de clase 23 (violación de integridad): reintentar el mismo dato no lo arreglará. */
export function isIntegrityViolation(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.startsWith('23');
}

export class WriteBehind {
  private tasks = new Map<string, TaskView>();
  private runs: StageRunRecord[] = [];
  private inFlight: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly status = { flushes: 0, failedFlushes: 0, dropped: 0, lastError: null as string | null };

  constructor(
    private readonly repo: Repository,
    private readonly intervalMs = 250,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.intervalMs);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.flush();
  }

  enqueueTask(task: TaskView): void {
    this.tasks.set(task.id, task);
  }

  enqueueRun(run: StageRunRecord): void {
    this.runs.push(run);
  }

  /** Vacía todo lo pendiente; si ya hay un vaciado en curso, espera a él y repite. */
  async flush(): Promise<void> {
    while (this.inFlight) await this.inFlight;
    if (this.tasks.size === 0 && this.runs.length === 0) return;
    const tasks = this.tasks;
    const runs = this.runs;
    this.tasks = new Map();
    this.runs = [];
    this.inFlight = this.repo
      .persistBatch([...tasks.values()], runs)
      .then(() => {
        this.status.flushes += 1;
        this.status.lastError = null;
      })
      .catch(async (error: unknown) => {
        if (isIntegrityViolation(error)) {
          await this.isolate([...tasks.values()], runs);
          return;
        }
        this.status.failedFlushes += 1;
        this.status.lastError = error instanceof Error ? error.message : String(error);
        // Reencolar sin pisar estados más recientes llegados durante el intento.
        for (const [id, task] of tasks) if (!this.tasks.has(id)) this.tasks.set(id, task);
        this.runs = [...runs, ...this.runs];
        this.onError(error);
      })
      .finally(() => {
        this.inFlight = null;
      });
    await this.inFlight;
  }

  /** Persiste uno a uno (tareas antes que ejecuciones, por la FK) y descarta solo lo inválido. */
  private async isolate(tasks: readonly TaskView[], runs: readonly StageRunRecord[]): Promise<void> {
    const attempt = async (t: readonly TaskView[], r: readonly StageRunRecord[], what: string) => {
      try {
        await this.repo.persistBatch(t, r);
      } catch (error) {
        if (!isIntegrityViolation(error)) throw error;
        this.status.dropped += 1;
        this.onError(new Error(`Registro descartado (${what}): ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    try {
      for (const task of tasks) await attempt([task], [], `tarea ${task.id}`);
      for (const run of runs) await attempt([], [run], `ejecución ${run.id}`);
      this.status.flushes += 1;
      this.status.lastError = null;
    } catch (error) {
      this.status.failedFlushes += 1;
      this.status.lastError = error instanceof Error ? error.message : String(error);
      this.onError(error);
    }
  }

  getStatus(): WriteBehindStatus {
    return { pendingTasks: this.tasks.size, pendingRuns: this.runs.length, ...this.status };
  }
}

/** Estructuras acotadas en memoria para telemetría: nunca crecen sin límite. */

export class Ring<T> {
  private readonly items: T[] = [];

  constructor(private readonly capacity: number) {
    if (capacity <= 0) throw new Error('Ring: capacidad debe ser > 0');
  }

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.capacity) this.items.shift();
  }

  values(): readonly T[] {
    return this.items;
  }

  get size(): number {
    return this.items.length;
  }
}

export class NodeStats {
  processed = 0;
  failed = 0;
  accesses = 0;
  /** Para nodos de contexto: tiempo simulado hasta el que se consideran activos. */
  activeUntil = 0;
  readonly durations = new Ring<number>(200);
  readonly waits = new Ring<number>(200);
  readonly recentOutcomes = new Ring<boolean>(10);

  record(durationMs: number, waitMs: number, success: boolean): void {
    this.processed += 1;
    if (!success) this.failed += 1;
    this.durations.push(durationMs);
    this.waits.push(waitMs);
    this.recentOutcomes.push(success);
  }

  recentFailureRatio(): number | null {
    const values = this.recentOutcomes.values();
    if (values.length < 3) return null;
    return values.filter((v) => !v).length / values.length;
  }
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Percentil por rango más cercano. `q` en [0,1]. */
export function percentile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[rank] ?? null;
}

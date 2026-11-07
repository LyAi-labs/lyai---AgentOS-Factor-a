/** Generador pseudoaleatorio con semilla (mulberry32): ejecuciones reproducibles en tests. */
export interface Rng {
  next(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng.next() * items.length)];
  if (item === undefined) throw new Error('pick() sobre lista vacía');
  return item;
}

/** Elección ponderada: pesos no negativos, al menos uno > 0. */
export function weighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = rng.next() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r < 0) return value;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('weighted() sin entradas');
  return last[0];
}

/** Intervalo exponencial (proceso de Poisson) para una tasa por minuto. */
export function exponentialIntervalMs(rng: Rng, ratePerMin: number): number {
  const u = Math.max(rng.next(), 1e-9);
  return (-Math.log(u) / ratePerMin) * 60_000;
}

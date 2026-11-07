export const EMPTY = '—';

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return EMPTY;
  if (ms < 1_000) return `${Math.round(ms)} ms`;
  const s = ms / 1_000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(m < 10 ? 1 : 0)} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return EMPTY;
  return `${(ratio * 100).toFixed(digits)} %`;
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return EMPTY;
  return n.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

/** Hora simulada HH:MM:SS (el motor corre en tiempo simulado, no en reloj de pared). */
export function formatClock(epochMs: number | null | undefined): string {
  if (epochMs === null || epochMs === undefined || !Number.isFinite(epochMs)) return EMPTY;
  return new Date(epochMs).toLocaleTimeString('es-ES', { hour12: false });
}

/** Antigüedad relativa respecto al reloj simulado. */
export function formatAgo(epochMs: number | null | undefined, nowMs: number | null | undefined): string {
  if (epochMs === null || epochMs === undefined || nowMs === null || nowMs === undefined) return EMPTY;
  const d = Math.max(0, nowMs - epochMs);
  return d < 1_000 ? 'ahora' : `hace ${formatDuration(d)}`;
}

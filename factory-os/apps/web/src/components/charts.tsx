/**
 * Gráficas mínimas en SVG: una serie por gráfica (nunca doble eje), línea de 2 px,
 * cruceta + tooltip al pasar el ratón, rejilla recesiva y tabla accesible equivalente.
 */
import { useId, useState } from 'react';

interface LineChartProps {
  title: string;
  points: readonly { x: number; y: number | null }[];
  formatY: (v: number) => string;
  formatX: (v: number) => string;
  color?: string;
  height?: number;
}

const W = 320;

/** Redondea hacia arriba a 1, 2 o 5 × 10^k (mínimo 1): ejes con ticks limpios y sin duplicados. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 1) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}
const PAD = { l: 40, r: 10, t: 8, b: 18 };

export function LineChart({ title, points, formatY, formatX, color = 'var(--series-1)', height = 110 }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const valid = points.filter((p): p is { x: number; y: number } => p.y !== null);
  const H = height;
  if (valid.length < 2) {
    return (
      <figure className="chart">
        <figcaption id={titleId}>{title}</figcaption>
        <div className="chart__empty">Esperando datos…</div>
      </figure>
    );
  }
  const xs = valid.map((p) => p.x);
  const ys = valid.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const yMax = niceCeil(Math.max(...ys) * 1.1);
  const ticks = yMax >= 2 ? [0, 0.5, 1] : [0, 1];
  const sx = (x: number) => PAD.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - PAD.l - PAD.r);
  const sy = (y: number) => PAD.t + (1 - y / yMax) * (H - PAD.t - PAD.b);
  const d = valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const hovered = hover !== null ? valid[hover] : undefined;
  const last = valid[valid.length - 1];

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * (W - PAD.l - PAD.r) + PAD.l;
    let best = 0;
    for (let i = 1; i < valid.length; i++) {
      const p = valid[i];
      const b = valid[best];
      if (p && b && Math.abs(sx(p.x) - px) < Math.abs(sx(b.x) - px)) best = i;
    }
    setHover(best);
  };

  return (
    <figure className="chart">
      <figcaption id={titleId}>
        {title}
        {last && <strong className="chart__current">{formatY(last.y)}</strong>}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId} className="chart__svg">
        {ticks.map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(yMax * f)} y2={sy(yMax * f)} className="chart__grid" />
            <text x={PAD.l - 6} y={sy(yMax * f) + 3} className="chart__tick" textAnchor="end">
              {formatY(yMax * f)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 4} className="chart__tick">{formatX(x0)}</text>
        <text x={W - PAD.r} y={H - 4} className="chart__tick" textAnchor="end">{formatX(x1)}</text>
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hovered && (
          <g>
            <line x1={sx(hovered.x)} x2={sx(hovered.x)} y1={PAD.t} y2={H - PAD.b} className="chart__crosshair" />
            <circle cx={sx(hovered.x)} cy={sy(hovered.y)} r={4} fill={color} stroke="var(--surface-1)" strokeWidth={2} />
          </g>
        )}
        <rect
          x={PAD.l}
          y={0}
          width={W - PAD.l - PAD.r}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hovered && (
        <div className="chart__tooltip" role="status">
          {formatX(hovered.x)} · <strong>{formatY(hovered.y)}</strong>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {valid.map((p) => (
            <tr key={p.x}>
              <td>{formatX(p.x)}</td>
              <td>{formatY(p.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

interface BarRow {
  key: string;
  label: string;
  value: number;
  display: string;
  hint?: string;
}

/** Barras horizontales de una sola medida (magnitud, un solo tono), etiquetadas directamente. */
export function BarList({ title, rows, max = 1 }: { title: string; rows: readonly BarRow[]; max?: number }) {
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <ul className="bars">
        {rows.map((r) => (
          <li key={r.key} className="bars__row" title={r.hint}>
            <span className="bars__label">{r.label}</span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${Math.min(100, (r.value / max) * 100)}%` }} />
            </span>
            <span className="bars__value">{r.display}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

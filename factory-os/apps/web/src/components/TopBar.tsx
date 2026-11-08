import type { EngineState, MetricsSnapshot } from '@factory-os/shared';
import { formatClock, formatDuration, formatNumber, formatPercent } from '../lib/format';
import type { ConnectionStatus } from '../state/store';
import { useAction } from './useAction';
import { api } from '../lib/api';
import type { Theme } from './FactoryCanvas';

interface Props {
  connection: ConnectionStatus;
  engine: EngineState | null;
  metrics: MetricsSnapshot | null;
  theme: Theme;
  onToggleTheme: () => void;
}

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  open: 'En vivo',
  connecting: 'Conectando…',
  closed: 'Desconectado · reintentando',
};

export function TopBar({ connection, engine, metrics, theme, onToggleTheme }: Props) {
  const action = useAction();
  const t = metrics?.totals;
  const kpis: { label: string; value: string; hint: string; tone?: 'warn' | 'bad' }[] = [
    { label: 'En curso (WIP)', value: formatNumber(t?.wip), hint: 'Tareas pendientes o en ejecución' },
    { label: 'Completadas', value: formatNumber(t?.completed), hint: 'Llegaron a Producción' },
    { label: 'En error', value: formatNumber(t?.errored), hint: 'Requieren reintento', tone: (t?.errored ?? 0) > 0 ? 'bad' : undefined },
    { label: 'Esperan tu OK', value: formatNumber(t?.awaitingApproval), hint: 'Pasos humanos pendientes', tone: (t?.awaitingApproval ?? 0) > 0 ? 'warn' : undefined },
    { label: 'Throughput', value: `${formatNumber(metrics?.throughputPerMin)}/min`, hint: 'Completadas en el último minuto simulado' },
    { label: 'Éxito tareas', value: formatPercent(metrics?.successRate), hint: 'completadas / (completadas + error)' },
    { label: 'Éxito pasos', value: formatPercent(metrics?.stepSuccessRate), hint: 'Intentos de paso sin fallo' },
    { label: 'Ciclo p50 · p95', value: `${formatDuration(metrics?.cycleTimeMs.p50)} · ${formatDuration(metrics?.cycleTimeMs.p95)}`, hint: 'Entrada → Producción (tiempo simulado)' },
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden>◆</span>
        <div title={`Factoría IA de LyAi · ${engine ? formatClock(engine.simTime) : '—'} sim.`}>
          <h1>Factory OS</h1>
          <p>Factoría IA de LyAi · {engine ? formatClock(engine.simTime) : '—'} sim.</p>
        </div>
        <span className={`conn conn--${connection}`} role="status">
          <span aria-hidden>●</span> {CONNECTION_LABEL[connection]}
        </span>
      </div>

      <ul className="kpis">
        {kpis.map((k) => (
          <li key={k.label} className={`kpi${k.tone ? ` kpi--${k.tone}` : ''}`} title={k.hint}>
            <span className="kpi__label">{k.label}</span>
            <span className="kpi__value">{k.value}</span>
          </li>
        ))}
      </ul>

      {engine && (
        <div className="controls" aria-label="Control del motor">
          <button
            type="button"
            className="btn"
            disabled={action.busy}
            onClick={() => void action.run(() => api.updateEngine({ running: !engine.running }))}
          >
            {engine.running ? '❚❚ Pausar' : '▶ Reanudar'}
          </button>
          <label className="field field--inline">
            Velocidad
            <select
              value={engine.speed}
              onChange={(e) => void action.run(() => api.updateEngine({ speed: Number(e.target.value) }))}
            >
              {[1, 5, 10, 25, 50].map((s) => (
                <option key={s} value={s}>×{s}</option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            Llegadas/min
            <select
              value={engine.arrivalRatePerMin}
              onChange={(e) => void action.run(() => api.updateEngine({ arrivalRatePerMin: Number(e.target.value) }))}
            >
              {[0, 1, 2, 4, 8, 16].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="field field--inline" title="Aprueba automáticamente Tu OK, Carril urgencia y Producción">
            <input
              type="checkbox"
              checked={engine.autoApprove}
              onChange={(e) => void action.run(() => api.updateEngine({ autoApprove: e.target.checked }))}
            />
            Auto-OK
          </label>
          <button
            type="button"
            className="btn btn--danger"
            disabled={action.busy || engine.lineStopped}
            title="Andon: para la línea (constitución O1)"
            onClick={() => {
              const reason = window.prompt('Motivo de la parada de línea');
              if (reason && reason.trim().length >= 3) void action.run(() => api.stopLine(reason.trim()));
            }}
          >
            ■ Parar línea
          </button>
          <button type="button" className="btn" onClick={onToggleTheme} aria-label="Cambiar tema">
            {theme === 'dark' ? '☾ Oscuro' : '☀ Claro'}
          </button>
          {action.error && <span className="error-text" role="alert">{action.error}</span>}
        </div>
      )}
    </header>
  );
}

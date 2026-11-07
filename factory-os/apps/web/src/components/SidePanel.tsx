import { useMemo, useState } from 'react';
import { LANES, LAYERS, PRIORITIES, requireNode, TASK_KINDS } from '@factory-os/shared';
import type { Lane, NodeConfig, Priority, StepStatus, TaskKind, TaskView } from '@factory-os/shared';
import { api } from '../lib/api';
import { formatAgo, formatClock, formatDuration, formatNumber, formatPercent } from '../lib/format';
import { CATEGORY_STYLE, HEALTH_STYLE } from '../lib/graph';
import { computeImpact } from '../lib/impact';
import { AuditPanel } from './AuditPanel';
import type { FactoryState } from '../state/store';
import { BarList, LineChart } from './charts';
import { useAction } from './useAction';

type Tab = 'overview' | 'node' | 'tasks' | 'activity';

interface Props {
  state: FactoryState;
  onSelectNode: (id: string | null) => void;
  onSelectTask: (id: string | null) => void;
}

export function SidePanel({ state, onSelectNode, onSelectTask }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  // Seleccionar un nodo en el lienzo abre su inspector (ajuste de estado durante el render, sin efecto).
  const [prevNode, setPrevNode] = useState(state.selectedNodeId);
  if (prevNode !== state.selectedNodeId) {
    setPrevNode(state.selectedNodeId);
    if (state.selectedNodeId) setTab('node');
  }
  const activeTab = tab;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'node', label: 'Nodo' },
    { id: 'tasks', label: `Tareas (${state.tasks.length})` },
    { id: 'activity', label: 'Actividad' },
  ];
  return (
    <aside className="panel">
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab${activeTab === t.id ? ' is-active' : ''}`}
            onClick={() => {
              setTab(t.id);
              if (t.id === 'overview') onSelectNode(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="panel__body">
        {activeTab === 'overview' && <Overview state={state} onSelectNode={onSelectNode} />}
        {activeTab === 'node' && <NodeInspector state={state} onSelectTask={(id) => { onSelectTask(id); setTab('tasks'); }} />}
        {activeTab === 'tasks' && <Tasks state={state} onSelectTask={onSelectTask} />}
        {activeTab === 'activity' && <Activity state={state} onSelectNode={onSelectNode} />}
      </div>
    </aside>
  );
}

// ───────────────────────── Resumen ─────────────────────────

function Overview({ state, onSelectNode }: { state: FactoryState; onSelectNode: (id: string) => void }) {
  const m = state.metrics;
  if (!m) return <p className="muted">Esperando telemetría…</p>;
  const clock = (x: number) => formatClock(x);
  return (
    <div className="stack">
      <section>
        <h2>Cuellos de botella</h2>
        {m.bottlenecks.length === 0 ? (
          <p className="muted">Sin bloqueos: todas las colas bajo su capacidad.</p>
        ) : (
          <ol className="bottlenecks">
            {m.bottlenecks.map((b) => (
              <li key={b.nodeId}>
                <button type="button" className="linklike" onClick={() => onSelectNode(b.nodeId)}>
                  {requireNode(b.nodeId).label}
                </button>
                <span className="bottlenecks__score">{b.score.toFixed(1)}</span>
                <span className="bottlenecks__reason">{b.reason}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <LineChart
        title="Throughput (completadas/min)"
        points={state.history.map((h) => ({ x: h.at, y: h.throughputPerMin }))}
        formatY={(v) => formatNumber(v, 0)}
        formatX={clock}
      />
      <LineChart
        title="Trabajo en curso (WIP)"
        points={state.history.map((h) => ({ x: h.at, y: h.wip }))}
        formatY={(v) => formatNumber(v, 0)}
        formatX={clock}
      />
      <LineChart
        title="Tiempo de ciclo p95"
        points={state.history.map((h) => ({ x: h.at, y: h.cycleP95Ms }))}
        formatY={(v) => formatDuration(v)}
        formatX={clock}
      />
      <BarList
        title="Utilización por capa"
        rows={m.layers.map((l) => {
          const layer = LAYERS.find((x) => x.id === l.layer);
          return {
            key: String(l.layer),
            label: `${layer?.code ?? l.layer} ${layer?.name.split(' · ')[0] ?? ''}`,
            value: l.utilization,
            display: formatPercent(l.utilization),
            hint: `cola ${l.queued} · en ejecución ${l.running} · esperan OK ${l.awaiting} · espera media ${formatDuration(l.avgWaitMs)}`,
          };
        })}
      />
      <table className="table">
        <caption>Bloqueos por fase</caption>
        <thead>
          <tr>
            <th>Capa</th>
            <th>Cola</th>
            <th>Ejec.</th>
            <th>OK</th>
            <th>Espera</th>
          </tr>
        </thead>
        <tbody>
          {m.layers.map((l) => (
            <tr key={l.layer}>
              <td>{LAYERS.find((x) => x.id === l.layer)?.code}</td>
              <td>{l.queued}</td>
              <td>{l.running}</td>
              <td>{l.awaiting}</td>
              <td>{formatDuration(l.avgWaitMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────── Nodo ─────────────────────────

function NodeInspector({ state, onSelectTask }: { state: FactoryState; onSelectTask: (id: string) => void }) {
  const id = state.selectedNodeId;
  if (!id) return <p className="muted">Selecciona un nodo en el lienzo.</p>;
  const def = requireNode(id);
  const metrics = state.metrics?.nodes.find((n) => n.nodeId === id) ?? null;
  const config = state.configs[id] ?? null;
  const here = state.tasks.filter((t) =>
    t.steps.some((s) => s.nodeId === id && (s.status === 'running' || s.status === 'queued' || s.status === 'awaiting_approval')),
  );
  const health = HEALTH_STYLE[metrics?.health ?? 'idle'];
  return (
    <div className="stack">
      <section>
        <h2 className="node-title">
          <span className="chip" style={{ borderColor: CATEGORY_STYLE[def.category].color }}>
            {CATEGORY_STYLE[def.category].label}
          </span>
          {def.label}
        </h2>
        <p className="muted">{def.engine} · {def.maturity} · rol {def.role}</p>
        <p>{def.description}</p>
        <p style={{ color: health.color }}>
          <span aria-hidden>{health.icon}</span> {health.label}
        </p>
      </section>
      <dl className="metrics-grid">
        <Metric label="En ejecución" value={`${metrics?.running ?? 0} / ${config?.capacity ?? '—'}`} />
        <Metric label="En cola" value={formatNumber(metrics?.queued)} />
        <Metric label="Esperan OK" value={formatNumber(metrics?.awaiting)} />
        <Metric label="Utilización" value={formatPercent(metrics?.utilization)} />
        <Metric label="Procesados" value={formatNumber(metrics?.processed)} />
        <Metric label="Éxito" value={formatPercent(metrics?.successRate)} />
        <Metric label="Duración media" value={formatDuration(metrics?.avgDurationMs)} />
        <Metric label="Duración p95" value={formatDuration(metrics?.p95DurationMs)} />
        <Metric label="Espera media" value={formatDuration(metrics?.avgWaitMs)} />
        {def.role === 'resource' && <Metric label="Consultas" value={formatNumber(metrics?.accesses)} />}
      </dl>
      {config && (def.role === 'processor' || def.role === 'gateway') && <NodeConfigForm config={config} />}
      <ImpactSection nodeId={id} tasks={state.tasks} />
      <section>
        <h3>Tareas en este nodo ({here.length})</h3>
        <TaskList tasks={here} nodeId={id} now={state.engine?.simTime ?? null} onSelect={onSelectTask} />
      </section>
    </div>
  );
}

function ImpactSection({ nodeId, tasks }: { nodeId: string; tasks: readonly TaskView[] }) {
  const impact = useMemo(() => computeImpact(nodeId, tasks), [nodeId, tasks]);
  return (
    <section className="impact" aria-label="Impacto aguas abajo">
      <h3>Impacto aguas abajo</h3>
      <p className="muted">
        {impact.downstream.length} nodos dependen de este paso
        {impact.layersAffected.length > 0 && ` (capas ${impact.layersAffected.map((l) => `0${String(l)}`).join(', ')})`}
        {' · '}
        {impact.pendingTasks.length} tareas en curso aún tienen que pasar por aquí.
      </p>
      {impact.downstream.length > 0 && (
        <p className="impact__list">{impact.downstream.map((d) => d.label).join(' · ')}</p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function NodeConfigForm({ config }: { config: NodeConfig }) {
  const action = useAction();
  const [capacity, setCapacity] = useState(config.capacity);
  const [durationS, setDurationS] = useState(config.baseDurationMs / 1000);
  const [failurePct, setFailurePct] = useState(Math.round(config.failureRate * 100));
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(() =>
          api.updateNode(config.nodeId, {
            capacity,
            baseDurationMs: Math.round(durationS * 1000),
            failureRate: failurePct / 100,
          }),
        );
      }}
    >
      <h3>Configuración operativa</h3>
      <label className="field">
        Capacidad (huecos)
        <input type="number" min={1} max={64} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
      </label>
      <label className="field">
        Duración media (s sim.)
        <input type="number" min={0} step={0.5} value={durationS} onChange={(e) => setDurationS(Number(e.target.value))} />
      </label>
      <label className="field">
        Tasa de fallo / rechazo (%)
        <input type="number" min={0} max={100} value={failurePct} onChange={(e) => setFailurePct(Number(e.target.value))} />
      </label>
      <button type="submit" className="btn btn--primary" disabled={action.busy}>Aplicar</button>
      {action.error && <p className="error-text" role="alert">{action.error}</p>}
    </form>
  );
}

// ───────────────────────── Tareas ─────────────────────────

type Filter = 'all' | 'awaiting' | 'running' | 'error' | 'completed';

const STEP_LABEL: Record<StepStatus, string> = {
  blocked: 'bloqueado',
  queued: 'en cola',
  running: 'ejecutando',
  awaiting_approval: 'espera OK',
  done: 'hecho',
  failed: 'fallido',
};

const TASK_LABEL: Record<TaskView['status'], string> = {
  pending: 'pendiente',
  running: 'en ejecución',
  completed: 'completado',
  error: 'error',
};

function Tasks({ state, onSelectTask }: { state: FactoryState; onSelectTask: (id: string | null) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const selected = state.tasks.find((t) => t.id === state.selectedTaskId) ?? null;
  const filtered = useMemo(
    () =>
      state.tasks.filter((t) => {
        switch (filter) {
          case 'all':
            return true;
          case 'awaiting':
            return t.steps.some((s) => s.status === 'awaiting_approval');
          case 'running':
            return t.status === 'running' || t.status === 'pending';
          case 'error':
          case 'completed':
            return t.status === filter;
        }
      }),
    [state.tasks, filter],
  );
  if (selected) {
    return <TaskDetail task={selected} now={state.engine?.simTime ?? null} onBack={() => onSelectTask(null)} />;
  }
  return (
    <div className="stack">
      <NewTaskForm />
      <div className="segmented" role="radiogroup" aria-label="Filtro de tareas">
        {(['all', 'awaiting', 'running', 'error', 'completed'] as const).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
            {{ all: 'Todas', awaiting: 'Esperan OK', running: 'En curso', error: 'Error', completed: 'Hechas' }[f]}
          </button>
        ))}
      </div>
      <TaskList tasks={filtered} nodeId={null} now={state.engine?.simTime ?? null} onSelect={onSelectTask} />
    </div>
  );
}

function currentStep(task: TaskView): string {
  const active = task.steps.filter((s) => s.status === 'running' || s.status === 'queued' || s.status === 'awaiting_approval');
  if (active.length === 0) return task.status === 'completed' ? 'Producción' : '—';
  return active.map((s) => requireNode(s.nodeId).label).join(' · ');
}

function TaskList({ tasks, nodeId, now, onSelect }: { tasks: readonly TaskView[]; nodeId: string | null; now: number | null; onSelect: (id: string) => void }) {
  if (tasks.length === 0) return <p className="muted">Sin tareas.</p>;
  return (
    <ul className="tasks">
      {tasks.slice(0, 120).map((t) => {
        const doneSteps = t.steps.filter((s) => s.status === 'done').length;
        return (
          <li key={t.id}>
            <button type="button" className={`task task--${t.status}`} onClick={() => onSelect(t.id)}>
              <span className="task__title">{t.title}</span>
              <span className="task__meta">
                <span className={`status status--${t.status}`}>{TASK_LABEL[t.status]}</span>
                {t.lane} · {t.kind} · {t.priority}
                {t.reworkCount > 0 && ` · retrabajo ${t.reworkCount}`}
              </span>
              <span className="task__where">{nodeId ? STEP_LABEL[t.steps.find((s) => s.nodeId === nodeId)?.status ?? 'blocked'] : currentStep(t)}</span>
              <span className="progress" aria-label={`${doneSteps} de ${t.steps.length} pasos`}>
                <span style={{ width: `${(doneSteps / t.steps.length) * 100}%` }} />
              </span>
              <span className="task__ago">{formatAgo(t.updatedAt, now)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function NewTaskForm() {
  const action = useAction();
  const [title, setTitle] = useState('');
  const [lane, setLane] = useState<Lane>('standard');
  const [kind, setKind] = useState<TaskKind>('no_visual');
  const [priority, setPriority] = useState<Priority>('P2');
  return (
    <form
      className="form form--grid"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api.createTask({ title, lane, kind, priority });
          setTitle('');
        });
      }}
    >
      <label className="field field--wide">
        Nueva solicitud
        <input required minLength={3} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p. ej. Aviso de cierre de pista por viento" />
      </label>
      <Select label="Carril" value={lane} options={LANES} onChange={setLane} />
      <Select label="Tipo" value={kind} options={TASK_KINDS} onChange={setKind} />
      <Select label="Prioridad" value={priority} options={PRIORITIES} onChange={setPriority} />
      <button type="submit" className="btn btn--primary" disabled={action.busy}>Encolar</button>
      {action.error && <p className="error-text field--wide" role="alert">{action.error}</p>}
    </form>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function TaskDetail({ task, now, onBack }: { task: TaskView; now: number | null; onBack: () => void }) {
  const action = useAction();
  return (
    <div className="stack">
      <button type="button" className="linklike" onClick={onBack}>← Volver a la lista</button>
      <section>
        <h2>{task.title}</h2>
        <p className="muted">
          {task.lane} · {task.kind} · {task.priority} · creada {formatAgo(task.createdAt, now)}
          {task.completedAt && ` · ciclo ${formatDuration(task.completedAt - task.createdAt)}`}
        </p>
        <p>
          <span className={`status status--${task.status}`}>{TASK_LABEL[task.status]}</span>
          {task.reworkCount > 0 && <span className="muted"> · retrabajo {task.reworkCount}/2</span>}
        </p>
        {task.lastError && <p className="error-text">{task.lastError}</p>}
        {task.status === 'error' && (
          <button type="button" className="btn btn--primary" disabled={action.busy} onClick={() => void action.run(() => api.retry(task.id))}>
            Reintentar desde el paso fallido
          </button>
        )}
        {action.error && <p className="error-text" role="alert">{action.error}</p>}
      </section>
      <ol className="steps">
        {task.steps.map((s) => (
          <li key={s.nodeId} className={`step step--${s.status}`}>
            <span className="step__name">{requireNode(s.nodeId).label}</span>
            <span className="step__status">{STEP_LABEL[s.status]}{s.attempts > 1 ? ` · intento ${s.attempts}` : ''}</span>
            <span className="step__time">
              {s.startedAt !== null && s.finishedAt !== null ? formatDuration(s.finishedAt - s.startedAt) : ''}
            </span>
            {s.verdict && (
              <span className={`verdict verdict--${s.verdict}`}>
                veredicto: {s.verdict}
              </span>
            )}
            {s.findings.length > 0 && (
              <ul className="findings">
                {s.findings.map((f, i) => (
                  <li key={i} className={f.bloquea ? 'is-blocking' : ''}>
                    {f.bloquea ? 'bloquea' : 'no bloquea'} · {f.categoria} · {f.detalle}
                  </li>
                ))}
              </ul>
            )}
            {s.error && !s.verdict && <span className="step__error">{s.error}</span>}
            {s.status === 'awaiting_approval' && (
              <span className="step__actions">
                <button type="button" className="btn btn--primary" disabled={action.busy} onClick={() => void action.run(() => api.approve(task.id, { nodeId: s.nodeId, decision: 'approve' }))}>
                  Aprobar
                </button>
                <button type="button" className="btn btn--danger" disabled={action.busy} onClick={() => void action.run(() => api.approve(task.id, { nodeId: s.nodeId, decision: 'reject', note: 'rechazado desde el panel' }))}>
                  Rechazar
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ───────────────────────── Actividad ─────────────────────────

function Activity({ state, onSelectNode }: { state: FactoryState; onSelectNode: (id: string) => void }) {
  const events = [...state.activity].reverse();
  return (
    <div className="stack">
      <AuditPanel />
      <section>
        <h3>Actividad reciente</h3>
        {events.length === 0 ? <p className="muted">Sin actividad todavía.</p> : <ActivityList events={events} onSelectNode={onSelectNode} />}
      </section>
    </div>
  );
}

function ActivityList({ events, onSelectNode }: { events: FactoryState['activity']; onSelectNode: (id: string) => void }) {
  return (
    <ul className="activity">
      {events.map((e) => (
        <li key={e.id} className={`activity__item activity__item--${e.level}`}>
          <time>{formatClock(e.at)}</time>
          <span>{e.message}</span>
          {e.nodeId && (
            <button type="button" className="linklike" onClick={() => onSelectNode(e.nodeId as string)}>
              {requireNode(e.nodeId).label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

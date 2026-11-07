import pg from 'pg';
import type { PoolClient } from 'pg';
import type {
  EdgeDef,
  LayerDef,
  ListTasksQuery,
  NodeConfig,
  NodeDef,
  StageRunRecord,
  StepView,
  TaskView,
} from '@factory-os/shared';
import { MIGRATIONS } from './migrations.js';
import type { Repository } from './repository.js';

/** Las marcas de tiempo viajan como epoch ms (float8) en ambos sentidos. */
const ms = (column: string) => `(extract(epoch from ${column}) * 1000)::float8`;
const ts = (field: string) => `CASE WHEN x.${field} IS NULL THEN NULL ELSE to_timestamp(x.${field} / 1000.0) END`;

const TASK_SELECT = `
SELECT t.id, t.title, t.lane, t.kind, t.priority, t.status, t.rework_count,
       ${ms('t.created_at')} AS created_at, ${ms('t.updated_at')} AS updated_at,
       ${ms('t.started_at')} AS started_at, ${ms('t.completed_at')} AS completed_at, t.last_error,
       COALESCE((
         SELECT json_agg(json_build_object(
                  'nodeId', s.node_id, 'deps', s.deps, 'status', s.status, 'attempts', s.attempts,
                  'queuedAt', ${ms('s.queued_at')}, 'startedAt', ${ms('s.started_at')},
                  'finishedAt', ${ms('s.finished_at')}, 'error', s.error) ORDER BY s.ord)
         FROM task_steps s WHERE s.task_id = t.id), '[]'::json) AS steps
FROM tasks t`;

interface TaskRow {
  id: string;
  title: string;
  lane: TaskView['lane'];
  kind: TaskView['kind'];
  priority: TaskView['priority'];
  status: TaskView['status'];
  rework_count: number;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  completed_at: number | null;
  last_error: string | null;
  steps: StepView[];
}

const toTask = (r: TaskRow): TaskView => ({
  id: r.id,
  title: r.title,
  lane: r.lane,
  kind: r.kind,
  priority: r.priority,
  status: r.status,
  reworkCount: r.rework_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  startedAt: r.started_at,
  completedAt: r.completed_at,
  lastError: r.last_error,
  steps: r.steps,
});

export class PostgresRepository implements Repository {
  readonly kind = 'postgres' as const;
  private readonly pool: pg.Pool;

  constructor(connectionString: string, poolSize = 10) {
    this.pool = new pg.Pool({ connectionString, max: poolSize });
  }

  private async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate(): Promise<void> {
    await this.tx(async (c) => {
      // Lock de sesión de transacción: dos réplicas arrancando a la vez no migran en paralelo.
      await c.query('SELECT pg_advisory_xact_lock(724001)');
      await c.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      const { rows } = await c.query<{ id: number }>('SELECT id FROM schema_migrations');
      const applied = new Set(rows.map((r) => r.id));
      for (const m of MIGRATIONS) {
        if (applied.has(m.id)) continue;
        await c.query(m.sql);
        await c.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)', [m.id, m.name]);
      }
    });
  }

  async seedTopology(layers: readonly LayerDef[], nodes: readonly NodeDef[], edges: readonly EdgeDef[]): Promise<void> {
    await this.tx(async (c) => {
      await c.query(
        `INSERT INTO layers (id, code, name)
         SELECT x.id, x.code, x.name FROM jsonb_to_recordset($1::jsonb) AS x(id smallint, code text, name text)
         ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name`,
        [JSON.stringify(layers)],
      );
      // La config operativa (capacidad, duración, tasa de fallo) se conserva si ya existe.
      await c.query(
        `INSERT INTO nodes (id, layer_id, label, engine, category, role, maturity, description, col,
                            capacity, base_duration_ms, failure_rate)
         SELECT x.id, x.layer, x.label, x.engine, x.category, x.role, x.maturity, x.description, x.col,
                x.capacity, x.base_duration_ms, x.failure_rate
         FROM jsonb_to_recordset($1::jsonb) AS x(id text, layer smallint, label text, engine text, category text,
              role text, maturity text, description text, col smallint, capacity int, base_duration_ms int,
              failure_rate real)
         ON CONFLICT (id) DO UPDATE SET layer_id = EXCLUDED.layer_id, label = EXCLUDED.label,
           engine = EXCLUDED.engine, category = EXCLUDED.category, role = EXCLUDED.role,
           maturity = EXCLUDED.maturity, description = EXCLUDED.description, col = EXCLUDED.col`,
        [
          JSON.stringify(
            nodes.map((n) => ({
              ...n,
              capacity: n.profile.capacity,
              base_duration_ms: n.profile.baseDurationMs,
              failure_rate: n.profile.failureRate,
            })),
          ),
        ],
      );
      await c.query('DELETE FROM edges WHERE NOT (id = ANY($1::text[]))', [edges.map((e) => e.id)]);
      await c.query(
        `INSERT INTO edges (id, source, target, kind, label)
         SELECT x.id, x.source, x.target, x.kind, x.label
         FROM jsonb_to_recordset($1::jsonb) AS x(id text, source text, target text, kind text, label text)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label`,
        [JSON.stringify(edges)],
      );
    });
  }

  async loadNodeConfigs(): Promise<NodeConfig[]> {
    const { rows } = await this.pool.query<{ id: string; capacity: number; base_duration_ms: number; failure_rate: number }>(
      'SELECT id, capacity, base_duration_ms, failure_rate FROM nodes ORDER BY id',
    );
    return rows.map((r) => ({
      nodeId: r.id,
      capacity: r.capacity,
      baseDurationMs: r.base_duration_ms,
      failureRate: Number(r.failure_rate.toFixed(4)),
    }));
  }

  async saveNodeConfig(config: NodeConfig): Promise<void> {
    await this.pool.query(
      'UPDATE nodes SET capacity = $2, base_duration_ms = $3, failure_rate = $4 WHERE id = $1',
      [config.nodeId, config.capacity, config.baseDurationMs, config.failureRate],
    );
  }

  async persistBatch(tasks: readonly TaskView[], runs: readonly StageRunRecord[]): Promise<void> {
    if (tasks.length === 0 && runs.length === 0) return;
    await this.tx(async (c) => {
      if (tasks.length > 0) {
        await c.query(
          `INSERT INTO tasks (id, title, lane, kind, priority, status, rework_count, created_at, updated_at,
                              started_at, completed_at, last_error)
           SELECT x.id, x."title", x.lane, x.kind, x.priority, x.status, x."reworkCount",
                  ${ts('"createdAt"')}, ${ts('"updatedAt"')}, ${ts('"startedAt"')}, ${ts('"completedAt"')}, x."lastError"
           FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, "title" text, lane text, kind text, priority text,
                status text, "reworkCount" smallint, "createdAt" float8, "updatedAt" float8, "startedAt" float8,
                "completedAt" float8, "lastError" text)
           ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, rework_count = EXCLUDED.rework_count,
             updated_at = EXCLUDED.updated_at, started_at = EXCLUDED.started_at,
             completed_at = EXCLUDED.completed_at, last_error = EXCLUDED.last_error`,
          [JSON.stringify(tasks.map(({ steps: _s, ...t }) => t))],
        );
        const steps = tasks.flatMap((t) => t.steps.map((s, ord) => ({ ...s, taskId: t.id, ord })));
        await c.query(
          `INSERT INTO task_steps (task_id, node_id, ord, deps, status, attempts, queued_at, started_at,
                                   finished_at, error)
           SELECT x."taskId", x."nodeId", x.ord, ARRAY(SELECT jsonb_array_elements_text(x.deps)), x.status,
                  x.attempts, ${ts('"queuedAt"')}, ${ts('"startedAt"')}, ${ts('"finishedAt"')}, x.error
           FROM jsonb_to_recordset($1::jsonb) AS x("taskId" uuid, "nodeId" text, ord smallint, deps jsonb,
                status text, attempts smallint, "queuedAt" float8, "startedAt" float8, "finishedAt" float8,
                error text)
           ON CONFLICT (task_id, node_id) DO UPDATE SET status = EXCLUDED.status, attempts = EXCLUDED.attempts,
             queued_at = EXCLUDED.queued_at, started_at = EXCLUDED.started_at,
             finished_at = EXCLUDED.finished_at, error = EXCLUDED.error`,
          [JSON.stringify(steps)],
        );
      }
      if (runs.length > 0) {
        await c.query(
          `INSERT INTO stage_runs (id, task_id, node_id, attempt, queued_at, started_at, finished_at, outcome, error)
           SELECT x.id, x."taskId", x."nodeId", x.attempt, ${ts('"queuedAt"')}, ${ts('"startedAt"')},
                  ${ts('"finishedAt"')}, x.outcome, x.error
           FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, "taskId" uuid, "nodeId" text, attempt smallint,
                "queuedAt" float8, "startedAt" float8, "finishedAt" float8, outcome text, error text)
           ON CONFLICT (id) DO NOTHING`,
          [JSON.stringify(runs)],
        );
      }
    });
  }

  async loadOpenTasks(): Promise<TaskView[]> {
    const { rows } = await this.pool.query<TaskRow>(`${TASK_SELECT} WHERE t.status <> 'completed'`);
    return rows.map(toTask);
  }

  async listTasks(query: ListTasksQuery): Promise<TaskView[]> {
    const { rows } = await this.pool.query<TaskRow>(
      `${TASK_SELECT}
       WHERE ($1::text IS NULL OR t.status = $1) AND ($2::text IS NULL OR t.lane = $2)
       ORDER BY t.updated_at DESC LIMIT $3`,
      [query.status ?? null, query.lane ?? null, query.limit],
    );
    return rows.map(toTask);
  }

  async getTask(id: string): Promise<TaskView | null> {
    const { rows } = await this.pool.query<TaskRow>(`${TASK_SELECT} WHERE t.id = $1`, [id]);
    const row = rows[0];
    return row ? toTask(row) : null;
  }

  async listStageRuns(taskId: string): Promise<StageRunRecord[]> {
    const { rows } = await this.pool.query<StageRunRecord>(
      `SELECT id, task_id AS "taskId", node_id AS "nodeId", attempt,
              ${ms('queued_at')} AS "queuedAt", ${ms('started_at')} AS "startedAt",
              ${ms('finished_at')} AS "finishedAt", outcome, error
       FROM stage_runs WHERE task_id = $1 ORDER BY finished_at, id`,
      [taskId],
    );
    return rows;
  }

  async reachable(nodeId: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ id: string }>(
      `WITH RECURSIVE reach(id) AS (
         SELECT target FROM edges WHERE source = $1 AND kind IN ('flow','review')
         UNION
         SELECT e.target FROM edges e JOIN reach r ON e.source = r.id WHERE e.kind IN ('flow','review')
       )
       SELECT id FROM reach ORDER BY id`,
      [nodeId],
    );
    return rows.map((r) => r.id);
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Migraciones versionadas y aplicadas en transacción. Embebidas en TS para que el binario
 * compilado no dependa de copiar ficheros .sql.
 *
 * Modelo: grafo relacional (layers, nodes, edges con FKs) + ejecución (tasks, task_steps, stage_runs).
 */
export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    id: 1,
    name: 'init',
    sql: `
CREATE TABLE layers (
  id          SMALLINT PRIMARY KEY CHECK (id BETWEEN 1 AND 5),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL
);

CREATE TABLE nodes (
  id               TEXT PRIMARY KEY,
  layer_id         SMALLINT NOT NULL REFERENCES layers(id),
  label            TEXT NOT NULL,
  engine           TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('user_ui','agent_logic','policy','tool_action','context_trace','cloud_service','external_system')),
  role             TEXT NOT NULL CHECK (role IN ('processor','gateway','human','resource')),
  maturity         TEXT NOT NULL CHECK (maturity IN ('HECHO','EN PRUEBA')),
  description      TEXT NOT NULL,
  col              SMALLINT NOT NULL,
  capacity         INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 64),
  base_duration_ms INTEGER NOT NULL CHECK (base_duration_ms >= 0),
  failure_rate     REAL NOT NULL CHECK (failure_rate BETWEEN 0 AND 1)
);

CREATE TABLE edges (
  id      TEXT PRIMARY KEY,
  source  TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target  TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  kind    TEXT NOT NULL CHECK (kind IN ('flow','context','rework','review')),
  label   TEXT,
  CHECK (source <> target),
  UNIQUE (source, target, kind)
);
CREATE INDEX edges_source_idx ON edges(source);

CREATE TABLE tasks (
  id            UUID PRIMARY KEY,
  title         TEXT NOT NULL,
  lane          TEXT NOT NULL CHECK (lane IN ('standard','express','urgent')),
  kind          TEXT NOT NULL CHECK (kind IN ('visual','no_visual','research')),
  priority      TEXT NOT NULL CHECK (priority IN ('P0','P1','P2','P3')),
  status        TEXT NOT NULL CHECK (status IN ('pending','running','completed','error')),
  rework_count  SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  last_error    TEXT,
  CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_updated_idx ON tasks(updated_at DESC);

CREATE TABLE task_steps (
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  node_id      TEXT NOT NULL REFERENCES nodes(id),
  ord          SMALLINT NOT NULL,
  deps         TEXT[] NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('blocked','queued','running','awaiting_approval','done','failed')),
  attempts     SMALLINT NOT NULL DEFAULT 0,
  queued_at    TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  error        TEXT,
  PRIMARY KEY (task_id, node_id)
);
CREATE INDEX task_steps_node_status_idx ON task_steps(node_id, status);

CREATE TABLE stage_runs (
  id           UUID PRIMARY KEY,
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  node_id      TEXT NOT NULL REFERENCES nodes(id),
  attempt      SMALLINT NOT NULL,
  queued_at    TIMESTAMPTZ NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL,
  finished_at  TIMESTAMPTZ NOT NULL,
  outcome      TEXT NOT NULL CHECK (outcome IN ('success','failure','approved','rejected')),
  error        TEXT,
  CHECK (finished_at >= started_at AND started_at >= queued_at)
);
CREATE INDEX stage_runs_task_idx ON stage_runs(task_id);
CREATE INDEX stage_runs_node_finished_idx ON stage_runs(node_id, finished_at DESC);
`,
  },
];

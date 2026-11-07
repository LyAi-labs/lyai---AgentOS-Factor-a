# dashboard

Frontend React: lienzo de nodos (React Flow) + panel de telemetría en tiempo real.

### Requirement: UI-001 Estado del cliente por reducer puro
The client state SHALL be derived by a pure reducer: `snapshot` replaces state, `tasks` upserts by id (bounded list), `metrics` appends to a bounded history, `activity` appends to a bounded log.

#### Scenario: delta de tareas
- **WHEN** a `tasks` message arrives with a known and a new task
- **THEN** the known one is replaced and the new one added, without exceeding the cap

### Requirement: UI-002 Lienzo de nodos
The canvas SHALL render every topology node positioned by layer and column, with the legend category color plus a category text badge (color is never the only channel), its live health (idle, running, blocked, error) shown with icon and label, counters (running/capacity, queue, approvals), and 5 layer bands. Flow edges into a running node SHALL be animated.

#### Scenario: construcción del grafo
- **WHEN** graph nodes are built from the topology and metrics
- **THEN** there are 25 node elements + 5 layer bands and each node carries its health

### Requirement: UI-003 Conexión resiliente
The WebSocket client SHALL reconnect with capped exponential backoff (with jitter), and the snapshot received on every (re)connection SHALL fully replace stale client state.

#### Scenario: backoff
- **WHEN** consecutive reconnection attempts are computed
- **THEN** delays grow exponentially and never exceed the cap

### Requirement: UI-004 Formato de métricas
Durations, percentages and rates SHALL be formatted consistently, rendering `—` for missing values.

#### Scenario: nulos
- **WHEN** a null duration is formatted
- **THEN** the output is `—`

### Requirement: UI-005 Vistas guiadas
The canvas SHALL offer guided views (one per lane/kind route) that highlight the nodes and flow edges of that workflow and dim everything else, plus a "todo" view that shows the full system.

#### Scenario: carril exprés
- **WHEN** the express guided view is selected
- **THEN** `carril_expres`, `builder` and `approver` are highlighted, `spec_writer` is dimmed, and only edges between highlighted nodes stay highlighted

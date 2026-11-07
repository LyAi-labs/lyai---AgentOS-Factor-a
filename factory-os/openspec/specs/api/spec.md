# api

API REST + WebSocket del servidor (Fastify + ws).

### Requirement: API-001 Validación de entrada
Every endpoint SHALL validate its input with the shared zod schemas and answer `400` with `{ error: { code: 'VALIDATION', … } }` on invalid input.

#### Scenario: título demasiado corto
- **WHEN** `POST /api/tasks` receives `{ "title": "x" }`
- **THEN** the response is 400 with code VALIDATION

### Requirement: API-002 Errores de dominio
Unknown resources SHALL answer `404 NOT_FOUND`; operations not allowed in the current state SHALL answer `409 CONFLICT`.

#### Scenario: reintentar tarea en curso
- **WHEN** `POST /api/tasks/:id/retry` targets a running task
- **THEN** the response is 409

### Requirement: API-003 Ciclo de vida de tareas por REST
The API SHALL create tasks (`201` + Location), read them with their stage runs, list them with filters, approve/reject human steps and retry failed tasks.

#### Scenario: aprobación humana por API
- **WHEN** a task waits at Tu OK and `POST /api/tasks/:id/approval` approves it
- **THEN** the step becomes `done`

### Requirement: API-004 Tiempo real por WebSocket
On connection `/ws` SHALL send a full `snapshot`, then coalesced `tasks`, `metrics`, `activity`, `engine` and `node_config` messages; `ping` SHALL be answered with `pong` and `resync` with a new snapshot. Invalid client messages SHALL be ignored.

#### Scenario: delta tras crear tarea
- **WHEN** a client is connected and a task is created
- **THEN** the client receives a `tasks` message containing it

### Requirement: API-005 Salud y persistencia resiliente
`GET /api/health` SHALL report storage kind, database reachability and persistence status (200 ok / 503 degraded). Persistence SHALL be write-behind in batches, coalescing per task, and SHALL re-queue a failed batch without losing newer states. A record that violates an integrity constraint (SQLSTATE class 23) SHALL be isolated and dropped (counted in `dropped`) without blocking the rest of the batch.

#### Scenario: fallo transitorio de la BD
- **WHEN** a batch write fails once
- **THEN** the next flush persists the latest state of every task

### Requirement: API-006 Configuración de nodos y motor
`PATCH /api/nodes/:id/config` SHALL update capacity, duration or failure rate (persisted), and `PATCH /api/engine` SHALL update running, speed, arrival rate and autoApprove.

#### Scenario: pausar
- **WHEN** `PATCH /api/engine { running: false }`
- **THEN** simulated time stops advancing

### Requirement: API-007 Control de la línea por API
`POST /api/line/stop { reason }` SHALL stop the line and `POST /api/line/resume { note }` SHALL resume it (409 if not stopped); the engine state broadcast SHALL include `lineStopped`, `lineStopReason` and `lineStoppedAt`.

#### Scenario: parada manual (andon)
- **WHEN** the operator posts a stop with a reason
- **THEN** `GET /api/engine` reports `lineStopped: true` with that reason

### Requirement: API-008 Auditoría encadenada
Human decisions (approve, reject, retry), line stops/resumes, node configuration changes and `autoApprove` changes SHALL be appended to an audit log where each entry's hash is SHA-256 of the previous hash plus its canonical content, recording the actor (`Ignacio`, `autoApprove` or `motor`). `GET /api/audit` SHALL list it and `GET /api/audit/verify` SHALL recompute the chain and report the first broken sequence if any entry was altered.

#### Scenario: manipulación detectada
- **WHEN** a stored entry's detail is altered
- **THEN** verify returns `ok: false` with `brokenAt` equal to that entry's sequence

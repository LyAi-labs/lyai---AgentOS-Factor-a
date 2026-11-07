# engine

Motor de simulación por eventos discretos. El tiempo se inyecta con `tick(ms)`; la aleatoriedad lleva semilla.

### Requirement: ENG-001 Join espera a todas las dependencias
A step SHALL NOT be queued until all its dependencies are `done`.

#### Scenario: Approver espera los 4 votos
- **WHEN** three of the four reviews have finished
- **THEN** Approver is still `blocked`

### Requirement: ENG-002 Capacidad por nodo
The number of steps running in a node SHALL never exceed the node's configured capacity, and raising capacity SHALL dispatch queued work immediately.

#### Scenario: cola en Builder
- **WHEN** five tasks reach Builder with capacity 1
- **THEN** one runs and four are queued

### Requirement: ENG-003 Prioridad de cola
Queued steps SHALL be dispatched by priority (P0 first), then lane (urgent, express, standard), then queue time.

#### Scenario: P0 adelanta
- **WHEN** a P3 task and later a P0 task wait for the same node
- **THEN** the P0 task starts first

### Requirement: ENG-004 Retrabajo acotado
A rejection at Approver SHALL reset Builder and all its descendants and re-queue Builder; after more than 2 rejections the task SHALL go to `error`.

#### Scenario: tres rechazos
- **WHEN** Approver rejects a task three times
- **THEN** Builder ran three times and the task is in `error` with rework exhausted

### Requirement: ENG-005 Pasos humanos
Human steps SHALL wait in `awaiting_approval` until approved or rejected, unless `autoApprove` is enabled; enabling `autoApprove` SHALL release every pending approval.

#### Scenario: Tu OK
- **WHEN** a task reaches Tu OK with autoApprove off
- **THEN** it does not progress until `approve()` is called

### Requirement: ENG-006 Rechazo y reintento
A human rejection or exhausted attempts SHALL move the task to `error`, release its queued steps, and `retry()` SHALL resume from the failed step.

#### Scenario: reintento tras fallo de Verificador
- **WHEN** Verificador fails 3 times and the task is retried
- **THEN** the task returns to progress and can complete

### Requirement: ENG-007 Determinismo
Two engines with the same seed, settings and inputs SHALL produce identical metrics.

#### Scenario: misma semilla
- **WHEN** two engines with seed 42 run 30 simulated minutes
- **THEN** their metrics snapshots are equal

### Requirement: ENG-008 Recuperación tras caída
Restoring open tasks SHALL re-queue steps that were `running`, keep `awaiting_approval` steps, continue the simulated clock from the latest persisted timestamp (never behind it), and allow the tasks to complete.

#### Scenario: restart
- **WHEN** a snapshot with a running Builder step is restored in a new engine
- **THEN** Builder is re-dispatched as attempt 2 and the task completes after ticking

### Requirement: ENG-009 Detección de cuellos de botella
Metrics SHALL rank nodes by queue pressure, saturation, pending human approvals and recent failures, with a human-readable reason.

#### Scenario: aprobaciones pendientes
- **WHEN** several tasks wait at Tu OK
- **THEN** `tu_ok` appears in bottlenecks with reason mentioning approval

### Requirement: ENG-010 Memoria acotada
The engine SHALL keep at most `retainTerminal` finished tasks in memory, emitting their final state before evicting them.

#### Scenario: evicción
- **WHEN** 5 tasks complete with retainTerminal = 2
- **THEN** only 2 are listed and all 5 final states were emitted

### Requirement: ENG-011 Telemetría
Metrics SHALL report WIP, completed, errored, throughput per simulated minute, success rates, cycle time (avg, p50, p95) and per-node/per-layer queue, utilization, durations and waits.

#### Scenario: tras completar
- **WHEN** tasks complete
- **THEN** cycle time percentiles are non-null and p50 ≤ p95

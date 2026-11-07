# state-machine

Máquinas de estados puras de tarea y de paso. Toda mutación del motor pasa por ellas.

### Requirement: SM-001 Estados y transiciones de tarea
A task SHALL be in one of `pending`, `running`, `completed`, `error`, with only these transitions: pending→running (START), pending|running→error (FAIL), running→completed (COMPLETE), error→pending (RETRY).

#### Scenario: tabla completa
- **WHEN** every (state, event) pair is applied
- **THEN** exactly the listed pairs succeed and every other pair is rejected

### Requirement: SM-002 Completado es terminal
A completed task SHALL accept no event.

#### Scenario: reintento sobre completada
- **WHEN** RETRY is applied to a completed task
- **THEN** the transition is rejected

### Requirement: SM-003 Reintentos de paso acotados
A running step that fails SHALL return to `queued` while `attempts < maxAttempts` and become `failed` when `attempts >= maxAttempts`. START increments attempts.

#### Scenario: tres intentos
- **WHEN** a step is started and failed three times with maxAttempts = 3
- **THEN** it is queued after the 1st and 2nd failure and failed after the 3rd

### Requirement: SM-004 Transiciones inválidas sin efectos
An invalid transition SHALL return an error result and leave the input object unmodified.

#### Scenario: inmutabilidad
- **WHEN** SUCCEED is applied to a `blocked` step
- **THEN** the result is an error and the original step is deep-equal to before

# persistence

PostgreSQL como almacenamiento de producción (memoria en modo demo y tests unitarios). Los tests de esta capacidad
requieren `TEST_DATABASE_URL`; en CI corren contra un servicio `postgres:16`.

### Requirement: PER-001 Migraciones idempotentes y semilla conservadora
Migrations SHALL be versioned, applied in a transaction under an advisory lock, and idempotent. Seeding the topology SHALL update descriptive node fields but preserve operator-tuned config (capacity, duration, failure rate).

#### Scenario: doble arranque
- **WHEN** migrate + seed run twice after a capacity change
- **THEN** no error occurs and the changed capacity is preserved

### Requirement: PER-002 Persistencia atómica de lotes
A batch of task snapshots and stage runs SHALL be persisted in one transaction and read back identically (epoch-ms timestamps, ordered steps).

#### Scenario: ida y vuelta
- **WHEN** a task with steps and stage runs is persisted and read
- **THEN** the read task equals the written one

### Requirement: PER-003 Alcanzabilidad por CTE recursivo
Reachability in PostgreSQL SHALL use a recursive CTE over `edges` and match the in-memory computation for every node.

#### Scenario: todos los nodos
- **WHEN** reachability is computed for every node in SQL and in memory
- **THEN** both results are equal

# graph-topology

Topología de la factoría, transcrita del diagrama de referencia de LyAi.

### Requirement: TOP-001 Capas y nodos del diagrama
The system SHALL define exactly 5 layers (01 Memoria · Seguridad … 05 Entornos · Benchmark Lab · Producción) and the 25 nodes of the reference diagram, each assigned to one layer, with unique ids.

#### Scenario: inventario completo
- **WHEN** the topology module is loaded
- **THEN** there are 5 layers and 25 nodes with unique ids, and every node's layer exists

### Requirement: TOP-002 Categorías normalizadas de la leyenda
Each node SHALL belong to one of the 7 legend categories (User UI, Agent logic, Policy, Tool action, Context/trace, Cloud service, External system) and to one engine role (processor, gateway, human, resource).

#### Scenario: nodos humanos
- **WHEN** the roles are inspected
- **THEN** exactly `tu_ok`, `carril_urgencia` and `produccion` are `human`, and `brain`, `bd_pruebas` are `resource`

### Requirement: TOP-003 Aristas derivadas de los flujos
Flow edges SHALL be derived from the workflows, so that every dependency used by any workflow exists as an edge and no flow edge exists without a workflow using it. Context edges SHALL come from each node's `uses`, plus one `rework` edge Approver → Builder.

#### Scenario: coherencia diagrama-motor
- **WHEN** all workflows (3 lanes × 3 kinds) are built
- **THEN** the set of (dep → step) pairs equals the set of flow/review edges

### Requirement: TOP-004 Alcanzabilidad
The system SHALL compute the set of nodes reachable from a node following flow and review edges.

#### Scenario: desde Analyze
- **WHEN** reachability is computed from `analyze`
- **THEN** it includes `builder` and `produccion` and excludes `entradas` and `brain`

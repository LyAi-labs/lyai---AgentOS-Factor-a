# workflow

Cada tarea instancia un DAG de pasos según su carril (`standard`, `express`, `urgent`) y su tipo (`visual`, `no_visual`, `research`).

### Requirement: WF-001 Flujos acíclicos y cerrados
Every workflow SHALL be a DAG whose steps reference existing nodes, with no duplicated step and no dependency on a missing step.

#### Scenario: los 9 flujos
- **WHEN** every lane × kind workflow is built
- **THEN** a topological order exists and covers all steps

### Requirement: WF-002 Carril estándar con quórum 4/4
The standard lane SHALL fork after Builder into Verificador, Seguridad, Código and UI (UI → UX for visual tasks) and join at Approver, which depends on exactly those four votes.

#### Scenario: no visual
- **WHEN** a standard `no_visual` workflow is built
- **THEN** Approver depends on `verificador`, `seguridad`, `codigo`, `ui`

### Requirement: WF-003 Carril exprés
The express lane SHALL skip specification (no Spec writer, no Coherencia) and use a reduced 2/2 quorum (Verificador + Seguridad).

#### Scenario: parche
- **WHEN** an express workflow is built
- **THEN** it contains `carril_expres` and Approver depends only on `verificador` and `seguridad`

### Requirement: WF-004 Carril de urgencia
The urgent lane SHALL go Entradas → Carril urgencia (human) → main local → Producción, followed by a post-hoc Seguridad review.

#### Scenario: bypass
- **WHEN** an urgent workflow is built
- **THEN** it has no Builder and `seguridad` depends on `produccion`

### Requirement: WF-005 Ramas por tipo de tarea
Visual tasks SHALL pass through Mockup, UX and Evidencia visual; research tasks SHALL pass through Explorador; no_visual tasks SHALL go from Analyze directly to Spec writer.

#### Scenario: visual
- **WHEN** a standard visual workflow is built
- **THEN** it contains `mockup`, `ux`, `evidencia` and Tu OK depends on `evidencia`

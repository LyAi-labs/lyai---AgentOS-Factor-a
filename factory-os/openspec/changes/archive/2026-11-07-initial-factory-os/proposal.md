# Change: initial-factory-os (archivado 2026-11-07)

## Why
La Factoría IA de LyAi tenía su diagrama de referencia (5 capas, 25 nodos) y un prototipo visual sin motor verificable.
Faltaba un sistema que ejecute de verdad el flujo (fork/join, quórum, retrabajo, aprobación humana), lo persista y lo
muestre en vivo con telemetría.

## What Changes
- ADDED capacidad `graph-topology` (TOP-001…004)
- ADDED capacidad `workflow` (WF-001…005)
- ADDED capacidad `state-machine` (SM-001…004)
- ADDED capacidad `engine` (ENG-001…011)
- ADDED capacidad `api` (API-001…006)
- ADDED capacidad `persistence` (PER-001…003)
- ADDED capacidad `dashboard` (UI-001…005)

## Impact
- Código nuevo en `factory-os/` (monorepo npm workspaces). No toca el prototipo existente de la raíz del repositorio.
- Los deltas se fusionaron íntegros en `openspec/specs/`.

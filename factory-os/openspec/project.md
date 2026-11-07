# Project: factory-os

Sistema operativo de la Factoría IA de LyAi: modela el pipeline de desarrollo agéntico como un grafo de 5 capas,
ejecuta cada tarea como un DAG de pasos (fork/join, quórum, retrabajo, aprobación humana) y lo muestra en vivo
en un lienzo de nodos con panel de telemetría.

## Fuente de verdad

`openspec/specs/**/spec.md` describe el **estado actual** del sistema. Cada requisito tiene un ID estable
(`### Requirement: ENG-004 …`). Los tests citan el ID entre corchetes en su nombre (`it('[ENG-004] …')`) y
`npm run spec:check` falla si:

- un requisito no tiene ningún test que lo cite, o
- un test cita un ID que no existe en los specs.

Un cambio de comportamiento se propone en `openspec/changes/<fecha>-<nombre>/` (proposal.md, tasks.md y deltas
`ADDED / MODIFIED / REMOVED`). Al cerrarse, el delta se fusiona en `openspec/specs/` y la carpeta del cambio pasa a
`openspec/changes/archive/`.

## Convenciones

- TypeScript estricto en todo el monorepo (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
- Tipos y esquemas del contrato viven solo en `packages/shared`.
- El motor no hace E/S ni lee el reloj: el tiempo se le inyecta (`tick(ms)`) y la aleatoriedad lleva semilla.
- Ningún nodo llama a modelos: la ejecución de pasos es un `StageExecutor` simulado, intercambiable por uno real.

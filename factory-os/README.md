# factory-os · Sistema operativo de la Factoría IA de LyAi

Aplicación full-stack que modela, ejecuta y visualiza en tiempo real el pipeline de desarrollo agéntico de LyAi:
5 capas y 25 nodos transcritos del diagrama de referencia, un motor que ejecuta cada tarea como un **DAG con
fork/join, quórum 4/4, retrabajo acotado y aprobación humana**, persistencia en PostgreSQL, API REST + WebSocket y
un lienzo de nodos (React Flow) con panel de telemetría.

> **Qué es real y qué es simulado.** El motor de estados, la planificación por capacidad y prioridad, el quórum, el
> retrabajo, la aprobación humana, la persistencia, la recuperación tras caída y la telemetría son reales. Lo que hace
> *dentro* de cada nodo (llamar a un modelo, compilar, desplegar) lo decide un `StageExecutor`. El incluido es un
> **simulador estocástico** (duración y tasa de fallo por nodo), y ningún nodo llama a modelos. Un ejecutor real
> implementa la misma interfaz (`apps/server/src/engine/executor.ts`) sin tocar el motor.

## 1. Estructura y decisiones

```
factory-os/
├── openspec/                     Fuente de verdad (OpenSpec): specs vivos + cambios
│   ├── project.md
│   ├── specs/<capacidad>/spec.md   38 requisitos con ID (TOP, WF, SM, ENG, API, PER, UI)
│   └── changes/                    propuestas pendientes y cambios archivados
├── packages/shared/              Contrato único backend↔frontend
│   └── src/ domain.ts · topology.ts · workflow.ts · protocol.ts (zod)
├── apps/server/                  Fastify + ws + pg
│   └── src/
│       ├── domain/   stateMachine.ts (puro) · errors.ts
│       ├── engine/   engine.ts (eventos discretos) · executor.ts · random.ts · stats.ts
│       ├── persistence/ repository.ts (puerto) · postgresRepository.ts · memoryRepository.ts
│       │                migrations.ts · writeBehind.ts
│       ├── api/      wsHub.ts
│       ├── app.ts    rutas REST + upgrade WS · runtime.ts (composición) · main.ts · config.ts
│       └── test/     state machine, motor, API+WS, write-behind, PostgreSQL
├── apps/web/                     React 19 + Vite + @xyflow/react
│   └── src/ state/store.ts (reducer puro) · lib/{graph,socket,api,format}.ts · components/*
├── scripts/  check-spec-coverage.mjs · smoke.mjs (Playwright E2E)
├── docker/   nginx.conf
└── docker-compose.yml            db (postgres:16) + server + web (nginx)
```

| Decisión | Motivo |
|---|---|
| **Node + TypeScript en todo el stack** (no FastAPI) | Un solo paquete `shared` con tipos y esquemas zod para servidor y cliente: si cambia un literal de estado, el compilador marca ambos lados. |
| **Motor de eventos discretos, síncrono y sin E/S** | `tick(ms)` avanza el reloj de forma exacta y la aleatoriedad lleva semilla, así que los tests son deterministas (ENG-007) y no hay `sleep`. La E/S vive fuera (runtime, write-behind). |
| **Máquinas de estados puras** (`transitionTask`, `transitionStep`) | Tabla de transiciones explícita. El motor solo muta estado a través de ellas, y una transición inválida es un `InvariantError` que destapa bugs (cazó uno real durante el desarrollo: completar dos veces por auto-aprobación reentrante). |
| **Aristas derivadas de los flujos** | El diagrama y el motor no pueden divergir: las aristas de flujo se calculan de `buildWorkflow` (TOP-003). |
| **PostgreSQL relacional + grafo** (`nodes`, `edges` con FK, `WITH RECURSIVE`) | El grafo cabe en tablas relacionales. Alcanzabilidad por CTE recursivo, verificada contra el cálculo en memoria (PER-003). |
| **Write-behind en lotes de 250 ms** | El motor no espera a la BD. Coalescencia por tarea, lote atómico y reencolado sin pisar estados más nuevos si falla (API-005). |
| **WebSocket con instantánea + deltas coalescidos** | Al conectar llega el estado completo, y luego tareas cada 200 ms y métricas cada 1 s. Contrapresión por cliente y latido. |
| **Fastify + `ws` en modo `noServer`** | Control total del upgrade y sin plugins de terceros para lo esencial. |
| **Vite (SPA) en vez de Next.js** | Sin SSR que aporte nada a un panel en tiempo real; nginx sirve estáticos y hace de proxy de `/api` y `/ws` en el mismo origen (sin CORS). |

## 2. Modelo de datos

**Dominio** (`packages/shared/src/domain.ts`):

- `TaskStatus = pending | running | completed | error`. Es la máquina de estados exigida (SM-001…004).
- `StepStatus = blocked | queued | running | awaiting_approval | done | failed`, una por visita de la tarea a un nodo.
- `NodeHealth = idle | running | blocked | error`, derivada de la telemetría y usada para colorear el lienzo.
- Categorías de la leyenda (color): `user_ui · agent_logic · policy · tool_action · context_trace · cloud_service · external_system`.
- Rol en el motor: `processor · gateway · human · resource`.

**Flujos** (`workflow.ts`):

| Carril / tipo | Recorrido |
|---|---|
| estándar · no visual | Entradas → Filtro → Analyze → Spec writer → Coherencia → Builder → {Verificador, Seguridad, Código, UI} → **Approver 4/4** → Router → Tu OK → main local → Producción (+ Evaluación → Benchmark Lab) |
| estándar · visual | … Analyze → Mockup → Spec writer … UI → UX … Router → Evidencia visual → Tu OK … |
| estándar · investigación | … Analyze → Explorador → Spec writer … |
| exprés | … Analyze → Carril exprés → Builder → {Verificador, Seguridad} → **Approver 2/2** → Router → Tu OK → main local → Producción |
| urgencia | Entradas → Carril urgencia (humano) → main local → Producción → Seguridad (rev. <24 h) |

**Gobierno alineado con la constitución de lyai-factory:**

- **Veredictos (contrato `docs/contratos/veredicto.md`).** Verificador, Seguridad, Código, UI y UX devuelven `aprobado`, `rechazado` (con al menos un hallazgo que bloquea) o `blocked` (no se pudo revisar). El estilo nunca bloquea (O2). A un revisor no se le reintenta: si no responde, cuenta como `blocked` (O9).
- **Quórum.** Approver pasa solo con 4 de 4 `aprobado` (2 de 2 en el carril exprés). Si no, la tarea vuelve a Builder, con un máximo de 2 retrabajos; a la tercera, `error` y aviso a Ignacio (O2).
- **Parar la línea (O1).** Un `blocked`, una revisión a posteriori negativa o el botón *Parar línea* detienen todo arranque de pasos y toda aprobación automática, hasta que una persona la reanuda con una nota.
- **Auditoría encadenada.** Aprobaciones, rechazos, reintentos, paradas y reanudaciones, cambios de configuración y de `autoApprove` se guardan en `audit_log` (solo inserción; un trigger impide UPDATE y DELETE). Cada entrada lleva `hash = SHA-256(prevHash + contenido)`. No se firma en nombre de nadie: la firma real es la de Ignacio con sus claves SSH en git.
- **Reintentos.** Un procesador que falla (Builder, Spec writer…) se reintenta hasta 3 veces. Tu OK, Carril urgencia y Producción esperan aprobación explícita (salvo `autoApprove`).

**PostgreSQL** (`apps/server/src/persistence/migrations.ts`): `layers`, `nodes` (con la config operativa:
capacidad, duración, tasa de fallo), `edges` (FK + `CHECK source <> target` + `UNIQUE(source,target,kind)`), `tasks`,
`task_steps` (PK `(task_id, node_id)`), `stage_runs` (registro inmutable de cada intento, base de la telemetría
histórica) y `schema_migrations`. Las migraciones se aplican en transacción bajo `pg_advisory_xact_lock`.

## 3. API

Todas las entradas se validan con zod. Los errores tienen siempre la forma `{ "error": { "code", "message", "details?" } }`
(400 `VALIDATION`, 404 `NOT_FOUND`, 409 `CONFLICT`, 500 `INTERNAL`).

| Método y ruta | Descripción |
|---|---|
| `GET /api/health` | Almacenamiento, BD y estado de persistencia (200 ok / 503 degradado). |
| `GET /api/graph` | Capas, nodos, aristas y configuración operativa. |
| `GET /api/graph/nodes/:id/reachable` | Nodos alcanzables (CTE recursivo). |
| `GET /api/nodes/:id` · `PATCH /api/nodes/:id/config` | Detalle y métricas / cambiar `capacity`, `baseDurationMs`, `failureRate` (persistido). |
| `GET /api/tasks?status&lane&limit` | Listado desde la BD. |
| `POST /api/tasks` | `{ title, lane?, kind?, priority? }` → `201` + `Location`. |
| `GET /api/tasks/:id` | Tarea con pasos y `stageRuns`. |
| `POST /api/tasks/:id/approval` | `{ nodeId, decision: approve\|reject, note? }` sobre un paso humano. |
| `POST /api/tasks/:id/retry` | Reanuda una tarea en `error` desde el paso fallido. |
| `GET /api/metrics` | WIP, throughput, éxito, ciclo p50/p95, métricas por nodo y capa, cuellos de botella. |
| `GET/PATCH /api/engine` | `running`, `speed`, `arrivalRatePerMin`, `autoApprove`. |
| `GET /api/activity` | Últimos 200 eventos. |
| `POST /api/line/stop` · `POST /api/line/resume` | `{ reason }` / `{ note }`: parar y reanudar la línea (409 si no está parada). |
| `GET /api/audit?limit` · `GET /api/audit/verify` | Registro de auditoría y verificación de la cadena (`ok`, `brokenAt`, `reason`). |

**WebSocket `/ws`.** Mensajes del servidor: `snapshot` (al conectar y tras `resync`), `tasks`, `metrics`, `engine`,
`activity`, `node_config`, `pong`. Mensajes del cliente: `{type:"ping"}` y `{type:"resync"}`; lo inválido se ignora.

Ejemplo:

```bash
curl -s -X POST localhost:8088/api/tasks -H 'content-type: application/json' \
  -d '{"title":"Aviso de cierre de pista","lane":"express","kind":"visual","priority":"P0"}'
```

## 4. Ejecución

Requisitos: Node ≥ 22.13 y npm 10. Docker con Compose v2 para el stack completo.

**Stack completo (PostgreSQL + API + web):**

```bash
cd factory-os
```

```bash
docker compose up -d --build
```

Abre http://localhost:8088. Variables en `.env.example` (`WEB_PORT`, `SIM_SPEED`, `SIM_ARRIVAL_RATE`, `SIM_AUTO_APPROVE`…).
Tras un proxy con inspección TLS, pasa su CA al build (solo existe durante `npm ci`; no queda en la imagen):

```bash
BUILD_CA_FILE=./docker/local-ca.crt docker compose up -d --build
```

**Desarrollo local (memoria, sin Docker):**

```bash
npm install
```

```bash
npm run build -w @factory-os/shared && npm run dev:server
```

```bash
npm run dev:web
```

Abre http://localhost:5173 (Vite hace de proxy de `/api` y `/ws` a `:8080`). Con `DATABASE_URL=postgres://…`, el servidor
usa PostgreSQL.

## 5. Verificación de calidad

| Comando | Qué comprueba |
|---|---|
| `npm run typecheck` | TS estricto (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`) en los 3 paquetes. |
| `npm run lint` | ESLint `strictTypeChecked` + reglas de hooks de React. |
| `npm run spec:check` | Cada requisito de `openspec/specs` tiene al menos un test que lo cita (`[ENG-004]`) y no hay citas huérfanas. |
| `npm test` | Vitest: shared (topología, flujos), server (máquinas de estados, motor, API + WS real, write-behind) y web (reducer, grafo, reconexión, formato). |
| `TEST_DATABASE_URL=postgres://… npm test -w @factory-os/server` | Además, integración contra PostgreSQL real (migraciones, ida y vuelta, CTE). Sin la variable, esa suite sale como *skipped*, nunca como superada. |
| `npm run build` | Build de producción de los 3 paquetes. |
| `npm run verify` | Todo lo anterior en cadena. |
| `BASE_URL=http://localhost:8088 npm run smoke` | E2E con Playwright contra un despliegue en marcha: salud, WS, 25 nodos, alta de tarea y aprobación desde la UI, vista guiada, inspector, móvil sin overflow, cero errores de consola. Capturas en `artifacts/`. |

CI: `.github/workflows/factory-os.yml` ejecuta `verify` con un servicio `postgres:16`, el smoke E2E y el build de las
imágenes Docker.

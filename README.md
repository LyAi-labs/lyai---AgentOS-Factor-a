# Factoría Agéntica — Backend Git Real (Puntos 2, 3 y 7)

## Transparencia (Regla 1 y 2)

Este proyecto separa estrictamente lo que funciona de verdad en el servidor Linux (Node 20+ y `git` 2.34+) de lo que está marcado como **SIMULADO**. El panel web (`src/App.tsx`) muestra únicamente los datos devueltos por el backend real (`server.ts` + `src/backend/gitFactory.ts`), sin métricas inventadas (sin `p99`, sin `CPU/RAM`, sin `AST`, sin `throughput` ficticio).

### Estado de los 11 puntos del encargo

| Punto | Componente | Estado | Detalle de qué es REAL y qué es SIMULADO |
| :--- | :--- | :--- | :--- |
| **1** | Ingesta, Filtro y Analyze | **SIMULADO** | Formulario/API REST local; no hay webhooks externos ni ejecución de `qwen local`. |
| **2** | Especificación (`Spec writer`) | **REAL (Disco) / SIMULADO (Sin LLM)** | **REAL**: Escribe `specs/<id>.md` en disco y bloquea el paso 3 si no existe spec. **SIMULADO**: El texto del spec lo genera un adaptador determinista local sin llamar a `Opus / Gemini Pro`. |
| **3** | Construcción en rama aislada (`Builder`) | **REAL (Git Linux)** | **REAL**: Ejecuta `git checkout -B task/<id> main`, escribe archivos en disco, ejecuta `git add` y `git commit` reales y extrae el SHA y `git diff main..task/<id>` verdaderos. **SIMULADO**: El código del archivo objetivo lo genera el adaptador determinista sin llamar a LLM. |
| **4** | UI + Evidencia visual (Playwright) | **SIMULADO** | Interfaz/adaptador sin ejecución automática de navegador por tarea. |
| **5** | Verificador Docker y BD de pruebas aislada | **SIMULADO** | Este contenedor no dispone de demonio Docker anidado; las pruebas automáticas corren con `node --test` (`npm test`). |
| **6** | Consenso `Approver 4/4` y firma SSH | **SIMULADO** | No se invocan 4 modelos evaluadores independientes ni firma SSH de hardware. |
| **7** | Fusión en `main local` (`cerrar`) | **REAL (Git Linux)** | **REAL**: Ejecuta `git status --porcelain`. Si existe cualquier archivo modificado o sin confirmar en el árbol de trabajo, **se niega a fusionar** devolviendo HTTP 409 con la lista exacta de archivos sucios. Solo ejecuta `git merge --no-ff` en `main` cuando el árbol está limpio. |
| **8** | `Router` y `Tu OK · Ignacio` | **SIMULADO** | El operador dispara la fusión desde el panel o vía REST API. |
| **9** | Carril exprés y Carril urgencia SSH | **SIMULADO** | Sin túnel SSH externo a servidores de producción. |
| **10** | `Brain` (wiki/reglas) y `Seguridad` | **SIMULADO** | Sin llamadas a `Gemini 2.5 Flash` ni base vectorial externa. |
| **11** | `Benchmark Lab`, `Producción` y `rev <24h` | **SIMULADO** | Sin despliegue cloud ni telemetría APM externa. |

## Pruebas automáticas (sin llamadas a ningún modelo)

```bash
npm test
```

Ejecuta `src/backend/gitFactory.test.ts` creando un repositorio Git real temporal en `/tmp` y verificando:
1. Inicialización real de `main`.
2. **Punto 2**: Creación de `specs/<id>.md` y rechazo de construcción si falta el spec.
3. **Punto 3**: Creación de la rama aislada `task/<id>`, commit real y `git diff`.
4. **Punto 7**: Rechazo de fusión en `main` cuando hay cambios sin confirmar en el árbol de trabajo (`git status --porcelain` no vacío) y fusión exitosa (`git merge --no-ff`) una vez limpio el árbol.

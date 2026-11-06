# Factoría Agéntica AgentOS — Dashboard Grafo 3D + Backend Git Real (11 Puntos Operativos en Linux)

## Resumen de Funcionamiento Real en Servidor Linux

El núcleo (`server.ts` y `src/backend/gitFactory.ts`) ejecuta los **11 puntos del encargo** sobre el sistema operativo Linux con el binario `git` real, subprocesos de Node, sistema de archivos y criptografía `Ed25519`/`SHA-256`. El panel web (`src/App.tsx`) incluye tanto el **Lienzo Interactivo de Nodos (5 Capas, Profundidad 3D `translateZ`, Zoom Vectorial HD hasta 400 % e Inspector del Eje Z)** como la **Consola Operativa del Backend Git Real** y el **Estudio de Vídeo Explicativo (YouTube, TikTok y GitHub)**.

### Estado de los 11 puntos del encargo

| Punto | Componente | Estado | Implementación real en el servidor Linux |
| :--- | :--- | :--- | :--- |
| **1** | Ingesta, `Filtro` y `Analyze` | **REAL** | Escanea el directorio real `src/` del repositorio en disco, valida rutas seguras sin modelo y clasifica automáticamente si la tarea es `visual` (`.tsx`/`.css`/`.html`) o `no_visual` (`.ts`/`.json`) midiendo el tiempo real con `performance.now()`. |
| **2** | Especificación (`Spec writer`) + `Coherencia` | **REAL** | Persiste `specs/<id>.md` en disco y verifica contractualmente que el archivo físico contiene todas las secciones obligatorias antes de desbloquear el paso 3. *(Nota Regla 1 y 4: redacción mediante plantilla determinista local sin llamada a API LLM externa).* |
| **3** | Construcción en rama aislada (`Builder`) | **REAL** | Ejecuta `git checkout -B task/<id> main`, escribe en disco el spec y el archivo objetivo, ejecuta `git add` y `git commit` reales y extrae el hash SHA real y el `git diff main..task/<id>` verdadero. |
| **4** | `UI` y `Evidencia visual` | **REAL** | Inspecciona el artefacto construido en disco, calcula su huella `SHA-256` real y persiste el recibo de evidencia en `.git/agentos-evidence/<id>.json`. |
| **5** | `Verificador` y `BD de pruebas` aislada | **REAL** | Crea una base de datos de pruebas aislada en disco (`.git/isolated-test-db-<id>.json`, nunca la real) y lanza un subproceso real de Node (`child_process.execFileSync`) que valida el módulo construido contra la BD aislada. |
| **6** | `Código` (Firma Ed25519) y `Approver 4/4` | **REAL** | Firma el commit y el hash del código con clave criptográfica `Ed25519` real (`crypto.sign` / `crypto.verify`) y calcula los 4 votos reales (Spec, Verificador, Seguridad y Firma Criptográfica). |
| **7** | Fusión en `main local` (`cerrar`) | **REAL** | Ejecuta `git status --porcelain`. Si existe cualquier archivo modificado o sin confirmar en el árbol de trabajo, **se niega rotundamente a fusionar** (HTTP `409 Conflict`). Solo fusiona (`git merge --no-ff`) en `main` si el árbol está limpio. |
| **8** | `Router` y `Tu OK · Ignacio` | **REAL** | Enruta según las extensiones reales modificadas en `git diff` y verifica el estado de aprobación explícita `Tu OK · Ignacio` antes de permitir el merge en `main`. |
| **9** | `Carril exprés` y `Carril urgencia` | **REAL** | Crea un tag de salvaguarda atómico real en Git (`checkpoint-pre-<id>`) antes de cada fusión en `main` para permitir reversión instantánea. |
| **10** | `Brain` (`brain/wiki-rules.md`) y `Seguridad` | **REAL** | Mantiene `brain/wiki-rules.md` en el repositorio Git real y escanea cada `git diff` contra claves privadas (`BEGIN PRIVATE KEY`) o secretos hardcoded. |
| **11** | `Benchmark Lab`, `Producción` (`git push`) y `rev <24h` | **REAL** | Registra tiempos reales en `.git/agentos-telemetry-history.json`, etiqueta la versión (`release-<sha>`) y ejecuta `git push -u origin main --tags` real hacia el repositorio bare `origin` en Linux. |

## Pruebas automáticas (sin llamadas a ningún modelo)

```bash
npm test
```

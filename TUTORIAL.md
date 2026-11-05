# AgentOS — Guía de Onboarding para Desarrolladores y Patrón de Tutoriales

Bienvenido a **AgentOS**, el sistema operativo y entorno de ejecución para factorías de desarrollo agéntico autónomo estructurado en grafos de 5 capas.

Este documento tiene un doble propósito:
1. **Guía de Aterrizaje Rápido**: Para que cualquier desarrollador que entre por primera vez comprenda el flujo de trabajo, la arquitectura de agentes, las herramientas de telemetría y las pruebas de resiliencia.
2. **Patrón de Referencia Oficial**: El estándar técnico que debe seguir el equipo de ingeniería para redactar futuros tutoriales interactivos modulares.

---

## 🧭 Parte 1: Onboarding Rápido del Desarrollador (Paso a Paso)

### 1.1 El Lienzo de Nodos y las 5 Capas Funcionales
El sistema opera sobre un grafo dirigido acíclico (DAG) y reactivo dividido en cinco capas:
* **Capa 01 — Memoria & Seguridad**: Nodos de control central (`Brain`), políticas de guardrails y autorización RBAC (`Seguridad`).
* **Capa 02 — Exploración, Mockup & Telemetría**: Escaneo contextual (`Explorador`), generación visual preliminar (`Mockup`), árbitro de contratos (`Coherencia`) y analítica de latencia (`Evaluación`).
* **Capa 03 — Flujo Principal, UI & Evidencia**: Ingesta (`Entradas`), sanitización (`Filtro`), análisis sintáctico/semántico (`Analyze`), redacción de contratos (`Spec writer`), síntesis de código (`Builder`), validación visual (`UI`), consenso de calidad (`Approver 4/4`) y captura de pruebas (`Evidencia visual`).
* **Capa 04 — Carriles, Validación & Algoritmia**: Enrutamiento (`Smart Router`), validación determinista (`Verificador`), bases de pruebas aisladas (`BD de pruebas`), laboratorio de benchmarks (`Benchmark Lab`) y carriles de urgencia/exprés.
* **Capa 05 — Producción**: Despliegue supervisado (`Producción`) con rollback automático y canary rollout.

> 💡 **Tip Dev**: En el lienzo interactivo, puedes hacer clic sobre cualquier nodo para abrir el **Inspector de Agentes**, inspeccionar prompts base, ajustar temperaturas y disparar fallas en caliente para evaluar la resiliencia del pipeline.

---

### 1.2 Tu Diagrama Actual vs. Propuesta AgentOS 2.0
En la barra de herramientas superior dispones de un conmutador de topología:
* **Tu Diagrama Actual**: Representa el pipeline de 25 nodos en su topología secuencial base.
* **Propuesta AgentOS 2.0**: Activa 4 optimizaciones arquitectónicas de vanguardia:
  1. **Spike Concurrente (`-42%` tiempo de ciclo)**: `Mockup` y `Spec writer` se ejecutan en paralelo tras la fase de `Analyze`.
  2. **UI Self-Healing**: Enlace de retroalimentación directa con minimizador de AST ante regresiones visuales en DOM, sin reiniciar todo el pipeline.
  3. **Active Context Memory Bus (`-35%` tokens)**: Bus bidireccional continuo que cachea prefijos de sistema entre `Brain 2.0` y `Benchmark Lab`.
  4. **Failsafe SSH Checkpoint**: Bypass de urgencia para hotfixes con guardrail atómico de reversión en $<200\text{ms}$.

---

### 1.3 Los 3 Carriles de Ejecución
Cada tarea ingresada viaja por uno de los tres carriles con topologías y modelos distintos:
* **Carril Estándar (Cyan)**: Pipeline exhaustivo de 14 nodos con validación visual Playwright y aprobación explícita (*"Tu OK · Ignacio"*).
* **Carril Exprés (Púrpura)**: Pipeline ligero de 6 nodos sin modelos pesados para resolución de bugs sintácticos menores.
* **Carril Urgente P0 (Rojo)**: Bypass SSH de Ignacio directo con firma criptográfica y despliegue rápido.

---

### 1.4 Sistema de Control de Versiones de Agentes (Agent VCS)
Ubicado en la pestaña **`Control Versiones (VCS)`**:
* **Snapshots de Agentes**: Capturas inmutables con hashes git-like (`#f8e7d6c`) que guardan el estado de modelos, temperaturas, modos estrictos y políticas de los 25 agentes.
* **Branching**: Permite crear ramas experimentales (`experiment/zero-token-cache`) sin afectar a producción.
* **Diff Viewer**: Inspecciona visualmente las diferencias entre snapshots y el estado activo.
* **Rollback en 1-Click**: Revierte toda la factoría a una versión previa ante degradaciones de calidad.

---

### 1.5 Simulador Sandbox y Chaos Testing
Ubicado en la pestaña **`Simulador Sandbox`**:
* Permite inyectar condiciones ambientales adversas en un entorno cerrado:
  * **Latencia de Red** ($0\text{ a }1500\text{ ms}$).
  * **Saturación de API Upstream / HTTP 429** ($0\text{ a }100\%$).
  * **Ataques de Inyección de Prompt**: Intenta evadir guardrails y robar claves API.
  * **Regresiones Visuales / Violación WCAG**: Evalúa la autocorrección en UI.
* Genera una **Puntuación de Robustez ($0\text{–}100\%$)** y registra las contramedidas automáticas disparadas por la factoría.

---

### 1.6 Gráficos D3 y Proyección Estocástica de Throughput
Ubicado en la pestaña **`Tendencia D3 (Throughput)`**:
* **Curva S de Quemado (Burn-up)**: Muestra el histórico observado y la proyección futura con banda de confianza $p10$ (optimista) a $p90$ (conservador).
* **Velocidad por Carril**: Bar chart D3 con el rendimiento instantáneo en tareas por minuto ($t/m$) y proyección horaria.
* **Simulador de Estrés de Backlog**: Desplaza el control de backlog extra para recalcular el ETA en vivo.

---

### 1.7 Exportación de Reportes JSON de Telemetría
* En la barra superior, pulsa **`Exportar JSON`** para abrir el visor del reporte completo con diagnóstico de cuellos de botella y recomendaciones de optimización.
* También disponible directamente como endpoint REST descargable:
  ```bash
  curl -O "http://localhost:3000/api/pipeline/export?download=true"
  ```

---

## 📐 Parte 2: Patrón Oficial para Crear Futuros Tutoriales

Para asegurar consistencia en la documentación interactiva, cualquier nuevo tutorial debe implementarse siguiendo este patrón estandarizado:

### 2.1 Esquema de Datos (`TutorialStep`)
Cada paso de un tutorial se define con la interfaz `TutorialStep` ubicada en `src/types/tutorial.ts`:

```typescript
export interface TutorialStep {
  id: string;                       // Identificador kebab-case único (e.g. 'step-memory-bus')
  stepNumber: number;               // Índice secuencial (1-indexed)
  title: string;                    // Título conciso del concepto (< 60 caracteres)
  badge: string;                    // Categoría técnica (e.g. 'Caché de Tokens', 'Seguridad')
  targetTab: ActiveTab;             // Pestaña a enfocar: 'canvas' | 'board' | 'artifacts' | 'vcs' | 'simulation' | 'throughput'
  description: string;              // Explicación de contexto (2-3 oraciones claras)
  keyConcepts: string[];            // 3-5 puntos clave con terminología técnica rigurosa
  proDevTip: string;                // Consejo específico para ingenieros senior
  codeSnippet?: string;             // Opcional: fragmento de código relevante
  interactiveActionLabel?: string;  // Etiqueta del botón de acción (e.g. 'Probar en Sandbox')
}
```

### 2.2 Plantilla para Nuevos Módulos de Tutorial
Crea un archivo dentro de `src/tutorial/` (por ejemplo, `concurrencyTutorial.ts`):

```typescript
import { TutorialModule } from '../types/tutorial';

export const CONCURRENCY_TUTORIAL: TutorialModule = {
  id: 'concurrency-optimization',
  title: 'Optimización de Concurrencia y Cache LLM',
  category: 'architecture',
  targetAudience: 'Backend & AI Engineers',
  estimatedMinutes: 5,
  steps: [
    {
      id: 'step-active-bus',
      stepNumber: 1,
      title: 'Active Context Cache Bus',
      badge: 'Caché de Tokens',
      targetTab: 'canvas',
      description: 'El bus continuo de memoria contextual evita el reprocesamiento redundante de prefijos de sistema en Gemini y Claude.',
      keyConcepts: [
        'Mantiene embeddings calientes en memoria Redis/LRU.',
        'Ahorra hasta un 35% del consumo total de tokens.',
        'Sincroniza el feedback de evaluación con el nodo Brain.'
      ],
      proDevTip: 'Consulta el histograma D3 para verificar el impacto en tareas de lead-time <15s.',
      interactiveActionLabel: 'Ver Nodo Brain 2.0'
    }
  ]
};
```

### 2.3 Reglas de Oro para Desarrolladores
1. **Zero-Pill UI Discipline**: El contenido debe ser limpio, con jerarquía tipográfica monospace para métricas e indicadores.
2. **Acciones Interactivas Reales**: Cada paso debe navegar automáticamente a la pestaña correspondiente mediante `onNavigateTab(step.targetTab)`.
3. **Tips de Nivel Senior**: No incluir información trivial; enfocar los tips en latencia, costos en tokens, concurrencia de WebSocket o comandos CLI.
4. **Verificación Automática**: Asegúrate de que `npm test` y `npm run lint` pasen tras añadir contenido.

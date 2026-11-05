/**
 * AgentOS - Contenido del Onboarding de Desarrolladores y Patrón Guía de Tutoriales
 * 
 * Diseñado como el estándar de referencia de la empresa para que cualquier ingeniero
 * conozca el flujo y aprenda a redactar nuevos tutoriales interactivos.
 */

import { TutorialStep, TutorialPatternTemplate } from '../types/tutorial';

export const DEV_ONBOARDING_STEPS: TutorialStep[] = [
  {
    id: 'step-nodes-canvas',
    stepNumber: 1,
    title: 'Lienzo de Nodos y las 5 Capas Funcionales',
    badge: 'Arquitectura Base',
    targetTab: 'canvas',
    description:
      'AgentOS estructura el sistema operativo de desarrollo agéntico en 5 capas funcionales estrictas, desde la memoria y seguridad hasta el despliegue final.',
    keyConcepts: [
      'Capa 01: Memoria de contexto persistente (Brain) y políticas de seguridad RBAC.',
      'Capa 02: Exploración, Mockups interactivos y coherencia de estado.',
      'Capa 03: Flujo principal (Analyze, Spec Writer, Builder, UI, Approver, Evidencia).',
      'Capa 04: Carriles de ejecución (Estándar, Exprés y Urgente P0 de Ignacio).',
      'Capa 05: Base de datos aislada, Benchmark Lab y Producción.',
    ],
    proDevTip:
      'Puedes hacer clic sobre cualquier nodo para abrir el Inspector de Agentes y ver prompts, temperatura, latencia y forzar fallas en caliente.',
    interactiveActionLabel: 'Explorar Lienzo de Nodos',
  },
  {
    id: 'step-modes-comparison',
    stepNumber: 2,
    title: 'Tu Diagrama Actual vs. Propuesta AgentOS 2.0',
    badge: 'Optimización de Grafos',
    targetTab: 'canvas',
    description:
      'En la barra superior puedes alternar entre el diagrama secuencial original y la arquitectura optimizada AgentOS 2.0 con paralelización de tareas.',
    keyConcepts: [
      '⚡ Spike Concurrente: Ejecución paralela de Mockup y Spec Writer tras Analyze (-42% tiempo de ciclo).',
      '⚡ UI Self-Healing: Loop de corrección directa mediante parche AST ante fallos en pruebas visuales.',
      '⚡ Active Memory Bus: Reutilización de embeddings de contexto que ahorra 35% de tokens upstream.',
      '⚡ Failsafe SSH Checkpoint: Bypass seguro de Ignacio con rollback atómico en <200ms.',
    ],
    proDevTip:
      'Observa el banner comparativo en la parte superior del canvas: te indicará las 4 optimizaciones activas en AgentOS 2.0.',
    interactiveActionLabel: 'Ver Banner Comparativo',
  },
  {
    id: 'step-lanes-intake',
    stepNumber: 3,
    title: 'Orquestación y Enrutamiento por Carriles',
    badge: 'Control de Flujo',
    targetTab: 'board',
    description:
      'Las solicitudes de desarrollo se clasifican automáticamente en 3 carriles de servicio con SLAs y topologías de enrutamiento independientes.',
    keyConcepts: [
      'Carril Estándar (Cyan): Flujo riguroso completo con revisión humana "Tu OK · Ignacio".',
      'Carril Exprés (Púrpura): Tareas de bajo riesgo y parches ligeros sin modelos LLM pesados.',
      'Carril Urgente P0 (Rojo): Bypass SSH directo firmado criptográficamente para hotfixes críticos.',
    ],
    proDevTip:
      'Usa el botón "+ Nueva Tarea" en el HUD para lanzar tareas en cualquiera de los 3 carriles y observar el tránsito en tiempo real.',
    interactiveActionLabel: 'Abrir Tablero de Tareas',
  },
  {
    id: 'step-artifacts-diffs',
    stepNumber: 4,
    title: 'Catálogo de Evidencias Técnicas & Unified Diffs',
    badge: 'Auditoría y Trazabilidad',
    targetTab: 'artifacts',
    description:
      'Cada agente emite artefactos inmutables durante el ciclo de vida de la tarea: especificaciones técnicas, unified diffs git, reportes de pruebas Docker y evidencias visuales.',
    keyConcepts: [
      'Especificaciones RFC generadas por Spec Writer.',
      'Unified git diffs producidos por Builder.',
      'Reportes de Docker con suites de pruebas unitarias al 100%.',
      'Capturas DOM y contraste WCAG validados con Playwright.',
    ],
    proDevTip:
      'Al hacer clic en cualquier artefacto se abre el visor con formateo de sintaxis coloreada para auditoría de código antes del merge.',
    interactiveActionLabel: 'Inspeccionar Evidencias & Diffs',
  },
  {
    id: 'step-agent-vcs',
    stepNumber: 5,
    title: 'Control de Versiones de Agentes (Agent VCS)',
    badge: 'DevOps para IA',
    targetTab: 'vcs',
    description:
      'Sistema de versionado git-like para guardar estados completos de prompts, modelos asignados y políticas de los 25 agentes de la factoría.',
    keyConcepts: [
      'Snapshots Inmutables: Guarda hashes de commit con mensaje y autor.',
      'Ramas Experimentales (Branching): Crea branches para probar modelos (e.g. experiment/zero-token-cache).',
      'Inspector de Diff: Compara cambios de modelo y modo estricto entre versiones.',
      'Rollback en 1-Click: Revierte la factoría al commit deseado al instante.',
    ],
    proDevTip:
      'Antes de modificar prompts o temperaturas en caliente, guarda un snapshot en VCS para tener un punto seguro de retorno.',
    interactiveActionLabel: 'Gestionar Versiones en Agent VCS',
  },
  {
    id: 'step-sandbox-simulation',
    stepNumber: 6,
    title: 'Simulador Sandbox y Chaos Testing',
    badge: 'Resiliencia y Seguridad',
    targetTab: 'simulation',
    description:
      'Entorno aislado para inyectar condiciones ambientales extremas y evaluar la robustez y contramedidas autónomas de los agentes.',
    keyConcepts: [
      'Inyección de Ataques de Prompt & Evasión de Guardrails (evalúa cuarentena de Seguridad).',
      'Regresiones Visuales en DOM (evalúa el módulo Self-Healing de UI).',
      'Throttling de API HTTP 429 con backoff exponencial.',
      'Puntuación de Robustez del 0 al 100% y registro de mitigaciones automáticas.',
    ],
    proDevTip:
      'Ejecuta el escenario predeterminado "Ataque de Inyección de Prompt" para ver cómo el nodo de Seguridad aísla el payload malicioso.',
    interactiveActionLabel: 'Lanzar Simulador Sandbox',
  },
  {
    id: 'step-d3-throughput',
    stepNumber: 7,
    title: 'Gráficos D3: Curva S de Quemado & Throughput',
    badge: 'Analítica Predictiva',
    targetTab: 'throughput',
    description:
      'Panel analítico impulsado por D3.js con modelado estocástico de finalización de tareas y estimación de ETA según la velocidad de cada carril.',
    keyConcepts: [
      'Curva S de Quemado: Línea histórica sólida y proyección estocástica discontinua.',
      'Banda de Confianza (p10 - p90): Escenarios optimistas y conservadores.',
      'Throughput por Carril: Comparativa de tareas por minuto y tiempo de ciclo promedio.',
      'Simulador de Estrés: Aumenta el backlog para ver recalcularse el ETA en tiempo real.',
    ],
    proDevTip:
      'Usa el control deslizante "Simular Backlog Extra" para proyectar la contención de la factoría si entran 20 tareas simultáneas.',
    interactiveActionLabel: 'Ver Gráficos D3 de Throughput',
  },
  {
    id: 'step-export-report',
    stepNumber: 8,
    title: 'Exportación de Reportes JSON y Arquitectura C.R.A.F.T.',
    badge: 'Auditoría Enterprise',
    targetTab: 'canvas',
    description:
      'Descarga en un clic el reporte técnico consolidado en formato JSON con la telemetría completa, el estado de los 25 nodos y el diagnóstico de cuellos de botella.',
    keyConcepts: [
      'Botón "Exportar JSON" en el HUD superior con descarga y copiado al portapapeles.',
      'Endpoint REST disponible en /api/pipeline/export para pipelines de CI/CD.',
      'Documento C.R.A.F.T. accesible en el botón superior con el esquema de base de datos y Docker Compose.',
    ],
    proDevTip:
      'Integra /api/pipeline/export en tus dashboards corporativos de Datadog o Grafana para monitorear el SLO de la factoría agéntica.',
    interactiveActionLabel: 'Finalizar Onboarding',
  },
];

export const TUTORIAL_PATTERN_GUIDE: TutorialPatternTemplate = {
  title: 'Guía Patrón para Crear Futuros Tutoriales en AgentOS',
  purpose:
    'Estructura desacoplada y modular para que cualquier desarrollador del equipo agregue nuevos tours guiados sin tocar código central.',
  rules: [
    '1. Definir los pasos en un array tipado con la interfaz TutorialStep (en src/types/tutorial.ts).',
    '2. Asociar cada paso con un targetTab válido (canvas, board, artifacts, vcs, simulation, throughput).',
    '3. Incluir siempre un proDevTip orientado a ingenieros senior (atajos de teclado, endpoints o consideraciones de concurrencia).',
    '4. Registrar el nuevo módulo en el selector de tutoriales para que aparezca en el menú interactivo.',
  ],
  codeExample: `// Ejemplo de nuevo tutorial: "Optimización de Concurrencia y Cache LLM"
import { TutorialModule } from '../types/tutorial';

export const CONCURRENCY_TUTORIAL: TutorialModule = {
  id: 'concurrency-optimization',
  title: 'Optimización de Concurrencia y Reducción de Tokens',
  category: 'architecture',
  targetAudience: 'Backend & AI Engineers',
  estimatedMinutes: 5,
  steps: [
    {
      id: 'step-cache-bus',
      stepNumber: 1,
      title: 'Active Context Cache Bus',
      badge: 'Caché de Tokens',
      targetTab: 'canvas',
      description: 'Cómo opera el bus de embeddings entre Brain 2.0 y Benchmark Lab.',
      keyConcepts: ['Reutilización de prefijos de sistema', 'Ahorro del 35% en cuota Gemini'],
      proDevTip: 'Verifica los pesos de telemetría en el nodo Evaluation.',
      interactiveActionLabel: 'Ver Nodo Brain 2.0'
    }
  ]
};`,
};

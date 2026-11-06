/**
 * AgentOS - Grafo de Dependencias de Tareas (Task Dependency Graph)
 * Modela relaciones de bloqueo ('blocks'), habilitación ('enables'),
 * paralelismo ('parallel_with') y validación cruzada entre tareas de agentes.
 */

import {
  PipelineTask,
  PipelineNode,
  WorkflowTaskNode,
  WorkflowDependencyLink,
  TaskDependencyGraphData,
  DependencyExecutionState,
} from '../types/pipeline';

export const DEFAULT_WORKFLOW_TASKS: WorkflowTaskNode[] = [
  {
    id: 'wf-task-1',
    title: 'Análisis de Requerimientos & Threat Modeling',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'brain',
    agentNodeName: 'Brain (C1)',
    layer: 1,
    state: 'completed',
    progress: 100,
    durationMs: 4200,
    tokens: 8500,
    dependsOn: [],
    blocks: ['wf-task-2', 'wf-task-3'],
    criticalPath: true,
  },
  {
    id: 'wf-task-2',
    title: 'Extracción de Contexto & Sanitización Guardrails',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'seguridad',
    agentNodeName: 'Seguridad (C1)',
    layer: 1,
    state: 'completed',
    progress: 100,
    durationMs: 3100,
    tokens: 6200,
    dependsOn: ['wf-task-1'],
    blocks: ['wf-task-4'],
    criticalPath: true,
  },
  {
    id: 'wf-task-3',
    title: 'Prototipado Visual UI & Tokens de Diseño',
    lane: 'standard',
    priority: 'P2_NORMAL',
    agentNodeId: 'mockup',
    agentNodeName: 'Mockup (C2)',
    layer: 2,
    state: 'completed',
    progress: 100,
    durationMs: 5400,
    tokens: 9800,
    dependsOn: ['wf-task-1'],
    blocks: ['wf-task-5'],
    parallelGroup: 'group-layer-2',
    criticalPath: false,
  },
  {
    id: 'wf-task-4',
    title: 'Redacción de Spec Técnica & AST Contract',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'spec_writer',
    agentNodeName: 'Spec Writer (C3)',
    layer: 3,
    state: 'completed',
    progress: 100,
    durationMs: 6800,
    tokens: 18400,
    dependsOn: ['wf-task-2'],
    blocks: ['wf-task-6', 'wf-task-7'],
    criticalPath: true,
  },
  {
    id: 'wf-task-5',
    title: 'Evaluación Heurística UX & Accesibilidad WCAG',
    lane: 'standard',
    priority: 'P2_NORMAL',
    agentNodeId: 'ux',
    agentNodeName: 'UX (C2)',
    layer: 2,
    state: 'completed',
    progress: 100,
    durationMs: 3800,
    tokens: 5400,
    dependsOn: ['wf-task-3'],
    blocks: ['wf-task-7'],
    parallelGroup: 'group-layer-2',
    criticalPath: false,
  },
  {
    id: 'wf-task-6',
    title: 'Generación de Código Backend & Lógica Core',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'builder',
    agentNodeName: 'Builder (C3)',
    layer: 3,
    state: 'running',
    progress: 72,
    durationMs: 9500,
    tokens: 28900,
    dependsOn: ['wf-task-4'],
    blocks: ['wf-task-8'],
    parallelGroup: 'group-layer-3-build',
    criticalPath: true,
  },
  {
    id: 'wf-task-7',
    title: 'Implementación de Componentes Frontend UI',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'ui',
    agentNodeName: 'UI (C3)',
    layer: 3,
    state: 'running',
    progress: 58,
    durationMs: 7200,
    tokens: 22100,
    dependsOn: ['wf-task-4', 'wf-task-5'],
    blocks: ['wf-task-8', 'wf-task-9'],
    parallelGroup: 'group-layer-3-build',
    criticalPath: false,
  },
  {
    id: 'wf-task-8',
    title: 'Pruebas Unitarias en Contenedor Ephemeral',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'verificador',
    agentNodeName: 'Verificador (C4)',
    layer: 4,
    state: 'ready',
    progress: 0,
    durationMs: 4600,
    tokens: 7200,
    dependsOn: ['wf-task-6', 'wf-task-7'],
    blocks: ['wf-task-10'],
    criticalPath: true,
  },
  {
    id: 'wf-task-9',
    title: 'Captura Automatizada de Evidencia Visual DOM',
    lane: 'standard',
    priority: 'P2_NORMAL',
    agentNodeId: 'evidencia_visual',
    agentNodeName: 'Evidencia Visual (C3)',
    layer: 3,
    state: 'ready',
    progress: 0,
    durationMs: 3400,
    tokens: 4100,
    dependsOn: ['wf-task-7'],
    blocks: ['wf-task-10'],
    parallelGroup: 'group-layer-4-val',
    criticalPath: false,
  },
  {
    id: 'wf-task-10',
    title: 'Revisión y Aprobación Multi-Agente (4 de 4)',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'approver',
    agentNodeName: 'Approver (C4)',
    layer: 4,
    state: 'blocked',
    progress: 0,
    durationMs: 2900,
    tokens: 4800,
    dependsOn: ['wf-task-8', 'wf-task-9'],
    blocks: ['wf-task-11', 'wf-task-12'],
    criticalPath: true,
  },
  {
    id: 'wf-task-11',
    title: 'Validación en SWE Benchmark Lab & Regresión',
    lane: 'standard',
    priority: 'P1_HIGH',
    agentNodeId: 'benchmark_lab',
    agentNodeName: 'Benchmark Lab (C5)',
    layer: 5,
    state: 'blocked',
    progress: 0,
    durationMs: 8200,
    tokens: 19500,
    dependsOn: ['wf-task-10'],
    blocks: ['wf-task-13'],
    parallelGroup: 'group-layer-5-eval',
    criticalPath: true,
  },
  {
    id: 'wf-task-12',
    title: 'Migración y Seed en BD de Pruebas Aislada',
    lane: 'standard',
    priority: 'P2_NORMAL',
    agentNodeId: 'bd_pruebas',
    agentNodeName: 'BD de Pruebas (C5)',
    layer: 5,
    state: 'blocked',
    progress: 0,
    durationMs: 4100,
    tokens: 3800,
    dependsOn: ['wf-task-10'],
    blocks: ['wf-task-13'],
    parallelGroup: 'group-layer-5-eval',
    criticalPath: false,
  },
  {
    id: 'wf-task-13',
    title: 'Aprobación Final de Despliegue (Tu OK · Ignacio)',
    lane: 'urgent',
    priority: 'P0_URGENT',
    agentNodeId: 'tu_ok',
    agentNodeName: 'Tu OK · Ignacio (C4)',
    layer: 4,
    state: 'blocked',
    progress: 0,
    durationMs: 1500,
    tokens: 1200,
    dependsOn: ['wf-task-11', 'wf-task-12'],
    blocks: [],
    criticalPath: true,
  },
];

export const DEFAULT_WORKFLOW_LINKS: WorkflowDependencyLink[] = [
  { id: 'dep-1-2', sourceTaskId: 'wf-task-1', targetTaskId: 'wf-task-2', type: 'blocks', label: 'Requiere Contexto Base', active: true },
  { id: 'dep-1-3', sourceTaskId: 'wf-task-1', targetTaskId: 'wf-task-3', type: 'enables', label: 'Habilita Prototipado', active: true },
  { id: 'dep-2-4', sourceTaskId: 'wf-task-2', targetTaskId: 'wf-task-4', type: 'blocks', label: 'Guardrails Aprobados', active: true },
  { id: 'dep-3-5', sourceTaskId: 'wf-task-3', targetTaskId: 'wf-task-5', type: 'enables', label: 'Mockup para Auditoría UX', active: true },
  { id: 'dep-4-6', sourceTaskId: 'wf-task-4', targetTaskId: 'wf-task-6', type: 'blocks', label: 'Spec Bloqueante para Core', active: true },
  { id: 'dep-4-7', sourceTaskId: 'wf-task-4', targetTaskId: 'wf-task-7', type: 'blocks', label: 'Contrato API para UI', active: true },
  { id: 'dep-5-7', sourceTaskId: 'wf-task-5', targetTaskId: 'wf-task-7', type: 'enables', label: 'Feedback UX incorporado', active: true },
  { id: 'dep-6-8', sourceTaskId: 'wf-task-6', targetTaskId: 'wf-task-8', type: 'blocks', label: 'Binario Backend listo', active: true },
  { id: 'dep-7-8', sourceTaskId: 'wf-task-7', targetTaskId: 'wf-task-8', type: 'blocks', label: 'Bundle UI integrado', active: true },
  { id: 'dep-7-9', sourceTaskId: 'wf-task-7', targetTaskId: 'wf-task-9', type: 'enables', label: 'Playwright Tests', active: true },
  { id: 'dep-8-10', sourceTaskId: 'wf-task-8', targetTaskId: 'wf-task-10', type: 'blocks', label: 'Tests en Verde', active: true },
  { id: 'dep-9-10', sourceTaskId: 'wf-task-9', targetTaskId: 'wf-task-10', type: 'validates', label: 'Evidencia Visual Aprobada', active: true },
  { id: 'dep-10-11', sourceTaskId: 'wf-task-10', targetTaskId: 'wf-task-11', type: 'blocks', label: 'Pase a SWE Benchmark', active: true },
  { id: 'dep-10-12', sourceTaskId: 'wf-task-10', targetTaskId: 'wf-task-12', type: 'enables', label: 'Migración Schema BD', active: true },
  { id: 'dep-11-13', sourceTaskId: 'wf-task-11', targetTaskId: 'wf-task-13', type: 'blocks', label: 'Reporte SWE >85%', active: true },
  { id: 'dep-12-13', sourceTaskId: 'wf-task-12', targetTaskId: 'wf-task-13', type: 'blocks', label: 'Integridad BD Verificada', active: true },
];

/**
 * Computa el estado derivado del grafo de dependencias de tareas en base a
 * las tareas activas en el pipeline o el conjunto por defecto del workflow.
 */
export function buildTaskDependencyGraph(
  liveTasks: PipelineTask[],
  _nodes: PipelineNode[],
  customWorkflowTasks?: WorkflowTaskNode[]
): TaskDependencyGraphData {
  const tasks = customWorkflowTasks && customWorkflowTasks.length > 0
    ? [...customWorkflowTasks]
    : [...DEFAULT_WORKFLOW_TASKS];

  // Si hay tareas vivas en el pipeline, sincronizar estados dinámicos
  if (liveTasks.length > 0) {
    const runningNodeIds = new Set(liveTasks.filter(t => t.status === 'running').map(t => t.currentNodeId));
    tasks.forEach(task => {
      if (task.state !== 'completed') {
        const hasUnfinishedDependencies = task.dependsOn.some(depId => {
          const parent = tasks.find(t => t.id === depId);
          return parent && parent.state !== 'completed';
        });

        if (hasUnfinishedDependencies) {
          task.state = 'blocked';
          task.progress = 0;
        } else if (runningNodeIds.has(task.agentNodeId)) {
          task.state = 'running';
          task.progress = Math.max(25, task.progress || 50);
        } else if (task.state === 'blocked') {
          task.state = 'ready';
        }
      }
    });
  }

  const links = [...DEFAULT_WORKFLOW_LINKS];

  let blockedCount = 0;
  let readyCount = 0;
  let runningCount = 0;
  let completedCount = 0;

  tasks.forEach(t => {
    if (t.state === 'blocked') blockedCount++;
    else if (t.state === 'ready') readyCount++;
    else if (t.state === 'running') runningCount++;
    else if (t.state === 'completed') completedCount++;
  });

  // Cálculo de camino crítico (suma de duraciones en criticalPath)
  const criticalPathLengthMs = tasks
    .filter(t => t.criticalPath)
    .reduce((acc, t) => acc + t.durationMs, 0);

  // Estimación de paralelización efectiva (ratio tareas en grupos paralelos vs total)
  const parallelTasksCount = tasks.filter(t => Boolean(t.parallelGroup)).length;
  const parallelCapacityUtilization = Math.round((parallelTasksCount / Math.max(1, tasks.length)) * 100);

  return {
    tasks,
    links,
    criticalPathLengthMs,
    parallelCapacityUtilization,
    blockedTasksCount: blockedCount,
    readyTasksCount: readyCount,
    runningTasksCount: runningCount,
    completedTasksCount: completedCount,
  };
}

/**
 * Simula el desbloqueo o avance paso a paso de una tarea en el flujo de dependencias
 */
export function advanceDependencyTask(
  currentTasks: WorkflowTaskNode[],
  taskId: string
): WorkflowTaskNode[] {
  return currentTasks.map((task): WorkflowTaskNode => {
    if (task.id === taskId) {
      if (task.state === 'ready') {
        return { ...task, state: 'running' as DependencyExecutionState, progress: 50 };
      }
      if (task.state === 'running') {
        return { ...task, state: 'completed' as DependencyExecutionState, progress: 100 };
      }
    }
    return task;
  }).map((task, _, all) => {
    // Re-evaluar tareas bloqueadas si sus padres ya están completados
    if (task.state === 'blocked') {
      const allParentsDone = task.dependsOn.every(depId => {
        const parent = all.find(p => p.id === depId);
        return parent && parent.state === 'completed';
      });
      if (allParentsDone) {
        return { ...task, state: 'ready' as DependencyExecutionState };
      }
    }
    return task;
  });
}

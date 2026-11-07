/**
 * Flujos de trabajo: cada tarea instancia un DAG de pasos (fork/join) según carril y tipo.
 * Approver es una puerta de quórum: solo se ejecuta cuando TODAS sus dependencias están hechas.
 */
import type { Lane, TaskKind, WorkflowStepDef } from './domain.js';

/** Máximo de rechazos de Approver antes de marcar la tarea como error ("falla · máx 2"). */
export const MAX_REWORK = 2;
/** Intentos por paso antes de dar el paso por fallido. */
export const MAX_ATTEMPTS = 3;

export const REWORK_GATE = 'approver';

/** Nodos que emiten veredicto (aprobado / rechazado / blocked) y votan en el quórum de Approver. */
export const REVIEWER_NODES: ReadonlySet<string> = new Set(['verificador', 'seguridad', 'codigo', 'ui', 'ux']);
export const REWORK_TARGET = 'builder';

const s = (nodeId: string, ...deps: string[]): WorkflowStepDef => ({ nodeId, deps });

function standard(kind: TaskKind): WorkflowStepDef[] {
  const steps: WorkflowStepDef[] = [s('entradas'), s('filtro', 'entradas'), s('analyze', 'filtro')];

  if (kind === 'research') {
    steps.push(s('explorador', 'analyze'), s('spec_writer', 'explorador'));
  } else if (kind === 'visual') {
    steps.push(s('mockup', 'analyze'), s('spec_writer', 'mockup'));
  } else {
    steps.push(s('spec_writer', 'analyze'));
  }

  steps.push(
    s('coherencia', 'spec_writer'),
    s('builder', 'coherencia'),
    // fork: cuatro revisiones en paralelo
    s('verificador', 'builder'),
    s('seguridad', 'builder'),
    s('codigo', 'builder'),
    s('ui', 'builder'),
  );

  const uiVote = kind === 'visual' ? 'ux' : 'ui';
  if (kind === 'visual') steps.push(s('ux', 'ui'));

  steps.push(
    // join 4/4
    s('approver', 'verificador', 'seguridad', 'codigo', uiVote),
    s('evaluacion', 'approver'),
    s('benchmark_lab', 'evaluacion'),
    s('router', 'approver'),
  );

  if (kind === 'visual') {
    steps.push(s('evidencia', 'router'), s('tu_ok', 'evidencia'));
  } else {
    steps.push(s('tu_ok', 'router'));
  }

  steps.push(s('main_local', 'tu_ok'), s('produccion', 'main_local'));
  return steps;
}

function express(kind: TaskKind): WorkflowStepDef[] {
  const steps: WorkflowStepDef[] = [
    s('entradas'),
    s('filtro', 'entradas'),
    s('analyze', 'filtro'),
    s('carril_expres', 'analyze'),
    s('builder', 'carril_expres'),
    s('verificador', 'builder'),
    s('seguridad', 'builder'),
    // quórum reducido 2/2
    s('approver', 'verificador', 'seguridad'),
    s('router', 'approver'),
  ];
  if (kind === 'visual') {
    steps.push(s('evidencia', 'router'), s('tu_ok', 'evidencia'));
  } else {
    steps.push(s('tu_ok', 'router'));
  }
  steps.push(s('main_local', 'tu_ok'), s('produccion', 'main_local'));
  return steps;
}

function urgent(): WorkflowStepDef[] {
  return [
    s('entradas'),
    s('carril_urgencia', 'entradas'),
    s('main_local', 'carril_urgencia'),
    s('produccion', 'main_local'),
    // revisión de seguridad a posteriori (<24h)
    s('seguridad', 'produccion'),
  ];
}

export function buildWorkflow(lane: Lane, kind: TaskKind): WorkflowStepDef[] {
  switch (lane) {
    case 'standard':
      return standard(kind);
    case 'express':
      return express(kind);
    case 'urgent':
      return urgent();
    default: {
      const exhaustive: never = lane;
      throw new Error(`Carril no soportado: ${String(exhaustive)}`);
    }
  }
}

/** Descendientes de `nodeId` dentro de un flujo concreto (para resetear en retrabajo). */
export function descendantsInWorkflow(steps: readonly WorkflowStepDef[], nodeId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const step of steps) {
    for (const dep of step.deps) {
      const list = children.get(dep) ?? [];
      list.push(step.nodeId);
      children.set(dep, list);
    }
  }
  const out = new Set<string>();
  const stack = [...(children.get(nodeId) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || out.has(next)) continue;
    out.add(next);
    stack.push(...(children.get(next) ?? []));
  }
  return out;
}

/** Orden topológico (Kahn). Lanza si hay ciclo o dependencia inexistente: invariante del flujo. */
export function topologicalOrder(steps: readonly WorkflowStepDef[]): string[] {
  const ids = new Set(steps.map((st) => st.nodeId));
  if (ids.size !== steps.length) throw new Error('Paso duplicado en el flujo');
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const step of steps) {
    indegree.set(step.nodeId, step.deps.length);
    for (const dep of step.deps) {
      if (!ids.has(dep)) throw new Error(`Dependencia inexistente: ${dep} → ${step.nodeId}`);
      const list = children.get(dep) ?? [];
      list.push(step.nodeId);
      children.set(dep, list);
    }
  }
  const queue = steps.filter((st) => st.deps.length === 0).map((st) => st.nodeId);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    order.push(id);
    for (const child of children.get(id) ?? []) {
      const left = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, left);
      if (left === 0) queue.push(child);
    }
  }
  if (order.length !== steps.length) throw new Error('El flujo contiene un ciclo');
  return order;
}

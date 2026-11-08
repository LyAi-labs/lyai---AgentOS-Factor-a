/**
 * Impacto aguas abajo de un nodo ("pre-flight"): qué nodos dependen de él y qué tareas en curso
 * todavía tienen que pasar por él. Sirve para decidir antes de tocar su configuración o pararlo.
 */
import { reachableFrom, requireNode } from '@factory-os/shared';
import type { TaskView } from '@factory-os/shared';

export interface NodeImpact {
  downstream: { id: string; label: string; layer: number }[];
  /** Tareas abiertas cuyo paso en este nodo aún no ha terminado. */
  pendingTasks: TaskView[];
  layersAffected: number[];
}

export function computeImpact(nodeId: string, tasks: readonly TaskView[]): NodeImpact {
  const downstream = reachableFrom(nodeId).map((id) => {
    const n = requireNode(id);
    return { id, label: n.label, layer: n.layer };
  });
  const pendingTasks = tasks.filter(
    (t) =>
      (t.status === 'pending' || t.status === 'running') &&
      t.steps.some((s) => s.nodeId === nodeId && s.status !== 'done' && s.status !== 'failed'),
  );
  const layersAffected = [...new Set(downstream.map((d) => d.layer))].sort((a, b) => a - b);
  return { downstream, pendingTasks, layersAffected };
}

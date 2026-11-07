/**
 * Ejecutor de pasos. El motor no sabe qué hace un nodo: delega en un StageExecutor.
 * La implementación incluida es un simulador estocástico parametrizado por el perfil del nodo
 * (duración, tasa de fallo). Un ejecutor real (agentes, CI, git) implementa la misma interfaz.
 */
import type { NodeConfig, NodeDef } from '@factory-os/shared';
import type { Rng } from './random.js';

export interface StagePlan {
  durationMs: number;
  outcome: 'success' | 'failure';
  error: string | null;
}

export interface StageExecutor {
  plan(node: NodeDef, config: NodeConfig, taskId: string, attempt: number): StagePlan;
}

const FAILURE_MESSAGES: Readonly<Record<string, string>> = {
  approver: 'Quórum no alcanzado: veredicto negativo',
  verificador: 'Tests fallidos en contenedor',
  seguridad: 'Hallazgo de seguridad en el diff',
  coherencia: 'Spec incompleta: faltan secciones obligatorias',
  builder: 'La construcción no compila',
  codigo: 'Revisión de código con bloqueantes',
};

export class SimulatedExecutor implements StageExecutor {
  constructor(private readonly rng: Rng) {}

  plan(node: NodeDef, config: NodeConfig): StagePlan {
    const jitter = 0.6 + this.rng.next() * 0.8;
    const durationMs = Math.round(config.baseDurationMs * jitter);
    const failed = this.rng.next() < config.failureRate;
    return failed
      ? { durationMs, outcome: 'failure', error: FAILURE_MESSAGES[node.id] ?? `Fallo en ${node.label}` }
      : { durationMs, outcome: 'success', error: null };
  }
}

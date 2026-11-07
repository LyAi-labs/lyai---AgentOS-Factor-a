/**
 * Ejecutor de pasos. El motor no sabe qué hace un nodo: delega en un StageExecutor.
 * La implementación incluida es un simulador estocástico parametrizado por el perfil del nodo
 * (duración, tasa de fallo). Un ejecutor real (agentes, CI, git) implementa la misma interfaz.
 *
 * Revisores (REVIEWER_NODES): devuelven un veredicto según el contrato de lyai-factory
 * (docs/contratos/veredicto.md). `outcome: 'failure'` en un revisor significa "no respondió",
 * que el motor trata como `blocked` (constitución O9: nunca se sustituye en silencio ni se reintenta).
 */
import { REVIEWER_NODES } from '@factory-os/shared';
import type { Finding, FindingCategory, NodeConfig, NodeDef, Verdict } from '@factory-os/shared';
import type { Rng } from './random.js';

export interface StagePlan {
  durationMs: number;
  outcome: 'success' | 'failure';
  error: string | null;
  /** Solo revisores. */
  verdict?: Verdict;
  findings?: Finding[];
}

export interface StageExecutor {
  plan(node: NodeDef, config: NodeConfig, taskId: string, attempt: number): StagePlan;
}

const FAILURE_MESSAGES: Readonly<Record<string, string>> = {
  approver: 'Approver: veredicto negativo propio',
  coherencia: 'Spec incompleta: faltan secciones obligatorias',
  builder: 'La construcción no compila',
};

const BLOCKING_FINDING: Readonly<Record<string, { categoria: FindingCategory; detalle: string }>> = {
  verificador: { categoria: 'correccion', detalle: 'Tests fallidos en contenedor contra la BD de pruebas' },
  seguridad: { categoria: 'seguridad', detalle: 'Secreto en claro en el diff' },
  codigo: { categoria: 'correccion', detalle: 'Caso límite sin tratar: error no capturado en promesa' },
  ui: { categoria: 'ux', detalle: 'El flujo principal no es usable en móvil' },
  ux: { categoria: 'ux', detalle: 'Contraste insuficiente en avisos críticos' },
};

/** Fracción de los fallos de un revisor que son `blocked` (no pudo revisar) en vez de `rechazado`. */
const BLOCKED_SHARE = 0.1;
/** Probabilidad de un hallazgo de estilo, que nunca bloquea (O2). */
const STYLE_FINDING_RATE = 0.15;

export class SimulatedExecutor implements StageExecutor {
  constructor(private readonly rng: Rng) {}

  plan(node: NodeDef, config: NodeConfig): StagePlan {
    const jitter = 0.6 + this.rng.next() * 0.8;
    const durationMs = Math.round(config.baseDurationMs * jitter);
    const r = this.rng.next();

    if (REVIEWER_NODES.has(node.id)) {
      const findings: Finding[] = [];
      if (this.rng.next() < STYLE_FINDING_RATE) {
        findings.push({ categoria: 'estilo', bloquea: false, detalle: 'Nombres inconsistentes (no bloquea)' });
      }
      if (r < config.failureRate * (1 - BLOCKED_SHARE)) {
        const f = BLOCKING_FINDING[node.id] ?? { categoria: 'correccion' as const, detalle: `Hallazgo en ${node.label}` };
        findings.push({ ...f, bloquea: true });
        return { durationMs, outcome: 'success', error: f.detalle, verdict: 'rechazado', findings };
      }
      if (r < config.failureRate) {
        return { durationMs, outcome: 'success', error: 'No se pudo revisar: falta evidencia', verdict: 'blocked', findings };
      }
      return { durationMs, outcome: 'success', error: null, verdict: 'aprobado', findings };
    }

    return r < config.failureRate
      ? { durationMs, outcome: 'failure', error: FAILURE_MESSAGES[node.id] ?? `Fallo en ${node.label}` }
      : { durationMs, outcome: 'success', error: null };
  }
}

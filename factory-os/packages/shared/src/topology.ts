/**
 * Topología de la factoría: transcripción del diagrama de referencia de LyAi
 * (5 capas, 25 nodos, leyenda de 7 categorías). Las aristas de flujo NO se escriben a mano:
 * se derivan de los flujos de trabajo (workflow.ts) para que diagrama y motor no puedan divergir.
 */
import type { EdgeDef, LayerDef, NodeDef } from './domain.js';
import { LANES, TASK_KINDS } from './domain.js';
import { buildWorkflow, REWORK_GATE, REWORK_TARGET } from './workflow.js';

export const LAYERS: readonly LayerDef[] = [
  { id: 1, code: '01', name: 'Entrada, Triaje y Memoria' },
  { id: 2, code: '02', name: 'Mockup, Spec, Coherencia, Builder y Verificador' },
  { id: 3, code: '03', name: 'Revisión en paralelo (4)' },
  { id: 4, code: '04', name: 'Approver, Evaluación, Evidencia visual y Tu OK' },
  { id: 5, code: '05', name: 'Carril de urgencia, main local y Producción' },
];

const p = (capacity: number, baseDurationMs: number, failureRate: number) => ({
  capacity,
  baseDurationMs,
  failureRate,
});

export const NODES: readonly NodeDef[] = [
  // 01 · Entrada, Triaje y Memoria
  { id: 'entradas', label: 'Entradas', engine: 'Código · 5 fuentes', layer: 1, col: 0, category: 'external_system', role: 'gateway', maturity: 'HECHO', description: 'Ingesta de solicitudes desde 5 fuentes.', profile: p(6, 1_500, 0) },
  { id: 'filtro', label: 'Filtro', engine: 'Código · sin modelo', layer: 1, col: 1, category: 'agent_logic', role: 'gateway', maturity: 'HECHO', description: 'Filtro determinista: descarta duplicados y solicitudes mal formadas.', profile: p(4, 2_000, 0.02) },
  { id: 'analyze', label: 'Analyze', engine: 'qwen local / Código', layer: 1, col: 2, category: 'policy', role: 'gateway', maturity: 'HECHO', description: 'Clasifica la solicitud y decide la rama: investigar, pantalla nueva, spec o parche.', profile: p(3, 5_000, 0.02) },
  { id: 'explorador', label: 'Explorador', engine: 'Sonnet / Gemini', layer: 1, col: 3, category: 'agent_logic', role: 'processor', maturity: 'EN PRUEBA', description: 'Investiga el código y el contexto antes de especificar (tareas de investigación).', profile: p(2, 30_000, 0.04), uses: ['brain'] },
  { id: 'carril_expres', label: 'Carril exprés', engine: 'Código · sin modelo', layer: 1, col: 4, category: 'agent_logic', role: 'gateway', maturity: 'HECHO', description: 'Parches acotados: sin spec, quórum reducido (Verificador + Seguridad).', profile: p(3, 2_000, 0.01) },
  { id: 'brain', label: 'Brain', engine: 'wiki, reglas y sistema diseño', layer: 1, col: 5, category: 'context_trace', role: 'resource', maturity: 'HECHO', description: 'Memoria compartida: wiki, reglas y sistema de diseño. Lo consultan Explorador y Builder.', profile: p(8, 0, 0) },

  // 02 · Mockup, Spec, Coherencia, Builder y Verificador
  { id: 'mockup', label: 'Mockup', engine: 'dev-xplain · nuevo', layer: 2, col: 0, category: 'user_ui', role: 'processor', maturity: 'HECHO', description: 'Prototipo de pantalla nueva antes de escribir la especificación.', profile: p(2, 20_000, 0.03) },
  { id: 'spec_writer', label: 'Spec writer', engine: 'Opus / Gemini Pro', layer: 2, col: 1, category: 'agent_logic', role: 'processor', maturity: 'EN PRUEBA', description: 'Redacta la especificación (SDD: spec, plan, tasks).', profile: p(2, 25_000, 0.05) },
  { id: 'coherencia', label: 'Coherencia', engine: 'Sonnet / Determinista', layer: 2, col: 2, category: 'policy', role: 'processor', maturity: 'HECHO', description: 'Comprueba que la spec contiene las secciones obligatorias y no contradice reglas del Brain.', profile: p(3, 6_000, 0.06) },
  { id: 'builder', label: 'Builder', engine: 'Opus / Gemini Pro', layer: 2, col: 3, category: 'agent_logic', role: 'processor', maturity: 'EN PRUEBA', description: 'Construye el cambio en rama aislada. Recibe retrabajo de Approver (máx. 2).', profile: p(3, 40_000, 0.06), uses: ['brain'] },
  { id: 'verificador', label: 'Verificador', engine: 'Código · Docker', layer: 2, col: 4, category: 'policy', role: 'processor', maturity: 'HECHO', description: 'Verificación estricta en contenedor contra la BD de pruebas aislada.', profile: p(2, 18_000, 0.08), uses: ['bd_pruebas'] },
  { id: 'bd_pruebas', label: 'BD de pruebas', engine: 'aislada · nunca la real', layer: 2, col: 5, category: 'context_trace', role: 'resource', maturity: 'HECHO', description: 'Base de datos aislada que usa el Verificador. Nunca la real.', profile: p(4, 0, 0) },

  // 03 · Revisión en paralelo (4) · revisión en paralelo quórum 4/4
  { id: 'seguridad', label: 'Seguridad', engine: 'Gemini 2.5 Flash', layer: 3, col: 2, category: 'policy', role: 'processor', maturity: 'EN PRUEBA', description: 'Revisión de seguridad del diff (secretos, permisos, superficie). Vota en Approver; revisión en paralelo; revisa a posteriori el carril de urgencia (<24h).', profile: p(2, 12_000, 0.05) },
  { id: 'ux', label: 'UX', engine: 'Gemini 2.5 Flash', layer: 3, col: 3, category: 'user_ui', role: 'processor', maturity: 'EN PRUEBA', description: 'Evaluación de experiencia de uso en tareas visuales. Su veredicto alimenta a Approver en revisión en paralelo.', profile: p(2, 10_000, 0.05) },
  { id: 'ui', label: 'UI', engine: 'Sonnet / Gemini', layer: 3, col: 4, category: 'user_ui', role: 'processor', maturity: 'HECHO', description: 'Validación de interfaz del artefacto construido en revisión en paralelo.', profile: p(2, 9_000, 0.04) },
  { id: 'codigo', label: 'Código', engine: 'Sonnet / Gemini', layer: 3, col: 5, category: 'agent_logic', role: 'processor', maturity: 'EN PRUEBA', description: 'Revisión de código y firma SSH del commit en revisión en paralelo.', profile: p(2, 11_000, 0.05) },

  // 04 · Approver, Evaluación, Evidencia visual y Tu OK
  { id: 'evaluacion', label: 'Evaluación', engine: 'Código · Telemetría', layer: 4, col: 1, category: 'tool_action', role: 'processor', maturity: 'HECHO', description: 'Registra métricas de la ejecución y las envía al Benchmark Lab.', profile: p(4, 3_000, 0.01) },
  { id: 'approver', label: 'Approver', engine: 'Sonnet 5.5 · 4/4', layer: 4, col: 2, category: 'tool_action', role: 'gateway', maturity: 'EN PRUEBA', description: 'Puerta de quórum estricto: exige veredictos aprobados de todos los revisores asignados.', profile: p(2, 8_000, 0.04) },
  { id: 'router', label: 'Router', engine: 'Código + Gateway', layer: 4, col: 3, category: 'policy', role: 'gateway', maturity: 'HECHO', description: 'Enruta según el diff: visual → Evidencia; no visual → Tu OK.', profile: p(4, 1_000, 0) },
  { id: 'evidencia', label: 'Evidencia visual', engine: 'Playwright · dev-xplain', layer: 4, col: 4, category: 'user_ui', role: 'processor', maturity: 'HECHO', description: 'Capturas y medición determinista del DOM real.', profile: p(3, 14_000, 0.02) },
  { id: 'tu_ok', label: 'Tu OK · Ignacio', engine: 'Ignacio · Tu OK', layer: 4, col: 5, category: 'external_system', role: 'human', maturity: 'HECHO', description: 'Aprobación humana obligatoria antes de fusionar.', profile: p(1, 0, 0) },

  // 05 · Carril de urgencia, main local y Producción
  { id: 'benchmark_lab', label: 'Benchmark Lab', engine: 'Benchmark Lab', layer: 5, col: 1, category: 'context_trace', role: 'processor', maturity: 'HECHO', description: 'Laboratorio de benchmarks y algoritmia sobre la telemetría.', profile: p(2, 6_000, 0.02) },
  { id: 'carril_urgencia', label: 'Carril urgencia', engine: 'Ignacio · firma SSH', layer: 5, col: 3, category: 'policy', role: 'human', maturity: 'HECHO', description: 'Bypass para incidentes graves en producción: firma SSH externa obligatoria.', profile: p(1, 0, 0) },
  { id: 'main_local', label: 'main local', engine: 'cerrar.py · local', layer: 5, col: 4, category: 'cloud_service', role: 'processor', maturity: 'HECHO', description: 'Fusión atómica a la rama main del repositorio local (cerrar.py).', profile: p(2, 4_000, 0) },
  { id: 'produccion', label: 'Producción', engine: 'Ignacio · deploy', layer: 5, col: 5, category: 'cloud_service', role: 'human', maturity: 'HECHO', description: 'Despliegue a producción: solo con autorización de Ignacio.', profile: p(1, 0, 0) },
];

const NODE_INDEX: ReadonlyMap<string, NodeDef> = new Map(NODES.map((n) => [n.id, n]));

export function getNode(id: string): NodeDef | undefined {
  return NODE_INDEX.get(id);
}

export function requireNode(id: string): NodeDef {
  const node = NODE_INDEX.get(id);
  if (!node) throw new Error(`Nodo desconocido: ${id}`);
  return node;
}

const EDGE_LABELS: Readonly<Record<string, string>> = {
  'analyze>explorador': 'investigar',
  'analyze>mockup': 'pantalla nueva',
  'analyze>spec_writer': 'spec',
  'analyze>carril_expres': 'parche',
  'mockup>spec_writer': 'OK mockup',
  'approver>router': 'quórum',
  'router>evidencia': 'visual',
  'router>tu_ok': 'no visual',
  'tu_ok>main_local': 'fusionar',
  'carril_urgencia>main_local': 'bypass',
  'produccion>seguridad': 'rev <24h',
  'bd_pruebas>verificador': 'aislada',
  'brain>builder': 'contexto',
  'approver>builder': 'falla · máx 2',
};

function edgeId(source: string, target: string, kind: string): string {
  return `${kind}:${source}>${target}`;
}

/** Deriva el conjunto de aristas a partir de todos los flujos posibles + contexto + retrabajo. */
export function deriveEdges(): EdgeDef[] {
  const edges = new Map<string, EdgeDef>();
  const add = (source: string, target: string, kind: EdgeDef['kind']) => {
    const id = edgeId(source, target, kind);
    if (edges.has(id)) return;
    const label = EDGE_LABELS[`${source}>${target}`];
    edges.set(id, label ? { id, source, target, kind, label } : { id, source, target, kind });
  };
  for (const lane of LANES) {
    for (const kind of TASK_KINDS) {
      for (const step of buildWorkflow(lane, kind)) {
        for (const dep of step.deps) {
          const edgeKind = lane === 'urgent' && step.nodeId === 'seguridad' ? 'review' : 'flow';
          add(dep, step.nodeId, edgeKind);
        }
      }
    }
  }
  for (const node of NODES) {
    for (const used of node.uses ?? []) add(used, node.id, 'context');
  }
  add(REWORK_GATE, REWORK_TARGET, 'rework');
  return [...edges.values()];
}

export const EDGES: readonly EdgeDef[] = deriveEdges();

/** Nodos alcanzables desde `nodeId` siguiendo aristas de flujo (equivalente al CTE recursivo en SQL). */
export function reachableFrom(nodeId: string, edges: readonly EdgeDef[] = EDGES): string[] {
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== 'flow' && e.kind !== 'review') continue;
    const list = out.get(e.source) ?? [];
    list.push(e.target);
    out.set(e.source, list);
  }
  const seen = new Set<string>();
  const stack = [...(out.get(nodeId) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || seen.has(next)) continue;
    seen.add(next);
    stack.push(...(out.get(next) ?? []));
  }
  return [...seen].sort();
}

import { describe, expect, it } from 'vitest';
import {
  buildWorkflow,
  EDGES,
  LANES,
  LAYERS,
  NODE_CATEGORIES,
  NODE_ROLES,
  NODES,
  reachableFrom,
  TASK_KINDS,
  topologicalOrder,
} from '../src/index.js';

const step = (lane: (typeof LANES)[number], kind: (typeof TASK_KINDS)[number], nodeId: string) =>
  buildWorkflow(lane, kind).find((s) => s.nodeId === nodeId);

describe('graph-topology', () => {
  it('[TOP-001] define 5 capas y 25 nodos con ids únicos y capa existente', () => {
    expect(LAYERS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
    expect(NODES).toHaveLength(25);
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODES.length);
    const layerIds = new Set(LAYERS.map((l) => l.id));
    for (const node of NODES) expect(layerIds.has(node.layer)).toBe(true);
  });

  it('[TOP-002] cada nodo tiene categoría de leyenda y rol válidos', () => {
    for (const node of NODES) {
      expect(NODE_CATEGORIES).toContain(node.category);
      expect(NODE_ROLES).toContain(node.role);
    }
    const byRole = (role: string) => NODES.filter((n) => n.role === role).map((n) => n.id).sort();
    expect(byRole('human')).toEqual(['carril_urgencia', 'produccion', 'tu_ok']);
    expect(byRole('resource')).toEqual(['bd_pruebas', 'brain']);
  });

  it('[TOP-003] las aristas de flujo coinciden exactamente con las dependencias de los flujos', () => {
    const fromWorkflows = new Set<string>();
    for (const lane of LANES) {
      for (const kind of TASK_KINDS) {
        for (const s of buildWorkflow(lane, kind)) for (const d of s.deps) fromWorkflows.add(`${d}>${s.nodeId}`);
      }
    }
    const fromEdges = new Set(
      EDGES.filter((e) => e.kind === 'flow' || e.kind === 'review').map((e) => `${e.source}>${e.target}`),
    );
    expect(fromEdges).toEqual(fromWorkflows);
    const nodeIds = new Set(NODES.map((n) => n.id));
    for (const e of EDGES) {
      expect(nodeIds.has(e.source)).toBe(true);
      expect(nodeIds.has(e.target)).toBe(true);
    }
    expect(EDGES.filter((e) => e.kind === 'rework')).toEqual([
      expect.objectContaining({ source: 'approver', target: 'builder' }),
    ]);
    expect(EDGES.some((e) => e.kind === 'context' && e.source === 'brain' && e.target === 'builder')).toBe(true);
  });

  it('[TOP-004] alcanzabilidad desde Analyze', () => {
    const reach = reachableFrom('analyze');
    expect(reach).toContain('builder');
    expect(reach).toContain('produccion');
    expect(reach).not.toContain('entradas');
    expect(reach).not.toContain('brain');
    expect(reachableFrom('produccion')).toContain('seguridad');
    expect(reachableFrom('benchmark_lab')).toEqual([]);
  });
});

describe('workflow', () => {
  it('[WF-001] los 9 flujos son DAGs cerrados con nodos existentes', () => {
    const nodeIds = new Set(NODES.map((n) => n.id));
    for (const lane of LANES) {
      for (const kind of TASK_KINDS) {
        const wf = buildWorkflow(lane, kind);
        expect(topologicalOrder(wf)).toHaveLength(wf.length);
        for (const s of wf) expect(nodeIds.has(s.nodeId)).toBe(true);
      }
    }
    expect(() => topologicalOrder([{ nodeId: 'a', deps: ['b'] }, { nodeId: 'b', deps: ['a'] }])).toThrow(/ciclo/);
    expect(() => topologicalOrder([{ nodeId: 'a', deps: ['zz'] }])).toThrow(/inexistente/);
  });

  it('[WF-002] estándar: fork de 4 revisiones con join 4/4 en Approver', () => {
    expect([...(step('standard', 'no_visual', 'approver')?.deps ?? [])].sort()).toEqual(
      ['codigo', 'seguridad', 'ui', 'verificador'],
    );
    expect([...(step('standard', 'visual', 'approver')?.deps ?? [])].sort()).toEqual(
      ['codigo', 'seguridad', 'ux', 'verificador'],
    );
    for (const review of ['verificador', 'seguridad', 'codigo', 'ui']) {
      expect(step('standard', 'no_visual', review)?.deps).toEqual(['builder']);
    }
  });

  it('[WF-003] exprés: sin spec y quórum 2/2', () => {
    const wf = buildWorkflow('express', 'no_visual');
    const ids = wf.map((s) => s.nodeId);
    expect(ids).toContain('carril_expres');
    expect(ids).not.toContain('spec_writer');
    expect(ids).not.toContain('coherencia');
    expect([...(step('express', 'no_visual', 'approver')?.deps ?? [])].sort()).toEqual(['seguridad', 'verificador']);
  });

  it('[WF-004] urgencia: bypass a main local y revisión de seguridad a posteriori', () => {
    const wf = buildWorkflow('urgent', 'visual');
    expect(wf.map((s) => s.nodeId)).toEqual(['entradas', 'carril_urgencia', 'main_local', 'produccion', 'seguridad']);
    expect(step('urgent', 'no_visual', 'seguridad')?.deps).toEqual(['produccion']);
  });

  it('[WF-005] ramas por tipo: visual, investigación y no visual', () => {
    const visual = buildWorkflow('standard', 'visual').map((s) => s.nodeId);
    expect(visual).toEqual(expect.arrayContaining(['mockup', 'ux', 'evidencia']));
    expect(step('standard', 'visual', 'tu_ok')?.deps).toEqual(['evidencia']);
    expect(step('standard', 'research', 'spec_writer')?.deps).toEqual(['explorador']);
    expect(step('standard', 'no_visual', 'spec_writer')?.deps).toEqual(['analyze']);
    expect(step('standard', 'no_visual', 'tu_ok')?.deps).toEqual(['router']);
  });
});

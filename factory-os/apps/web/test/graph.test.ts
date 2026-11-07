import { describe, expect, it } from 'vitest';
import { EDGES, NODES } from '@factory-os/shared';
import { buildFlowEdges, buildFlowNodes, CATEGORY_STYLE, nodePosition, pickHandles } from '../src/lib/graph';
import type { FactoryFlowNode } from '../src/lib/graph';
import { metrics, nodeMetrics } from './fixtures';

describe('dashboard canvas', () => {
  it('[UI-002] 25 nodos + 5 bandas con salud, distintivo de categoría y aristas animadas', () => {
    const m = metrics(0).nodes.map((n) => (n.nodeId === 'builder' ? nodeMetrics('builder', { health: 'running', running: 2, capacity: 3 }) : n));
    const flow = buildFlowNodes(m, {}, 'builder');
    expect(flow.filter((n) => n.type === 'band')).toHaveLength(5);
    const factory = flow.filter((n): n is FactoryFlowNode => n.type === 'factory');
    expect(factory).toHaveLength(NODES.length);
    const builder = factory.find((n) => n.id === 'builder');
    expect(builder?.data.metrics?.health).toBe('running');
    expect(builder?.data.selected).toBe(true);
    expect(builder?.position).toEqual(nodePosition({ col: 4, layer: 3 }));
    // Regresión: sin width/height explícitos React Flow puede ocultar nodos al reconstruir el array.
    for (const n of flow) {
      expect(n.width).toBeGreaterThan(0);
      expect(n.height).toBeGreaterThan(0);
    }
    for (const style of Object.values(CATEGORY_STYLE)) expect(style.badge.length).toBeGreaterThan(0);

    // sin solapes: posiciones únicas
    const keys = new Set(factory.map((n) => `${n.position.x},${n.position.y}`));
    expect(keys.size).toBe(factory.length);

    const edges = buildFlowEdges(m);
    expect(edges).toHaveLength(EDGES.length);
    expect(edges.find((e) => e.id === 'flow:coherencia>builder')?.animated).toBe(true);
    expect(edges.find((e) => e.id === 'flow:entradas>filtro')?.animated).toBe(false);
    expect(edges.find((e) => e.target === 'builder' && e.source === 'approver')?.style?.strokeDasharray).toBeDefined();

    const builderDef = NODES.find((n) => n.id === 'builder');
    const verificador = NODES.find((n) => n.id === 'verificador');
    if (!builderDef || !verificador) throw new Error('topología incompleta');
    expect(pickHandles(builderDef, verificador)).toEqual({ sourceHandle: 's-b', targetHandle: 't-t' });
  });
});

describe('dashboard guided views', () => {
  it('[UI-005] la vista exprés resalta su recorrido y atenúa el resto', async () => {
    const { GUIDED_VIEWS } = await import('../src/lib/graph');
    const view = GUIDED_VIEWS.find((v) => v.id === 'express');
    if (!view) throw new Error('vista exprés ausente');
    const m = metrics(0).nodes;
    const nodes = buildFlowNodes(m, {}, null, view).filter((n): n is FactoryFlowNode => n.type === 'factory');
    const dim = (id: string) => nodes.find((n) => n.id === id)?.data.dimmed;
    expect(dim('carril_expres')).toBe(false);
    expect(dim('builder')).toBe(false);
    expect(dim('approver')).toBe(false);
    expect(dim('spec_writer')).toBe(true);
    for (const e of buildFlowEdges(m, view)) {
      const lit = !(e.data as { dimmed: boolean }).dimmed;
      if (lit) expect(view.nodes.has(e.source) && view.nodes.has(e.target)).toBe(true);
    }
    expect(buildFlowEdges(m, view).find((e) => e.id === 'flow:carril_expres>builder')?.data).toMatchObject({ dimmed: false });
    const all = buildFlowNodes(m, {}, null, null).filter((n): n is FactoryFlowNode => n.type === 'factory');
    expect(all.every((n) => !n.data.dimmed)).toBe(true);
    expect(GUIDED_VIEWS.length).toBeGreaterThanOrEqual(5);
  });
});

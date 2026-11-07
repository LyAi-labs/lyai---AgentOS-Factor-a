/**
 * Traducción topología + telemetría → elementos de React Flow. Pura: testeable sin DOM.
 */
import { MarkerType } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import { buildWorkflow, EDGES, LAYERS, NODES, requireNode } from '@factory-os/shared';
import type { EdgeKind, Lane, NodeCategory, NodeConfig, NodeDef, NodeHealth, NodeMetrics, TaskKind } from '@factory-os/shared';

export const COL_W = 170;
export const ROW_H = 156;
export const NODE_W = 150;
export const NODE_H = 92;
export const COLS = 6;
export const PAD_X = 42;
export const PAD_Y = 40;

/** Colores de la leyenda del diagrama de referencia + distintivo textual (el color nunca va solo). */
export const CATEGORY_STYLE: Readonly<Record<NodeCategory, { label: string; badge: string; color: string }>> = {
  user_ui: { label: 'User UI', badge: 'UI', color: '#38bdf8' },
  agent_logic: { label: 'Agent logic', badge: 'AGENTE', color: '#34d399' },
  policy: { label: 'Policy', badge: 'POLÍTICA', color: '#fb7185' },
  tool_action: { label: 'Tool action', badge: 'TOOL', color: '#fb923c' },
  context_trace: { label: 'Context / trace', badge: 'CONTEXTO', color: '#c084fc' },
  cloud_service: { label: 'Cloud service', badge: 'CLOUD', color: '#facc15' },
  external_system: { label: 'External system', badge: 'EXTERNO', color: '#94a3b8' },
};

/** Paleta de estado reservada (no se reutiliza para series): siempre con icono + texto. */
export const HEALTH_STYLE: Readonly<Record<NodeHealth, { label: string; icon: string; color: string }>> = {
  idle: { label: 'inactivo', icon: '○', color: '#8b8b85' },
  running: { label: 'en ejecución', icon: '▶', color: '#0ca30c' },
  blocked: { label: 'bloqueado', icon: '⏸', color: '#fab219' },
  error: { label: 'error', icon: '✕', color: '#d03b3b' },
};

export const EDGE_STYLE: Readonly<Record<EdgeKind, { color: string; dashed: boolean; label: string }>> = {
  flow: { color: '#34d399', dashed: false, label: 'flujo' },
  context: { color: '#c084fc', dashed: true, label: 'contexto' },
  rework: { color: '#fb7185', dashed: true, label: 'retrabajo' },
  review: { color: '#f472b6', dashed: true, label: 'revisión' },
};

export type FactoryNodeData = {
  def: NodeDef;
  metrics: NodeMetrics | null;
  config: NodeConfig | null;
  selected: boolean;
  dimmed: boolean;
};

/** Vista guiada: recorrido de un flujo concreto (nodos + pares dep→paso). */
export interface GuidedView {
  id: string;
  label: string;
  nodes: ReadonlySet<string>;
  links: ReadonlySet<string>;
}

function guided(id: string, label: string, lane: Lane, kind: TaskKind): GuidedView {
  const wf = buildWorkflow(lane, kind);
  return {
    id,
    label,
    nodes: new Set(wf.map((s) => s.nodeId)),
    links: new Set(wf.flatMap((s) => s.deps.map((d) => `${d}>${s.nodeId}`))),
  };
}

export const GUIDED_VIEWS: readonly GuidedView[] = [
  guided('std-visual', 'Pantalla nueva (visual)', 'standard', 'visual'),
  guided('std-research', 'Investigación', 'standard', 'research'),
  guided('std-plain', 'Estándar no visual', 'standard', 'no_visual'),
  guided('express', 'Carril exprés', 'express', 'no_visual'),
  guided('urgent', 'Carril de urgencia', 'urgent', 'no_visual'),
];

/** Nº de nodos por categoría (leyenda con recuento, como en el diagrama de referencia). */
export function categoryCounts(): Record<NodeCategory, number> {
  const counts = Object.fromEntries(Object.keys(CATEGORY_STYLE).map((k) => [k, 0])) as Record<NodeCategory, number>;
  for (const n of NODES) counts[n.category] += 1;
  return counts;
}

export type BandNodeData = { code: string; name: string };

export type FactoryFlowNode = Node<FactoryNodeData, 'factory'>;
export type BandFlowNode = Node<BandNodeData, 'band'>;
export type FlowNode = FactoryFlowNode | BandFlowNode;

export function nodePosition(def: Pick<NodeDef, 'col' | 'layer'>): { x: number; y: number } {
  return { x: PAD_X + def.col * COL_W, y: (def.layer - 1) * ROW_H + PAD_Y };
}

export function buildFlowNodes(
  metrics: readonly NodeMetrics[],
  configs: Readonly<Record<string, NodeConfig>>,
  selectedId: string | null,
  view: GuidedView | null = null,
): FlowNode[] {
  const metricsById = new Map(metrics.map((m) => [m.nodeId, m]));
  const bands: BandFlowNode[] = LAYERS.map((layer) => ({
    id: `band-${layer.id}`,
    type: 'band',
    position: { x: 0, y: (layer.id - 1) * ROW_H },
    data: { code: layer.code, name: layer.name },
    // Dimensiones explícitas: React Flow las da por medidas y nunca oculta el nodo (visibility: hidden)
    // al reconstruir el array en cada actualización de telemetría.
    width: PAD_X + COLS * COL_W,
    height: ROW_H - 12,
    style: { width: PAD_X + COLS * COL_W, height: ROW_H - 12 },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: -1,
  }));
  const nodes: FactoryFlowNode[] = NODES.map((def) => ({
    id: def.id,
    type: 'factory',
    position: nodePosition(def),
    data: {
      def,
      metrics: metricsById.get(def.id) ?? null,
      config: configs[def.id] ?? null,
      selected: def.id === selectedId,
      dimmed: view !== null && !view.nodes.has(def.id),
    },
    width: NODE_W,
    height: NODE_H,
    style: { width: NODE_W, height: NODE_H },
    draggable: false,
  }));
  return [...bands, ...nodes];
}

/** Elige asas según posición relativa: derecha→izquierda, arriba/abajo, o retroceso. */
export function pickHandles(source: NodeDef, target: NodeDef): { sourceHandle: string; targetHandle: string } {
  if (target.layer < source.layer) return { sourceHandle: 's-t', targetHandle: 't-b' };
  if (target.col > source.col) return { sourceHandle: 's-r', targetHandle: 't-l' };
  if (target.layer > source.layer) return { sourceHandle: 's-b', targetHandle: 't-t' };
  return { sourceHandle: 's-b', targetHandle: 't-b' };
}

export function buildFlowEdges(metrics: readonly NodeMetrics[], view: GuidedView | null = null): Edge[] {
  const running = new Set(metrics.filter((m) => m.running > 0).map((m) => m.nodeId));
  return EDGES.map((e) => {
    const style = EDGE_STYLE[e.kind];
    const dimmed = view !== null && !view.links.has(`${e.source}>${e.target}`);
    const baseOpacity = e.kind === 'flow' ? 0.75 : 0.85;
    const handles = pickHandles(requireNode(e.source), requireNode(e.target));
    const edge: Edge = {
      id: e.id,
      source: e.source,
      target: e.target,
      ...handles,
      type: 'smoothstep',
      animated: !dimmed && e.kind === 'flow' && running.has(e.target),
      markerEnd: { type: MarkerType.ArrowClosed, color: style.color, width: 14, height: 14 },
      style: {
        stroke: style.color,
        strokeWidth: view && !dimmed ? 2.4 : e.kind === 'flow' ? 1.6 : 1.3,
        strokeDasharray: style.dashed ? '5 4' : undefined,
        opacity: dimmed ? 0.08 : baseOpacity,
      },
      selectable: false,
      focusable: false,
      interactionWidth: 0,
      data: { kind: e.kind, dimmed },
    };
    if (e.label && !dimmed) {
      edge.label = e.label;
      edge.labelStyle = { fill: 'var(--ink-2)', fontSize: 10 };
      edge.labelBgStyle = { fill: 'var(--surface-2)' };
      edge.labelBgPadding = [4, 2];
      edge.labelBgBorderRadius = 3;
    }
    return edge;
  });
}

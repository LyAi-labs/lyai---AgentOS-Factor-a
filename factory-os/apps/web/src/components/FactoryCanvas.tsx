import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, useNodesInitialized, useReactFlow } from '@xyflow/react';
import type { NodeProps, NodeTypes } from '@xyflow/react';
import type { NodeCategory, NodeConfig, NodeMetrics } from '@factory-os/shared';
import {
  buildFlowEdges,
  buildFlowNodes,
  CATEGORY_STYLE,
  categoryCounts,
  EDGE_STYLE,
  GUIDED_VIEWS,
  HEALTH_STYLE,
} from '../lib/graph';
import type { BandFlowNode, FactoryFlowNode, FlowNode } from '../lib/graph';

export type Theme = 'dark' | 'light';

const FactoryNode = memo(function FactoryNode({ data }: NodeProps<FactoryFlowNode>) {
  const { def, metrics, config, selected, dimmed } = data;
  const cat = CATEGORY_STYLE[def.category];
  const healthKey = metrics?.health ?? 'idle';
  const health = HEALTH_STYLE[healthKey];
  const isWorker = def.role === 'processor' || def.role === 'gateway';
  const classes = ['fnode', `fnode--${healthKey}`, `fnode--${def.role}`];
  if (selected) classes.push('is-selected');
  if (dimmed) classes.push('is-dimmed');
  return (
    <div
      className={classes.join(' ')}
      style={{ '--cat': cat.color, '--health': health.color } as React.CSSProperties}
      data-testid={`node-${def.id}`}
      data-dimmed={dimmed || undefined}
      title={def.description}
    >
      <Handle type="target" position={Position.Left} id="t-l" />
      <Handle type="target" position={Position.Top} id="t-t" />
      <Handle type="target" position={Position.Bottom} id="t-b" />
      <div className="fnode__head">
        <span className="fnode__badge">{cat.badge}</span>
        <span className="fnode__label">{def.label}</span>
      </div>
      <div className="fnode__engine">{def.engine}</div>
      <div className="fnode__foot">
        <span className="fnode__health" aria-label={`estado ${health.label}`}>
          <span aria-hidden>{health.icon}</span> {health.label}
        </span>
        <span className="fnode__counters">
          {isWorker && (
            <span title="en ejecución / capacidad">
              {metrics?.running ?? 0}/{config?.capacity ?? def.profile.capacity}
            </span>
          )}
          {(metrics?.queued ?? 0) > 0 && <span title="en cola">cola {metrics?.queued}</span>}
          {(metrics?.awaiting ?? 0) > 0 && <span title="esperando aprobación">OK {metrics?.awaiting}</span>}
          {def.role === 'resource' && <span title="consultas">{metrics?.accesses ?? 0} cons.</span>}
        </span>
      </div>
      <span className={`fnode__maturity${def.maturity === 'EN PRUEBA' ? ' is-trial' : ''}`}>{def.maturity}</span>
      <Handle type="source" position={Position.Right} id="s-r" />
      <Handle type="source" position={Position.Top} id="s-t" />
      <Handle type="source" position={Position.Bottom} id="s-b" />
    </div>
  );
});

const BandNode = memo(function BandNode({ data }: NodeProps<BandFlowNode>) {
  return (
    <div className="band">
      <span className="band__title">
        {data.code} / {data.name}
      </span>
      <Handle type="target" position={Position.Left} style={{ display: 'none', opacity: 0 }} id="b-l" />
      <Handle type="source" position={Position.Right} style={{ display: 'none', opacity: 0 }} id="b-r" />
    </div>
  );
});

const nodeTypes: NodeTypes = { factory: FactoryNode, band: BandNode };

function FlowAutofit({ viewId }: { viewId: string | null }) {
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  useEffect(() => {
    void fitView({ padding: 0.08 });
    const timers = [60, 250, 800].map((ms) => window.setTimeout(() => void fitView({ padding: 0.08 }), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [nodesInitialized, viewId, fitView]);
  useEffect(() => {
    const onResize = () => void fitView({ padding: 0.08 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitView]);
  return null;
}

interface Props {
  metrics: readonly NodeMetrics[];
  configs: Readonly<Record<string, NodeConfig>>;
  selectedNodeId: string | null;
  theme: Theme;
  onSelect: (nodeId: string | null) => void;
}

export function FactoryCanvas({ metrics, configs, selectedNodeId, theme, onSelect }: Props) {
  const [viewId, setViewId] = useState<string | null>(null);
  const view = GUIDED_VIEWS.find((v) => v.id === viewId) ?? null;
  const nodes = useMemo(
    () => buildFlowNodes(metrics, configs, selectedNodeId, view),
    [metrics, configs, selectedNodeId, view],
  );
  const edges = useMemo(() => buildFlowEdges(metrics, view), [metrics, view]);
  return (
    <div className="canvas" aria-label="Lienzo de la factoría">
      <nav className="guided" aria-label="Vistas guiadas">
        <span className="guided__title">Vistas guiadas</span>
        <button type="button" className={viewId === null ? 'is-active' : ''} aria-pressed={viewId === null} onClick={() => setViewId(null)}>
          Todo el sistema
        </button>
        {GUIDED_VIEWS.map((v, i) => (
          <button
            key={v.id}
            type="button"
            className={viewId === v.id ? 'is-active' : ''}
            aria-pressed={viewId === v.id}
            onClick={() => setViewId(viewId === v.id ? null : v.id)}
          >
            <span className="guided__num">{String(i + 1).padStart(2, '0')}</span> {v.label}
            <span className="guided__count">{v.nodes.size}</span>
          </button>
        ))}
      </nav>
      <ReactFlow<FlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08, minZoom: 0.15 }}
        minZoom={0.15}
        maxZoom={2.5}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable
        onNodeClick={(_, node) => onSelect(node.type === 'factory' ? node.id : null)}
        onPaneClick={() => onSelect(null)}
        proOptions={{ hideAttribution: true }}
        colorMode={theme}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="var(--grid-dot)" />
        <Controls showInteractive={false} position="top-left" />
        <FlowAutofit viewId={viewId} />
      </ReactFlow>
      <Legend />
    </div>
  );
}

function Legend() {
  const counts = categoryCounts();
  const [open, setOpen] = useState(false);
  return (
    <div className={open ? 'legend is-open' : 'legend'} aria-label="Leyenda">
      <button
        type="button"
        className="legend__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Leyenda {open ? '▾' : '▸'}
      </button>
      {open && (
      <>
      <div className="legend__group">
        {(Object.entries(CATEGORY_STYLE) as [NodeCategory, (typeof CATEGORY_STYLE)[NodeCategory]][]).map(([key, c]) => (
          <span key={key} className="legend__item">
            <span className="legend__swatch" style={{ borderColor: c.color }} />
            {c.label} <span className="legend__count">{counts[key]}</span>
          </span>
        ))}
      </div>
      <div className="legend__group">
        {Object.values(HEALTH_STYLE).map((h) => (
          <span key={h.label} className="legend__item">
            <span style={{ color: h.color }} aria-hidden>
              {h.icon}
            </span>
            {h.label}
          </span>
        ))}
        {Object.values(EDGE_STYLE).map((e) => (
          <span key={e.label} className="legend__item">
            <svg width="22" height="6" aria-hidden>
              <line x1="0" y1="3" x2="22" y2="3" stroke={e.color} strokeWidth="2" strokeDasharray={e.dashed ? '4 3' : undefined} />
            </svg>
            {e.label}
          </span>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

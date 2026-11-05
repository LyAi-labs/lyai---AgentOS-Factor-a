/**
 * AgentOS - Sistema de Control de Versiones para Agentes (Agent VCS)
 * Implementa snapshots, commits, ramas (branching) y rollback de configuraciones y código.
 */

import {
  PipelineNode,
  AgentCommit,
  AgentBranch,
  AgentNodeSnapshot,
} from '../types/pipeline';

export function createNodeSnapshot(nodes: PipelineNode[]): AgentNodeSnapshot[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    model: n.config.model,
    temperature: n.config.temperature,
    maxRetries: n.config.maxRetries,
    strictMode: n.config.strictMode,
    timeoutMs: n.config.timeoutMs,
    promptTemplate: `System prompt for ${n.name}: Role=${n.role}. Enforce strict invariants and schema contracts.`,
  }));
}

export function createAgentCommit(params: {
  message: string;
  author: string;
  branch: string;
  tag?: string;
  currentNodes: PipelineNode[];
  previousCommit?: AgentCommit;
}): AgentCommit {
  const hash = Math.random().toString(36).substring(2, 9);
  const snapshot = createNodeSnapshot(params.currentNodes);
  const now = Date.now();

  let modifiedCount = 0;
  if (params.previousCommit) {
    const prevMap = new Map(params.previousCommit.nodesSnapshot.map((n) => [n.id, n]));
    snapshot.forEach((curr) => {
      const prev = prevMap.get(curr.id);
      if (!prev || prev.model !== curr.model || prev.strictMode !== curr.strictMode) {
        modifiedCount++;
      }
    });
  } else {
    modifiedCount = snapshot.length;
  }

  return {
    hash,
    message: params.message,
    author: params.author,
    timestamp: now,
    branch: params.branch,
    tag: params.tag,
    nodesSnapshot: snapshot,
    changesSummary: {
      nodesModified: modifiedCount,
      nodesAdded: 0,
      nodesRemoved: 0,
      description: `${modifiedCount} agentes actualizados en rama [${params.branch}]`,
    },
  };
}

export function revertNodesToCommit(
  targetCommit: AgentCommit,
  currentNodes: PipelineNode[]
): PipelineNode[] {
  const snapshotMap = new Map(targetCommit.nodesSnapshot.map((s) => [s.id, s]));

  return currentNodes.map((node) => {
    const saved = snapshotMap.get(node.id);
    if (!saved) return node;

    return {
      ...node,
      config: {
        ...node.config,
        model: saved.model,
        temperature: saved.temperature,
        maxRetries: saved.maxRetries,
        strictMode: saved.strictMode,
        timeoutMs: saved.timeoutMs,
      },
    };
  });
}

export function computeCommitDiff(
  commitA: AgentCommit,
  commitB: AgentCommit
): {
  nodeId: string;
  nodeName: string;
  changes: { field: string; oldVal: unknown; newVal: unknown }[];
}[] {
  const mapA = new Map(commitA.nodesSnapshot.map((s) => [s.id, s]));
  const diffs: {
    nodeId: string;
    nodeName: string;
    changes: { field: string; oldVal: unknown; newVal: unknown }[];
  }[] = [];

  commitB.nodesSnapshot.forEach((bNode) => {
    const aNode = mapA.get(bNode.id);
    if (!aNode) return;

    const changes: { field: string; oldVal: unknown; newVal: unknown }[] = [];
    if (aNode.model !== bNode.model) {
      changes.push({ field: 'Modelo IA', oldVal: aNode.model || 'N/A', newVal: bNode.model || 'N/A' });
    }
    if (aNode.strictMode !== bNode.strictMode) {
      changes.push({ field: 'Modo Estricto', oldVal: aNode.strictMode, newVal: bNode.strictMode });
    }
    if (aNode.temperature !== bNode.temperature) {
      changes.push({ field: 'Temperatura', oldVal: aNode.temperature, newVal: bNode.temperature });
    }

    if (changes.length > 0) {
      diffs.push({
        nodeId: bNode.id,
        nodeName: bNode.name,
        changes,
      });
    }
  });

  return diffs;
}

export function getInitialBranchesAndCommits(nodes: PipelineNode[]): {
  branches: AgentBranch[];
  commits: AgentCommit[];
} {
  const baselineCommit: AgentCommit = {
    hash: 'a1b2c3d',
    message: 'v1.0.0 Baseline: Arquitectura Original de 5 Capas',
    author: 'Ignacio <ignacio@agentos.internal>',
    timestamp: Date.now() - 3600000 * 24 * 2,
    branch: 'main',
    tag: 'v1.0.0-baseline',
    nodesSnapshot: createNodeSnapshot(nodes),
    changesSummary: {
      nodesModified: 25,
      nodesAdded: 25,
      nodesRemoved: 0,
      description: 'Inicialización de los 25 agentes de la factoría.',
    },
  };

  const v2ProposalCommit: AgentCommit = {
    hash: 'f8e7d6c',
    message: 'v2.0.0-rc1: Integración de Self-Healing AST y Spec Concurrente',
    author: 'AI Architect <system@agentos.internal>',
    timestamp: Date.now() - 3600000 * 3,
    branch: 'feature/agentos-2.0',
    tag: 'v2.0.0-rc1',
    nodesSnapshot: createNodeSnapshot(nodes).map((s) => {
      if (s.id === 'builder') {
        return { ...s, model: 'Opus / Gemini Pro', strictMode: true };
      }
      if (s.id === 'seguridad') {
        return { ...s, strictMode: true, timeoutMs: 1500 };
      }
      return s;
    }),
    changesSummary: {
      nodesModified: 4,
      nodesAdded: 3,
      nodesRemoved: 0,
      description: 'Activación de contratos estrictos y árbitro de concurrencia.',
    },
  };

  const branches: AgentBranch[] = [
    { name: 'main', headCommitHash: baselineCommit.hash, isDefault: true, createdAt: Date.now() - 3600000 * 48 },
    { name: 'feature/agentos-2.0', headCommitHash: v2ProposalCommit.hash, createdAt: Date.now() - 3600000 * 4 },
    { name: 'experiment/zero-token-cache', headCommitHash: v2ProposalCommit.hash, createdAt: Date.now() - 3600000 * 1 },
  ];

  return {
    branches,
    commits: [v2ProposalCommit, baselineCommit],
  };
}

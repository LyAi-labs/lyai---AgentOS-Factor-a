/**
 * AgentOS - Libro Mayor de Tokens & Créditos de Agentes (Resource Token Ledger)
 * Registra y audita en tiempo real los 'Agent Credits' consumidos por cada nodo del grafo,
 * desglosa el costo financiero por modelo de IA y aplica límites estrictos de gasto por tarea
 * (Spending Limits per Task) para prevenir costes descontrolados (runaway costs).
 */

import {
  PipelineNode,
  PipelineTask,
  TaskSpendingLimitPolicy,
  AgentNodeCreditConsumption,
  ResourceTokenLedgerReport,
} from '../types/pipeline';

export const DEFAULT_SPENDING_POLICY: TaskSpendingLimitPolicy = {
  maxCreditsPerTask: 35, // 35 créditos = 35,000 tokens
  maxCostUsdPerTask: 0.065, // $0.065 USD por tarea
  actionOnLimitExceeded: 'throttle',
  autoEnforceStrictTokenCap: true,
};

/**
 * Calcula el reporte contable del Libro Mayor de Tokens (Resource Token Ledger)
 */
export function calculateResourceTokenLedger(
  nodes: PipelineNode[],
  tasks: PipelineTask[],
  customPolicy?: TaskSpendingLimitPolicy
): ResourceTokenLedgerReport {
  const policy = customPolicy || DEFAULT_SPENDING_POLICY;
  const now = Date.now();

  let totalTokens = 0;

  // 1. Calcular consumo por cada nodo
  const nodeConsumptions: AgentNodeCreditConsumption[] = nodes.map((node) => {
    const nodeTokens = node.metrics.tokensProcessed || 0;
    totalTokens += nodeTokens;

    // Tareas que pasaron por este nodo
    const tasksServed = tasks.filter(
      (t) => t.visitedNodes?.includes(node.id) || t.currentNodeId === node.id
    ).length;

    // Estimación de costo según el modelo
    const model = node.config.model || 'Claude / Gemini';
    let costPer1k = 0.0018;
    if (model.includes('Opus') || model.includes('Pro')) costPer1k = 0.0035;
    else if (model.includes('Flash') || model.includes('qwen')) costPer1k = 0.0006;

    const costUsd = Number(((nodeTokens / 1000) * costPer1k).toFixed(4));
    const creditsConsumed = Number((nodeTokens / 1000).toFixed(1));

    return {
      nodeId: node.id,
      nodeName: node.name,
      layer: node.layer,
      model,
      tokensConsumed: nodeTokens,
      creditsConsumed,
      costUsd,
      percentageOfTotal: 0,
      tasksServedCount: Math.max(node.metrics.successCount || 0, tasksServed),
    };
  });

  const aggregateTokens = Math.max(1, totalTokens);

  // Calcular porcentajes relativos
  nodeConsumptions.forEach((nc) => {
    nc.percentageOfTotal = Number(((nc.tokensConsumed / aggregateTokens) * 100).toFixed(1));
  });

  // Ordenar de mayor a menor consumo
  nodeConsumptions.sort((a, b) => b.tokensConsumed - a.tokensConsumed);

  const topConsumingNodeId = nodeConsumptions[0]?.nodeId || 'builder';
  const totalCredits = Number((totalTokens / 1000).toFixed(1));
  const totalCostUsd = Number(
    nodeConsumptions.reduce((acc, n) => acc + n.costUsd, 0).toFixed(3)
  );

  // 2. Auditar tareas para detectar riesgo de runaway costs frente al spending limit
  let runawayRiskCount = 0;
  tasks.forEach((task) => {
    const taskCredits = task.metrics.totalTokens / 1000;
    if (taskCredits >= policy.maxCreditsPerTask * 0.85) {
      runawayRiskCount++;
    }
  });

  // 3. Generar transacciones recientes del ledger
  const recentTransactions = tasks.slice(0, 10).map((task, idx) => {
    const creditsCharged = Number((task.metrics.totalTokens / 1000).toFixed(1));
    const isCapped = creditsCharged >= policy.maxCreditsPerTask;
    const isWarning = creditsCharged >= policy.maxCreditsPerTask * 0.85;

    return {
      id: `TX-${task.id}-${now - idx * 30000}`,
      timestamp: task.completedAt || task.startedAt || now - idx * 30000,
      nodeId: task.currentNodeId || 'builder',
      nodeName: nodes.find((n) => n.id === task.currentNodeId)?.name || 'Builder',
      taskId: task.id,
      creditsCharged,
      tokensCharged: task.metrics.totalTokens,
      status: isCapped
        ? ('capped' as const)
        : isWarning
        ? ('warning' as const)
        : ('settled' as const),
    };
  });

  return {
    totalTokensConsumed: totalTokens,
    totalAgentCredits: totalCredits,
    totalCostUsd,
    spendingPolicy: policy,
    nodeConsumptions,
    topConsumingNodeId,
    runawayRiskCount,
    recentTransactions,
  };
}

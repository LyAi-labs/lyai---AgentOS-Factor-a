/**
 * Pruebas unitarias para el motor de ejecución agéntico
 * Valida la máquina de estados, el enrutamiento de carriles y los cálculos de telemetría.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLanePath,
  createPipelineTask,
  stepTaskExecution,
  calculateTelemetry,
  generateArtifactForNode,
} from './engine';
import { INITIAL_NODES, INITIAL_EDGES } from './graphData';

test('calculateLanePath returns distinct routing topologies per lane', () => {
  const standardPath = calculateLanePath('standard');
  const expressPath = calculateLanePath('express');
  const urgentPath = calculateLanePath('urgent');

  // El carril estándar debe incluir análisis, spec_writer y tu_ok_ignacio
  assert.ok(standardPath.includes('spec_writer'));
  assert.ok(standardPath.includes('tu_ok_ignacio'));
  assert.ok(standardPath.length > expressPath.length);

  // El carril express omite spec detallada y se enfoca en carril_expres
  assert.ok(expressPath.includes('carril_expres'));
  assert.ok(!expressPath.includes('spec_writer'));

  // El carril urgente va por carril_urgencia directo a produccion
  assert.ok(urgentPath.includes('carril_urgencia'));
  assert.ok(urgentPath.includes('produccion'));
});

test('createPipelineTask initializes with valid queued state and correct path', () => {
  const task = createPipelineTask({
    title: 'Migrate to Redis Cluster',
    description: 'Zero-downtime cache shard migration',
    priority: 'P1_HIGH',
    lane: 'standard',
  });

  assert.equal(task.status, 'queued');
  assert.equal(task.progress, 0);
  assert.equal(task.currentNodeId, null);
  assert.equal(task.path[0], 'entradas');
  assert.equal(task.path[task.path.length - 1], 'produccion');
  assert.equal(task.visitedNodes.length, 0);
});

test('stepTaskExecution advances task through nodes step-by-step', () => {
  const task = createPipelineTask({
    title: 'Hotfix Test',
    description: 'Testing hotfix lane',
    priority: 'P0_URGENT',
    lane: 'urgent',
  });

  // Step 1: Queued -> First node (carril_urgencia)
  const step1 = stepTaskExecution(task, INITIAL_NODES);
  assert.equal(step1.task.status, 'running');
  assert.equal(step1.task.currentNodeId, 'carril_urgencia');
  assert.equal(step1.task.visitedNodes.length, 1);
  assert.equal(step1.isCompleted, false);

  // Step 2: carril_urgencia -> produccion (running in produccion)
  const step2 = stepTaskExecution(step1.task, step1.nodes);
  assert.equal(step2.task.currentNodeId, 'produccion');
  assert.equal(step2.isCompleted, false);

  // Step 3: produccion -> completed
  const step3 = stepTaskExecution(step2.task, step2.nodes);
  assert.equal(step3.isCompleted, true);
  assert.equal(step3.task.status, 'completed');
});

test('generateArtifactForNode produces correct artifacts at key milestones', () => {
  const task = createPipelineTask({
    title: 'Auth Refactor',
    description: 'Refactor auth',
    priority: 'P1_HIGH',
    lane: 'standard',
  });

  const specArt = generateArtifactForNode('spec_writer', task);
  assert.ok(specArt);
  assert.equal(specArt?.type, 'spec_doc');
  assert.ok(specArt?.content.includes('RFC-084'));

  const codeArt = generateArtifactForNode('builder', task);
  assert.ok(codeArt);
  assert.equal(codeArt?.type, 'code_diff');
  assert.ok(codeArt?.content.includes('diff --git'));

  const testArt = generateArtifactForNode('verificador', task);
  assert.ok(testArt);
  assert.equal(testArt?.type, 'test_report');
  assert.ok(testArt?.content.includes('DOCKER ISOLATION TEST SUMMARY'));
});

test('calculateTelemetry computes valid throughput and bottleneck metrics', () => {
  const task1 = createPipelineTask({
    title: 'Task 1',
    description: 'Desc',
    priority: 'P2_NORMAL',
    lane: 'standard',
  });
  task1.status = 'completed';
  task1.metrics.durationMs = 2000;

  const telemetry = calculateTelemetry([task1], INITIAL_NODES);
  assert.equal(telemetry.completedTasksCount, 1);
  assert.equal(telemetry.globalSuccessRate, 100);
  assert.ok(telemetry.avgCycleTimeMs > 0);
  assert.ok(Array.isArray(telemetry.bottlenecks));
});

// ==========================================
// TEST AGENT VERSION CONTROL SYSTEM (VCS)
// ==========================================
import { createNodeSnapshot, createAgentCommit, revertNodesToCommit, computeCommitDiff } from './vcs';

test('Agent VCS creates valid commits and allows rollback of configurations', () => {
  const snapshot = createNodeSnapshot(INITIAL_NODES);
  assert.equal(snapshot.length, INITIAL_NODES.length);

  const commitA = createAgentCommit({
    message: 'Baseline initial commit',
    author: 'Ignacio',
    branch: 'main',
    currentNodes: INITIAL_NODES,
  });
  assert.ok(commitA.hash);
  assert.equal(commitA.branch, 'main');

  // Modificar nodo
  const modifiedNodes = INITIAL_NODES.map((n) =>
    n.id === 'builder'
      ? { ...n, config: { ...n.config, model: 'Custom-FineTuned-Model', strictMode: true } }
      : n
  );

  const commitB = createAgentCommit({
    message: 'Updated builder model',
    author: 'Ignacio',
    branch: 'main',
    currentNodes: modifiedNodes,
    previousCommit: commitA,
  });

  const diffs = computeCommitDiff(commitA, commitB);
  assert.ok(diffs.length > 0);
  assert.equal(diffs[0].nodeId, 'builder');

  // Revertir a commitA
  const reverted = revertNodesToCommit(commitA, modifiedNodes);
  const revertedBuilder = reverted.find((n) => n.id === 'builder');
  assert.notEqual(revertedBuilder?.config.model, 'Custom-FineTuned-Model');
});

// ==========================================
// TEST SCENARIO SIMULATION ENGINE
// ==========================================
import { PRESET_SIMULATION_SCENARIOS, runSandboxSimulation } from './simulation';

test('Simulation Engine evaluates chaos conditions and triggers autonomous mitigations', () => {
  const injectionScenario = PRESET_SIMULATION_SCENARIOS.find((s) => s.id === 'sc-injection')!;
  const resultInjection = runSandboxSimulation(injectionScenario, INITIAL_NODES);
  assert.equal(resultInjection.status, 'quarantined');
  assert.ok(resultInjection.mitigationsTriggered.length > 0);
  assert.ok(resultInjection.chaosEventsLogged.some((e) => e.severity === 'critical'));

  const uiGlitchScenario = PRESET_SIMULATION_SCENARIOS.find((s) => s.id === 'sc-ui-glitch')!;
  const resultGlitch = runSandboxSimulation(uiGlitchScenario, INITIAL_NODES);
  assert.equal(resultGlitch.status, 'healed');
  assert.ok(resultGlitch.robustnessScore > 70);
});

// ==========================================
// TEST THROUGHPUT PROJECTIONS & D3 DATA ENGINE
// ==========================================
import { calculateLaneThroughput, generateCompletionTrendProjection } from './projections';

test('Throughput calculation and task completion trend projection generates valid S-curve and confidence bands', () => {
  const dummyTasks = [
    createPipelineTask({ title: 'Task 1', lane: 'standard', priority: 'P2_NORMAL', description: 'test' }),
    createPipelineTask({ title: 'Task 2', lane: 'express', priority: 'P1_HIGH', description: 'test' }),
    createPipelineTask({ title: 'Task 3', lane: 'urgent', priority: 'P0_URGENT', description: 'test' }),
  ];

  // Marcar una como completada
  dummyTasks[0].status = 'completed';
  dummyTasks[0].metrics.durationMs = 12000;

  const throughput = calculateLaneThroughput(dummyTasks, 1);
  assert.ok(throughput.standard);
  assert.ok(throughput.express);
  assert.ok(throughput.urgent);
  assert.ok(throughput.standard.currentVelocityTasksPerMin > 0);
  assert.ok(throughput.urgent.currentVelocityTasksPerMin > 0);

  // Proyección
  const report = generateCompletionTrendProjection(dummyTasks, 30, 1, 5);
  assert.ok(report.timeSeries.length > 0);
  assert.ok(report.overallVelocityTasksPerMin > 0);
  assert.equal(report.horizonMinutes, 30);
  assert.ok(report.completionEta);

  // Verificar que los puntos proyectados tienen cotas de confianza
  const futurePoint = report.timeSeries.find((pt) => pt.isProjected);
  assert.ok(futurePoint);
  assert.ok(futurePoint.p10Optimistic !== undefined);
  assert.ok(futurePoint.p50Expected !== undefined);
  assert.ok(futurePoint.p90Conservative !== undefined);
  assert.ok((futurePoint.p10Optimistic ?? 0) >= (futurePoint.p50Expected ?? 0));
  assert.ok((futurePoint.p50Expected ?? 0) >= (futurePoint.p90Conservative ?? 0));
});

// ==========================================
// TEST PIPELINE PERFORMANCE REPORT EXPORT
// ==========================================
import { generatePipelinePerformanceReport } from './exportReport';

test('Pipeline Performance Report export generates complete structured JSON schema with diagnostics', () => {
  const dummyTasks = [
    createPipelineTask({ title: 'Task Alpha', lane: 'standard', priority: 'P2_NORMAL', description: 'Alpha test' }),
    createPipelineTask({ title: 'Task Beta', lane: 'urgent', priority: 'P0_URGENT', description: 'Beta hotfix' }),
  ];
  dummyTasks[0].status = 'completed';
  dummyTasks[0].metrics.durationMs = 8400;

  const telemetry = calculateTelemetry(dummyTasks, INITIAL_NODES);

  const report = generatePipelinePerformanceReport({
    nodes: INITIAL_NODES,
    edges: INITIAL_EDGES,
    tasks: dummyTasks,
    telemetry,
    activityLogs: [
      { id: 'log-1', timestamp: Date.now(), level: 'info', source: 'Brain', layer: 1, message: 'Ready' },
    ],
    diagramMode: 'original',
    speedMultiplier: 1,
    engineStatus: 'running',
  });

  // Validaciones del esquema
  assert.ok(report.reportMetadata.reportId.startsWith('REP-'));
  assert.equal(report.reportMetadata.version, '2.4.0');
  assert.equal(report.executionGraph.totalNodes, INITIAL_NODES.length);
  assert.equal(report.executionGraph.totalEdges, INITIAL_EDGES.length);
  assert.equal(report.tasksCatalog.length, 2);
  assert.ok(report.laneBreakdown.standard);
  assert.ok(report.laneBreakdown.urgent);
  assert.ok(report.systemHealthDiagnostics.overallHealthScore >= 0);
  assert.ok(report.systemHealthDiagnostics.keyFindings.length > 0);
  assert.ok(report.systemHealthDiagnostics.optimizationRecommendations.length > 0);
});

// ==========================================
// TEST AGENT DENSITY HEAT-MAP & RESOURCE ALLOCATION MANAGER
// ==========================================
import {
  calculateAgentDensityMap,
  calculateLaneResourceConsumption,
  calculateNodeAutonomyIndex,
  calculateNodeLatencyTracker,
  analyzeTelemetryDrift,
  DEFAULT_LANE_BUDGETS,
} from './resourceManager';

test('Agent Density heat-map and Resource Allocation Manager compute node heat scores and lane budget consumption', () => {
  const dummyTasks = [
    createPipelineTask({ title: 'Heavy Build Task', lane: 'standard', priority: 'P1_HIGH', description: 'Heavy load' }),
    createPipelineTask({ title: 'Urgent Patch', lane: 'urgent', priority: 'P0_URGENT', description: 'SSH patch' }),
  ];
  dummyTasks[0].status = 'running';
  dummyTasks[0].currentNodeId = 'builder';
  dummyTasks[0].visitedNodes = ['entradas', 'filtro', 'analyze', 'spec_writer', 'builder'];

  const nodesWithLoad = INITIAL_NODES.map((n) =>
    n.id === 'builder' ? { ...n, status: 'running' as const } : n
  );

  // 1. Verificar Mapa de Densidad Térmica
  const densityMap = calculateAgentDensityMap(nodesWithLoad, dummyTasks);
  assert.equal(Object.keys(densityMap).length, INITIAL_NODES.length);
  assert.ok(densityMap['builder']);
  assert.ok(densityMap['builder'].densityScore >= 60);
  assert.ok(['hot', 'critical'].includes(densityMap['builder'].tier));

  // 2. Verificar Consumo de Recursos por Carril y Límites de Presupuesto
  const consumption = calculateLaneResourceConsumption(nodesWithLoad, dummyTasks, DEFAULT_LANE_BUDGETS, 2);
  assert.ok(consumption.standard);
  assert.ok(consumption.express);
  assert.ok(consumption.urgent);
  assert.ok(consumption.standard.cpuUsedUnits > 0);
  assert.ok(consumption.standard.memoryUsedMb > 0);
  assert.ok(consumption.standard.cpuUsagePercent > 0);

  // Probar reducción estricta de presupuesto para disparar estado over_budget
  const strictBudgets = {
    ...DEFAULT_LANE_BUDGETS,
    standard: {
      ...DEFAULT_LANE_BUDGETS.standard,
      cpuCapUnits: 120,
      memoryCapMb: 300,
    },
  };
  const throttledConsumption = calculateLaneResourceConsumption(nodesWithLoad, dummyTasks, strictBudgets, 2);
  assert.equal(throttledConsumption.standard.status, 'over_budget');
  assert.ok(throttledConsumption.standard.cpuUsagePercent > 100 || throttledConsumption.standard.memoryUsagePercent > 100);
});

// ==========================================
// TEST NODE AUTONOMY INDEX CALCULATION
// ==========================================
test('calculateNodeAutonomyIndex computes confidence score from historical success rate and p95 latency', () => {
  const highPerformingNode = {
    ...INITIAL_NODES[0],
    status: 'completed' as const,
    operationalState: 'HECHO' as const,
    metrics: {
      ...INITIAL_NODES[0].metrics,
      successCount: 180,
      errorCount: 0,
      p95LatencyMs: 95,
    },
  };

  const degradedNode = {
    ...INITIAL_NODES[0],
    status: 'error' as const,
    operationalState: 'EN PRUEBA' as const,
    metrics: {
      ...INITIAL_NODES[0].metrics,
      successCount: 8,
      errorCount: 6,
      p95LatencyMs: 2100,
    },
  };

  const highAutonomy = calculateNodeAutonomyIndex(highPerformingNode);
  const lowAutonomy = calculateNodeAutonomyIndex(degradedNode);

  assert.ok(highAutonomy.confidenceScore >= 88);
  assert.equal(highAutonomy.autonomyLevel, 'autonomous_l5');
  assert.equal(highAutonomy.successRatePercent, 100);

  assert.ok(lowAutonomy.confidenceScore < 60);
  assert.equal(lowAutonomy.autonomyLevel, 'human_in_loop_l2');
  assert.ok(highAutonomy.confidenceScore > lowAutonomy.confidenceScore);
});

// ==========================================
// TEST LIVE LATENCY TRACKER & SPARKLINE ENGINE
// ==========================================
test('calculateNodeLatencyTracker compares current execution vs historical average and detects latency spikes', () => {
  const baseNode = INITIAL_NODES.find((n) => n.id === 'spec_writer') || INITIAL_NODES[0];
  const nominalTracker = calculateNodeLatencyTracker(baseNode, 0, 0);

  assert.equal(nominalTracker.samples.length, 16);
  assert.ok(nominalTracker.historicalAvgMs > 0);
  assert.ok(nominalTracker.currentExecutionMs > 0);
  assert.equal(
    nominalTracker.deltaMs,
    nominalTracker.currentExecutionMs - nominalTracker.historicalAvgMs
  );

  // Simular un pico severo de latencia (+450ms)
  const spikedTracker = calculateNodeLatencyTracker(baseNode, 0, 450);
  assert.ok(spikedTracker.currentExecutionMs > nominalTracker.currentExecutionMs);
  assert.equal(spikedTracker.status, 'spike_detected');
  assert.ok(spikedTracker.samples[spikedTracker.samples.length - 1].isSpike);
  assert.ok(spikedTracker.spikeCount >= 1);
});

// ==========================================
// TEST PROACTIVE HEALTH MONITOR & DRIFT DETECTION
// ==========================================
test('analyzeTelemetryDrift detects error and latency drift, generates auto-logs, and suggests node for investigation', () => {
  const dummyTasks = [
    createPipelineTask({ title: 'Drift Task', lane: 'standard', priority: 'P1_HIGH', description: 'Drift check' }),
  ];

  const nodesWithDrift = INITIAL_NODES.map((n) =>
    n.id === 'verificador'
      ? {
          ...n,
          status: 'error' as const,
          metrics: {
            ...n.metrics,
            errorCount: 3,
            p95LatencyMs: 980,
          },
        }
      : n
  );

  const report = analyzeTelemetryDrift(nodesWithDrift, dummyTasks, 0);
  assert.equal(report.nodesScanned, INITIAL_NODES.length);
  assert.equal(report.status, 'critical_alert');
  assert.ok(report.activeAlerts.length > 0);
  assert.ok(report.topSuggestedNodeId);
  assert.ok(report.generatedLogs.length > 0);
  assert.equal(report.generatedLogs[0].source, 'Proactive Health Monitor');
  assert.ok(
    report.activeAlerts.some(
      (a) => a.nodeId === 'verificador' && a.driftType === 'error_frequency_drift'
    )
  );
});

// ==========================================
// TEST AGENT CHAOS MODE (PROBABILISTIC NON-DETERMINISTIC ENGINE)
// ==========================================
import { DEFAULT_AGENT_CHAOS_CONFIG, generateProbabilisticChaosPerturbations } from './simulation';

test('Agent Chaos Mode injects probabilistic non-deterministic latency and intermittent failures into sandbox nodes', () => {
  const activeChaosConfig = {
    ...DEFAULT_AGENT_CHAOS_CONFIG,
    enabled: true,
    failureProbabilityPercent: 65,
    artificialLatencyJitterMs: 900,
    pattern: 'cascading_degradation' as const,
    seed: 99,
  };

  const perturbations = generateProbabilisticChaosPerturbations(INITIAL_NODES, activeChaosConfig);
  assert.ok(perturbations.length > 0);
  assert.ok(perturbations.every((p) => p.injectedLatencyMs > 0));
  assert.ok(perturbations.some((p) => p.intermittentFailureTriggered));

  const scenario = PRESET_SIMULATION_SCENARIOS[0];
  const baselineResult = runSandboxSimulation(scenario, INITIAL_NODES);
  const chaosResult = runSandboxSimulation(scenario, INITIAL_NODES, activeChaosConfig);

  assert.equal(chaosResult.chaosModeActive, true);
  assert.ok(chaosResult.chaosPerturbations && chaosResult.chaosPerturbations.length > 0);
  assert.ok(chaosResult.durationMs > baselineResult.durationMs);
});


// ==========================================
// TEST BATCH SIMULATION ENGINE (SCALED THROUGHPUT STRESS-TESTING)
// ==========================================
import {
  DEFAULT_BATCH_QUEUE_PRESETS,
  runBatchScenarioSimulation,
} from './simulation';

test('Batch simulation engine executes queued scenarios with varied parameters and calculates aggregate throughput', () => {
  const batchQueue = [
    {
      ...DEFAULT_BATCH_QUEUE_PRESETS[0],
      concurrencyLevel: 3,
    },
    {
      ...DEFAULT_BATCH_QUEUE_PRESETS[1],
      concurrencyLevel: 5,
      customOverrides: { networkLatencyMs: 350 },
    },
  ];

  const summary = runBatchScenarioSimulation(batchQueue, INITIAL_NODES);

  assert.ok(summary.batchId.startsWith('BATCH-'));
  assert.equal(summary.totalScenarios, 2);
  assert.equal(summary.completedCount + summary.failedCount + summary.healedCount + summary.quarantinedCount, 2);
  assert.ok(summary.peakThroughputTasksPerMin > 0);
  assert.ok(summary.aggregateTokensConsumed > 0);
  assert.equal(summary.results.length, 2);
  assert.ok(summary.results[0].durationMs > 0);
  assert.ok(summary.results[1].durationMs > 0);
});

// ==========================================
// TEST TASK DEPENDENCY GRAPH (DAG WORKFLOW & PARALLEL EXECUTION)
// ==========================================
import {
  buildTaskDependencyGraph,
  advanceDependencyTask,
  DEFAULT_WORKFLOW_TASKS,
} from './taskDependencies';

test('Task dependency graph accurately models blocking, enabling, parallel groups, and critical path', () => {
  const dummyLiveTasks = [
    createPipelineTask({ title: 'Task Live', lane: 'standard', priority: 'P1_HIGH', description: 'desc' }),
  ];

  const graph = buildTaskDependencyGraph(dummyLiveTasks, INITIAL_NODES);

  assert.ok(graph.tasks.length >= 10);
  assert.ok(graph.links.length > 0);
  assert.ok(graph.criticalPathLengthMs > 0);
  assert.ok(graph.parallelCapacityUtilization > 0);
  assert.ok(graph.completedTasksCount > 0);

  // Verificar relación de dependencia directa: wf-task-2 depende de wf-task-1
  const task2 = graph.tasks.find((t) => t.id === 'wf-task-2');
  assert.ok(task2);
  assert.ok(task2.dependsOn.includes('wf-task-1'));

  // Avanzar una tarea ready a running y luego completed
  const initialReady = graph.tasks.find((t) => t.state === 'ready');
  if (initialReady) {
    const step1 = advanceDependencyTask(graph.tasks, initialReady.id);
    const updatedStep1 = step1.find((t) => t.id === initialReady.id);
    assert.equal(updatedStep1?.state, 'running');

    const step2 = advanceDependencyTask(step1, initialReady.id);
    const updatedStep2 = step2.find((t) => t.id === initialReady.id);
    assert.equal(updatedStep2?.state, 'completed');
  }
});

// ==========================================
// TEST SYSTEM SNAPSHOTS & DISASTER RECOVERY SERVICE
// ==========================================
import {
  createSystemSnapshot,
  computeGraphChecksum,
  SystemSnapshotsStorage,
} from './snapshots';

test('SystemSnapshots service creates valid 10m periodic snapshots with checksum and handles disaster recovery', () => {
  const dummyState = {
    nodes: INITIAL_NODES,
    edges: INITIAL_EDGES,
    tasks: [
      createPipelineTask({ title: 'Task Snap', lane: 'standard', priority: 'P1_HIGH', description: 'Snapshot test' }),
    ],
    telemetry: calculateTelemetry([], INITIAL_NODES),
    activityLogs: [],
    activeTaskId: 'TASK-HOTFIX-P0',
    engineStatus: 'running' as const,
    engineSpeed: 1,
  };

  const checksum = computeGraphChecksum(dummyState.nodes, dummyState.edges);
  assert.ok(checksum.startsWith('CHK-'));

  const snapshot = createSystemSnapshot(dummyState, {
    triggerType: 'cron_10m',
    triggerReason: 'Prueba unitaria de cron de 10 min',
  });

  assert.ok(snapshot.id.startsWith('SNAP-'));
  assert.equal(snapshot.triggerType, 'cron_10m');
  assert.equal(snapshot.totalNodes, INITIAL_NODES.length);
  assert.equal(snapshot.totalEdges, INITIAL_EDGES.length);
  assert.equal(snapshot.graphChecksum, checksum);
  assert.ok(snapshot.globalHealthScore >= 0);
  assert.equal(snapshot.statePayload.nodes.length, INITIAL_NODES.length);

  // Almacenamiento en tabla SystemSnapshots
  const storage = new SystemSnapshotsStorage();
  storage.saveSnapshot(snapshot);
  assert.equal(storage.count(), 1);

  const retrieved = storage.getById(snapshot.id);
  assert.ok(retrieved);
  assert.equal(retrieved.id, snapshot.id);

  const latest = storage.getLatest();
  assert.equal(latest?.id, snapshot.id);
});

// ==========================================
// TEST AGENT KNOWLEDGE BASE (SOURCE OF TRUTH)
// ==========================================
import {
  getAgentKnowledgeDoc,
  INITIAL_AGENT_KNOWLEDGE_DOCS,
} from './agentKnowledgeBase';

test('Agent Knowledge Base retrieves single source of truth markdown docs and generates fallback templates', () => {
  // 1. Doc pre-existente estructurado
  const brainDoc = getAgentKnowledgeDoc('brain', 'Brain', 'Master Context Controller', 'Wiki and design tokens');
  assert.equal(brainDoc.nodeId, 'brain');
  assert.ok(brainDoc.tags.includes('Context'));
  assert.ok(brainDoc.markdownContent.includes('Brain Master Controller'));
  assert.ok(brainDoc.markdownContent.includes('Claude 3.7 Sonnet'));

  // 2. Doc dinámico para nodo nuevo sin registro previo
  const customDoc = getAgentKnowledgeDoc('custom-worker', 'Custom Worker', 'Heavy Data Worker', 'Processes bulk logs');
  assert.equal(customDoc.nodeId, 'custom-worker');
  assert.ok(customDoc.markdownContent.includes('Custom Worker'));
  assert.ok(customDoc.markdownContent.includes('timeoutMs: 5000'));
});

// ==========================================
// TEST PREDICTIVE LOAD BALANCER
// ==========================================
import {
  calculateLaneQueuePressures,
  analyzePredictiveLoadBalancing,
  applyRedistributionSuggestion,
} from './loadBalancer';

test('Predictive Load Balancer calculates lane saturation, imbalance scores and generates valid redistribution suggestions', () => {
  // Simular una cola asimétrica: 6 tareas en 'standard' y 0 en 'express'
  const congestedTasks = [
    createPipelineTask({ title: 'Task S1', lane: 'standard', priority: 'P1_HIGH', description: 'test' }),
    createPipelineTask({ title: 'Task S2', lane: 'standard', priority: 'P2_NORMAL', description: 'test' }),
    createPipelineTask({ title: 'Task S3', lane: 'standard', priority: 'P2_NORMAL', description: 'test' }),
    createPipelineTask({ title: 'Task S4', lane: 'standard', priority: 'P1_HIGH', description: 'test' }),
    createPipelineTask({ title: 'Task S5', lane: 'standard', priority: 'P2_NORMAL', description: 'test' }),
    createPipelineTask({ title: 'Task S6', lane: 'standard', priority: 'P2_NORMAL', description: 'test' }),
  ];

  const pressures = calculateLaneQueuePressures(congestedTasks, INITIAL_NODES);
  assert.ok(pressures.standard.saturationRatio > 50);
  assert.equal(pressures.express.status, 'underutilized');

  const report = analyzePredictiveLoadBalancing(congestedTasks, INITIAL_NODES);
  assert.ok(report.imbalanceScore > 40);
  assert.ok(report.suggestions.length > 0);
  assert.equal(report.suggestions[0].sourceLane, 'standard');
  assert.equal(report.suggestions[0].suggestedTargetLane, 'express');
  assert.ok(report.totalPotentialThroughputGainPercent > 0);

  // Aplicar sugerencia
  const redistributed = applyRedistributionSuggestion(congestedTasks, congestedTasks[0].id, 'express');
  const targetTask = redistributed.find((t) => t.id === congestedTasks[0].id);
  assert.equal(targetTask?.lane, 'express');
});

// ==========================================
// TEST RESOURCE TOKEN LEDGER & SPENDING LIMIT POLICY
// ==========================================
import {
  calculateResourceTokenLedger,
  DEFAULT_SPENDING_POLICY,
} from './tokenLedger';

test('Resource Token Ledger accurately audits Agent Credits per node and detects runaway cost risks', () => {
  const dummyTasks = [
    createPipelineTask({ title: 'Task Heavy', lane: 'standard', priority: 'P1_HIGH', description: 'desc' }),
  ];
  dummyTasks[0].metrics.totalTokens = 42000; // 42 créditos (> 35 créditos de la política por defecto)

  const ledger = calculateResourceTokenLedger(INITIAL_NODES, dummyTasks, DEFAULT_SPENDING_POLICY);

  assert.ok(ledger.totalTokensConsumed > 0);
  assert.ok(ledger.totalAgentCredits > 0);
  assert.ok(ledger.totalCostUsd > 0);
  assert.ok(ledger.nodeConsumptions.length > 0);
  assert.ok(ledger.topConsumingNodeId);
  assert.equal(ledger.spendingPolicy.maxCreditsPerTask, 35);
  assert.ok(ledger.runawayRiskCount >= 1);
  assert.ok(ledger.recentTransactions.length > 0);
  assert.equal(ledger.recentTransactions[0].status, 'capped');
});

// ==========================================
// TEST NODE PERFORMANCE SUMMARY (24-HOUR SUCCESS/ERROR TREND)
// ==========================================
import { calculateNodePerformanceSummary } from './nodePerformanceSummary';

test('calculateNodePerformanceSummary computes 24-hour hourly trend points with success, error, and latency metrics', () => {
  const testNode = { ...INITIAL_NODES[0] };
  testNode.metrics = {
    ...testNode.metrics,
    successCount: 45,
    errorCount: 3,
    p95LatencyMs: 380,
    executionTimeMs: 240,
  };

  const summary = calculateNodePerformanceSummary(testNode, 1700000000000);

  assert.equal(summary.nodeId, testNode.id);
  assert.equal(summary.nodeName, testNode.name);
  assert.equal(summary.hourlyPoints.length, 24);
  assert.ok(summary.total24hExecutions > 0);
  assert.ok(summary.total24hSuccesses > 0);
  assert.ok(summary.overall24hSuccessRate >= 0 && summary.overall24hSuccessRate <= 100);
  assert.ok(summary.avgLatencyMs > 0);
  assert.ok(summary.peakErrorHour.length > 0);
  assert.ok(summary.peakVolumeHour.length > 0);
  assert.ok(['optimal', 'stable', 'degrading', 'investigate'].includes(summary.trendStatus));
  assert.ok(summary.trendMessage.length > 0);

  // Verificar integridad de cada punto horario
  const firstPoint = summary.hourlyPoints[0];
  assert.equal(typeof firstPoint.hour, 'string');
  assert.ok(firstPoint.totalExecutions >= firstPoint.successCount + firstPoint.errorCount);
  assert.ok(firstPoint.successRate >= 0 && firstPoint.successRate <= 100);
  assert.ok(firstPoint.avgLatencyMs > 0);
});

// ==========================================
// TEST 3D TRANSFORMATION LAYER & ELEVATION MATRIX
// ==========================================
import {
  calculateNode3DElevation,
  getClusterBaseElevation,
  calculateActivityIntensity,
  calculatePathStepElevation,
} from '../utils/node3dTransform';

test('3D Transformation Layer applies varying CSS translateZ based on activity intensity, path (0px to 100px), cluster level, and manual overrides', () => {
  const activePath = ['carril_urgencia', 'produccion'];

  // 1. Verificación en modo 'activity': nodo en ruta/activo (100px) vs nodo inactivo (0px)
  const activeResult = calculateNode3DElevation({
    nodeId: 'carril_urgencia',
    layer: 'layer4',
    isNodeExecuting: true,
    isPathStep: true,
    isInspected: false,
    isHovered: false,
    isBottleneck: false,
    mode: 'activity',
    activeTaskPathNodeIds: activePath,
  });

  const idleResult = calculateNode3DElevation({
    nodeId: 'filtro',
    layer: 'layer3',
    isNodeExecuting: false,
    isPathStep: false,
    isInspected: false,
    isHovered: false,
    isBottleneck: false,
    heatScore: 0,
    totalExecutions: 0,
    mode: 'activity',
    activeTaskPathNodeIds: activePath,
  });

  assert.equal(activeResult.zElevation, 100);
  assert.equal(activeResult.autoCalculatedZ, 100);
  assert.ok(activeResult.scaleBonus > 1);
  assert.ok(activeResult.groundShadow.blur > 30);
  assert.ok(activeResult.badgeLabel.includes('Z+100px'));
  assert.equal(idleResult.zElevation, 0);
  assert.equal(idleResult.scaleBonus, 1);

  // 2. Verificación de profundidades crecientes en ruta (0px -> 50px -> 75px -> 100px)
  const threeStepPath = ['entradas', 'analyze', 'produccion'];
  assert.equal(
    calculatePathStepElevation({
      nodeId: 'entradas',
      activeTaskPathNodeIds: threeStepPath,
      isNodeExecuting: false,
    }),
    50
  );
  assert.equal(
    calculatePathStepElevation({
      nodeId: 'analyze',
      activeTaskPathNodeIds: threeStepPath,
      isNodeExecuting: false,
    }),
    75
  );
  assert.equal(
    calculatePathStepElevation({
      nodeId: 'produccion',
      activeTaskPathNodeIds: threeStepPath,
      isNodeExecuting: false,
    }),
    100
  );

  // 3. Verificación de Override Manual de translateZ desde NodeInspectorModal
  const overriddenResult = calculateNode3DElevation({
    nodeId: 'filtro',
    layer: 'layer3',
    isNodeExecuting: false,
    isPathStep: false,
    isInspected: true,
    isHovered: false,
    isBottleneck: false,
    mode: 'activity',
    activeTaskPathNodeIds: activePath,
    manualZOverride: 140,
  });
  assert.equal(overriddenResult.isManualOverride, true);
  assert.equal(overriddenResult.zElevation, 140);
  assert.equal(overriddenResult.autoCalculatedZ, 65);
  assert.ok(overriddenResult.badgeLabel.includes('Z+140px MANUAL'));

  // 4. Verificación del Toggle de Modo Edición de Grafos (isEditMode3DDisabled)
  const editModeResult = calculateNode3DElevation({
    nodeId: 'carril_urgencia',
    layer: 'layer4',
    isNodeExecuting: true,
    isPathStep: true,
    isInspected: true,
    isHovered: false,
    isBottleneck: false,
    mode: 'activity',
    activeTaskPathNodeIds: activePath,
    isEditMode3DDisabled: true,
  });
  assert.equal(editModeResult.zElevation, 0);
  assert.equal(editModeResult.autoCalculatedZ, 100);

  // 5. Verificación en modo 'cluster': capas C1 a C5 tienen cotas Z crecientes
  const c1Elevation = getClusterBaseElevation('layer1');
  const c3Elevation = getClusterBaseElevation('layer3');
  const c5Elevation = getClusterBaseElevation('layer5');
  assert.ok(c1Elevation < c3Elevation);
  assert.ok(c3Elevation < c5Elevation);

  const clusterResultC5 = calculateNode3DElevation({
    nodeId: 'produccion',
    layer: 'layer5',
    isNodeExecuting: false,
    isPathStep: false,
    isInspected: false,
    isHovered: false,
    isBottleneck: false,
    mode: 'cluster',
  });
  assert.equal(clusterResultC5.zElevation, 65);
  assert.ok(clusterResultC5.badgeLabel.includes('CLÚSTER C5'));

  // 6. Intensidad de actividad calculada correctamente
  const intensityExecuting = calculateActivityIntensity({
    isNodeExecuting: true,
    isPathStep: false,
    isBottleneck: false,
  });
  assert.equal(intensityExecuting, 100);
});


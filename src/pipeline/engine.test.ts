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





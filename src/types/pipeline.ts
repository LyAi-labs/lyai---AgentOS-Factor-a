/**
 * AgentOS - Factoría de Desarrollo Agéntico
 * Definiciones de Tipos y Modelos de Dominio
 */

export type NodeLayer = 1 | 2 | 3 | 4 | 5;

export type NodeType =
  | 'brain'
  | 'security'
  | 'scanner'
  | 'agent'
  | 'gateway'
  | 'verifier'
  | 'vault'
  | 'deployer'
  | 'benchmark';

export type LegendCategory =
  | 'user_ui'        // Cyan outline
  | 'agent_logic'    // Green outline
  | 'policy'         // Red outline
  | 'tool_action'    // Orange outline
  | 'context_trace'  // Purple outline
  | 'cloud_service'  // Yellow outline
  | 'external_system'; // Gray outline

export type OperationalState = 'HECHO' | 'EN PRUEBA';

export type DiagramMode = 'original' | 'proposed';

export type NodeStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'warning'
  | 'error'
  | 'bypassed';

export type TaskPriority = 'P0_URGENT' | 'P1_HIGH' | 'P2_NORMAL' | 'P3_LOW';

export type TaskLane = 'standard' | 'express' | 'urgent';

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused';

export interface NodeMetrics {
  executionTimeMs: number;
  tokensProcessed: number;
  memoryMb: number;
  errorCount: number;
  successCount: number;
  queueDepth: number;
  p95LatencyMs: number;
}

export interface NodeConfig {
  model?: string;
  maxRetries?: number;
  timeoutMs?: number;
  strictMode?: boolean;
  temperature?: number;
  concurrencyLimit?: number;
}

export interface PipelineNode {
  id: string;
  name: string;
  label: string;
  subtitle?: string;
  engineTag?: string;
  category?: LegendCategory;
  operationalState?: OperationalState;
  layer: NodeLayer;
  type: NodeType;
  status: NodeStatus;
  x: number;
  y: number;
  width?: number;
  height?: number;
  description: string;
  role: string;
  config: NodeConfig;
  metrics: NodeMetrics;
  currentTaskId?: string;
  currentProgress?: number;
  lastLog?: string;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  lane: 'standard' | 'express' | 'urgent' | 'telemetry' | 'security';
  active?: boolean;
  packetProgress?: number; // 0 to 1 for animated packet particle
}

export interface TaskHistoryItem {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  status: 'entered' | 'executing' | 'completed' | 'warning' | 'error';
  durationMs: number;
  log: string;
  tokens?: number;
  evidenceSnippet?: string;
}

export interface TaskArtifact {
  id: string;
  type: 'code_diff' | 'spec_doc' | 'test_report' | 'security_audit' | 'ui_snapshot';
  title: string;
  nodeId: string;
  timestamp: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface PipelineTask {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  lane: TaskLane;
  status: TaskStatus;
  progress: number; // 0 to 100
  currentNodeId: string | null;
  path: string[];
  visitedNodes: string[];
  history: TaskHistoryItem[];
  artifacts: TaskArtifact[];
  metrics: {
    totalTokens: number;
    durationMs: number;
    costUsd: number;
    testPassingRate?: number;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  layer: NodeLayer;
  message: string;
  taskId?: string;
}

export interface TelemetrySummary {
  activeTasksCount: number;
  completedTasksCount: number;
  failedTasksCount: number;
  globalSuccessRate: number; // percentage
  avgCycleTimeMs: number;
  p95CycleTimeMs: number;
  totalTokensUsed: number;
  throughputPerHour: number;
  estimatedCostUsd: number;
  bottlenecks: { nodeId: string; nodeName: string; queueDepth: number; avgLatencyMs: number }[];
}

export interface PipelineState {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  tasks: PipelineTask[];
  activeTaskId: string | null;
  activityLogs: ActivityLogEntry[];
  telemetry: TelemetrySummary;
  engineStatus: 'idle' | 'running' | 'paused';
  speed: number; // 0.5, 1, 2, 5
}

// ==========================================
// SISTEMA DE CONTROL DE VERSIONES (AGENT VCS)
// ==========================================

export interface AgentNodeSnapshot {
  id: string;
  name: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  strictMode?: boolean;
  timeoutMs?: number;
  promptTemplate?: string;
}

export interface AgentCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  branch: string;
  tag?: string;
  nodesSnapshot: AgentNodeSnapshot[];
  changesSummary: {
    nodesModified: number;
    nodesAdded: number;
    nodesRemoved: number;
    description: string;
  };
}

export interface AgentBranch {
  name: string;
  headCommitHash: string;
  isDefault?: boolean;
  createdAt: number;
}

// ==========================================
// MOTOR DE SIMULACIÓN Y SANDBOX DE ESCENARIOS
// ==========================================

export interface SimulationConditions {
  networkLatencyMs: number;       // 0 a 1500ms
  packetLossPercent: number;      // 0 a 30%
  rateLimitFailureRate: number;   // 0 a 50% (simula HTTP 429)
  promptInjectionAttack: boolean; // Inyecta prompt malicioso
  uiVisualGlitch: boolean;        // Inyecta regresión en DOM/CSS
  backendCrashProbability: number;// 0 a 40% (simula falla en contenedor)
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  lane: TaskLane;
  priority: TaskPriority;
  targetTaskTitle: string;
  conditions: SimulationConditions;
  expectedOutcome: 'pass_nominal' | 'self_healed' | 'security_blocked' | 'rolled_back' | 'recovered_backoff';
}

export type ChaosFailurePattern =
  | 'burst_intermittent'
  | 'cascading_degradation'
  | 'random_byzantine'
  | 'latency_brownout';

export interface AgentChaosConfig {
  enabled: boolean;
  failureProbabilityPercent: number; // 0 a 80% probabilidad de fallo intermitente por nodo
  artificialLatencyJitterMs: number; // 0 a 2500ms de latencia sintética no-determinista
  pattern: ChaosFailurePattern;
  targetNodeIds: string[];           // Vacío = selección estocástica sobre todo el grafo
  seed?: number;                     // Semilla opcional para pruebas deterministas
}

export interface NodeChaosPerturbation {
  nodeId: string;
  nodeName: string;
  layer: NodeLayer;
  injectedLatencyMs: number;
  intermittentFailureTriggered: boolean;
  failurePatternApplied: ChaosFailurePattern;
  recoveryAction: string;
  resilienceImpactScore: number;
}

export interface SimulationResult {
  scenarioId: string;
  timestamp: number;
  status: 'passed' | 'failed' | 'healed' | 'quarantined';
  durationMs: number;
  tokensConsumed: number;
  robustnessScore: number; // 0 - 100
  mitigationsTriggered: string[];
  chaosEventsLogged: {
    nodeId: string;
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    handled: boolean;
  }[];
  chaosModeActive?: boolean;
  chaosPerturbations?: NodeChaosPerturbation[];
}

// ==========================================
// PROYECCIÓN D3 DE THROUGHPUT Y FINALIZACIÓN DE TAREAS
// ==========================================

export interface LaneThroughputMetrics {
  lane: TaskLane;
  laneName: string;
  activeTasks: number;
  completedTasks: number;
  avgDurationSec: number;
  currentVelocityTasksPerMin: number;
  projectedPerHour: number;
  saturationRate: number; // 0 a 100%
  estimatedBacklogDrainMinutes: number;
  color: string;
}

export interface TimePointProjection {
  minuteOffset: number; // -15, -10, -5, 0 (ahora), +5, +10, +15, +30, +45, +60
  timestamp: number;
  isProjected: boolean;
  standardCompleted: number;
  expressCompleted: number;
  urgentCompleted: number;
  totalCompleted: number;
  p10Optimistic?: number;
  p50Expected?: number;
  p90Conservative?: number;
  remainingBacklog: number;
}

export interface ThroughputProjectionReport {
  generatedAt: number;
  horizonMinutes: number;
  overallVelocityTasksPerMin: number;
  totalPendingTasks: number;
  estimatedFullCompletionMinutes: number;
  completionEta: string;
  lanes: Record<TaskLane, LaneThroughputMetrics>;
  timeSeries: TimePointProjection[];
  targetBacklogLine: number;
  leadTimeDistribution: {
    durationBinSec: number;
    binLabel: string;
    probability: number;
    taskCount: number;
  }[];
}

// ==========================================
// MAPA DE CALOR DE DENSIDAD DE AGENTES (HEAT-MAP)
// ==========================================

export type HeatTier = 'cold' | 'warm' | 'hot' | 'critical';

export interface NodeDensityMetrics {
  nodeId: string;
  nodeName: string;
  layer: NodeLayer;
  taskFrequency: number;       // Tareas que han transitado o están activas en el nodo
  tokensIntensity: number;     // 0 a 100
  latencyIntensity: number;    // 0 a 100
  densityScore: number;        // 0 a 100 (índice térmico compuesto)
  tier: HeatTier;
  tierLabel: string;
  heatBorderColor: string;
  heatGlowColor: string;
  heatBgColor: string;
  isBottleneck: boolean;
}

// ==========================================
// GESTOR DE ASIGNACIÓN DE RECURSOS POR CARRIL (RESOURCE ALLOCATION)
// ==========================================

export interface LaneBudgetCap {
  lane: TaskLane;
  laneLabel: string;
  cpuCapUnits: number;      // Unidades de cómputo mCPU (ej. 200 a 2400 mCPU)
  memoryCapMb: number;      // Límite de RAM en MB (ej. 512 a 8192 MB)
  autoThrottle: boolean;    // Limitar velocidad automáticamente al superar el 90%
  burstAllowed: boolean;    // Permitir ráfagas temporales (+20% margen)
}

export interface LaneResourceConsumption {
  lane: TaskLane;
  laneLabel: string;
  budget: LaneBudgetCap;
  cpuUsedUnits: number;
  memoryUsedMb: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  combinedUsagePercent: number;
  activeTasksInLane: number;
  assignedNodesCount: number;
  status: 'optimal' | 'elevated' | 'critical' | 'over_budget';
  color: string;
}

// ==========================================
// ÍNDICE DE AUTONOMÍA DEL NODO (NODE AUTONOMY INDEX)
// ==========================================

export type AutonomyLevel =
  | 'autonomous_l5'
  | 'high_confidence_l4'
  | 'supervised_l3'
  | 'human_in_loop_l2';

export interface NodeAutonomyIndex {
  nodeId: string;
  nodeName: string;
  confidenceScore: number;        // 0 a 100 (Índice compuesto de confianza y autonomía)
  reliabilityScore: number;       // 0 a 100 (Tasa histórica de éxito y penalización por errores)
  latencyEfficiencyScore: number; // 0 a 100 (Eficiencia de latencia p95 frente a SLA/timeout)
  stabilityScore: number;         // 0 a 100 (Gobernanza determinista, modo estricto y estado operativo)
  successRatePercent: number;     // Porcentaje histórico exacto de éxito (0 - 100%)
  slaCompliancePercent: number;   // Margen de cumplimiento de SLA de latencia (0 - 100%)
  autonomyLevel: AutonomyLevel;
  levelLabel: string;
  badgeColor: string;
  recommendation: string;
}

// ==========================================
// RASTREADOR DE LATENCIA EN VIVO (LIVE LATENCY TRACKER & SPARKLINES)
// ==========================================

export interface LatencySamplePoint {
  sampleIndex: number;
  timestampOffsetSec: number; // Ej. -45s ... 0s (ahora)
  latencyMs: number;
  isSpike: boolean;           // true si supera el umbral de pico (> 1.3x del promedio histórico)
}

export interface NodeLatencyTrackerData {
  nodeId: string;
  nodeName: string;
  currentExecutionMs: number;
  historicalAvgMs: number;
  p95LatencyMs: number;
  spikeThresholdMs: number;
  deltaMs: number;            // currentExecutionMs - historicalAvgMs
  deltaPercent: number;       // Variación porcentual frente al promedio histórico
  peakLatencyMs: number;
  minLatencyMs: number;
  jitterMs: number;           // Variabilidad media (ms)
  spikeCount: number;
  status: 'nominal' | 'elevated' | 'spike_detected';
  statusLabel: string;
  samples: LatencySamplePoint[];
}

// ==========================================
// MONITOR PROACTIVO DE SALUD (PROACTIVE HEALTH MONITOR & DRIFT DETECTOR)
// ==========================================

export type DriftAlertType =
  | 'latency_spike_drift'
  | 'error_frequency_drift'
  | 'thermal_bottleneck_drift'
  | 'autonomy_degradation_drift';

export type DriftSeverity = 'warning' | 'critical';

export interface ProactiveDriftAlert {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  layer: NodeLayer;
  driftType: DriftAlertType;
  severity: DriftSeverity;
  metricLabel: string;
  currentValue: string;
  thresholdValue: string;
  message: string;
  suggestedAction: string;
}

export interface ProactiveHealthReport {
  scannedAt: number;
  nodesScanned: number;
  overallHealthScore: number; // 0 a 100
  status: 'healthy' | 'drift_detected' | 'critical_alert';
  activeAlerts: ProactiveDriftAlert[];
  topSuggestedNodeId: string | null;
  topSuggestedNodeName: string | null;
  generatedLogs: ActivityLogEntry[];
}







// ==========================================
// SIMULACIÓN EN LOTE (BATCH SIMULATION ENGINE)
// ==========================================
export interface BatchScenarioQueueItem {
  id: string;
  scenarioId: string;
  scenarioName: string;
  lane: TaskLane;
  priority: TaskPriority;
  weight: number; // Factor multiplicador o carga relativa
  concurrencyLevel: number; // Cuántas tareas paralelas simula este item
  customOverrides?: Partial<SimulationConditions>;
  customChaos?: Partial<AgentChaosConfig>;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: SimulationResult;
}

export interface BatchSimulationRunSummary {
  batchId: string;
  startedAt: number;
  completedAt?: number;
  totalScenarios: number;
  completedCount: number;
  failedCount: number;
  healedCount: number;
  quarantinedCount: number;
  totalSimulatedDurationSec: number;
  aggregateTokensConsumed: number;
  averageRobustnessScore: number;
  peakThroughputTasksPerMin: number;
  saturationBottleneckNodeId?: string;
  results: Array<{
    itemId: string;
    scenarioName: string;
    lane: TaskLane;
    durationMs: number;
    tokensConsumed: number;
    robustnessScore: number;
    status: 'passed' | 'failed' | 'healed' | 'quarantined';
    chaosActive: boolean;
    mitigationsCount: number;
  }>;
}

// ==========================================
// VISUALIZACIÓN DE DEPENDENCIAS DE TAREAS (TASK DEPENDENCY GRAPH)
// ==========================================
export type DependencyType = 'blocks' | 'enables' | 'parallel_with' | 'validates';
export type DependencyExecutionState = 'blocked' | 'ready' | 'running' | 'completed' | 'failed';

export interface WorkflowTaskNode {
  id: string;
  title: string;
  lane: TaskLane;
  priority: TaskPriority;
  agentNodeId: string;
  agentNodeName: string;
  layer: NodeLayer;
  state: DependencyExecutionState;
  progress: number;
  durationMs: number;
  tokens: number;
  dependsOn: string[]; // IDs de tareas que deben completarse antes de habilitar esta
  blocks: string[];    // IDs de tareas que esperan a que esta se complete
  parallelGroup?: string; // Tareas que pueden ejecutarse concurrentemente
  criticalPath: boolean;
}

export interface WorkflowDependencyLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: DependencyType;
  label?: string;
  active: boolean; // Si la dependencia está activa o liberada
}

export interface TaskDependencyGraphData {
  tasks: WorkflowTaskNode[];
  links: WorkflowDependencyLink[];
  criticalPathLengthMs: number;
  parallelCapacityUtilization: number; // Porcentaje de paralelización efectiva
  blockedTasksCount: number;
  readyTasksCount: number;
  runningTasksCount: number;
  completedTasksCount: number;
}

// ==========================================
// BALANCEADOR PREDICTIVO DE CARGA (PREDICTIVE LOAD BALANCER)
// ==========================================
export interface LaneQueuePressure {
  lane: TaskLane;
  laneLabel: string;
  queuedTasksCount: number;
  runningTasksCount: number;
  totalPendingTasks: number;
  estimatedQueueTimeSec: number;
  saturationRatio: number; // 0 a 100%
  status: 'underutilized' | 'balanced' | 'approaching_saturation' | 'congested';
  statusColor: string;
}

export interface PredictiveRedistributionSuggestion {
  id: string;
  taskId: string;
  taskTitle: string;
  sourceLane: TaskLane;
  suggestedTargetLane: TaskLane;
  priority: TaskPriority;
  estimatedLatencySavingSec: number;
  throughputGainPercent: number;
  reason: string;
  confidenceScore: number; // 0 - 100%
}

export interface PredictiveLoadBalancerReport {
  timestamp: number;
  globalQueueDepth: number;
  imbalanceScore: number; // 0 a 100% (0 = perfectamente equilibrado, 100 = máxima asimetría)
  systemStatus: 'optimal' | 'imbalanced' | 'critical_congestion';
  lanePressures: Record<TaskLane, LaneQueuePressure>;
  suggestions: PredictiveRedistributionSuggestion[];
  totalPotentialThroughputGainPercent: number;
  activeAutoRebalancing: boolean;
}

// ==========================================
// LIBRO MAYOR DE TOKENS & CRÉDITOS DE AGENTES (RESOURCE TOKEN LEDGER)
// ==========================================
export interface AgentNodeCreditConsumption {
  nodeId: string;
  nodeName: string;
  layer: NodeLayer;
  model: string;
  tokensConsumed: number;
  creditsConsumed: number; // 1 crédito = 1000 tokens (normalizado)
  costUsd: number;
  percentageOfTotal: number;
  tasksServedCount: number;
}

export interface TaskSpendingLimitPolicy {
  maxCreditsPerTask: number; // Límite de créditos por tarea (ej. 25 créditos = 25k tokens)
  maxCostUsdPerTask: number; // Límite en USD (ej. $0.05)
  actionOnLimitExceeded: 'warn' | 'throttle' | 'quarantine';
  autoEnforceStrictTokenCap: boolean;
}

export interface ResourceTokenLedgerReport {
  totalTokensConsumed: number;
  totalAgentCredits: number; // Total créditos consumidos
  totalCostUsd: number;
  spendingPolicy: TaskSpendingLimitPolicy;
  nodeConsumptions: AgentNodeCreditConsumption[];
  topConsumingNodeId: string;
  runawayRiskCount: number; // Tareas acercándose o superando el límite de créditos
  recentTransactions: Array<{
    id: string;
    timestamp: number;
    nodeId: string;
    nodeName: string;
    taskId: string;
    creditsCharged: number;
    tokensCharged: number;
    status: 'settled' | 'capped' | 'warning';
  }>;
}

// ==========================================
// RESUMEN DE RENDIMIENTO DE NODO (NODE PERFORMANCE SUMMARY)
// ==========================================
export interface HourlyPerformancePoint {
  hourIndex: number; // 0 to 23 (de 24h atrás a hora actual)
  hour: string; // ej. "14:00" o "T-10h"
  timestamp: number;
  successCount: number;
  errorCount: number;
  totalExecutions: number;
  successRate: number; // 0 a 100%
  avgLatencyMs: number;
}

export interface NodePerformanceSummary {
  nodeId: string;
  nodeName: string;
  total24hExecutions: number;
  total24hSuccesses: number;
  total24hErrors: number;
  overall24hSuccessRate: number;
  p95LatencyMs: number;
  avgLatencyMs: number;
  peakErrorHour: string;
  peakVolumeHour: string;
  trendStatus: 'optimal' | 'stable' | 'degrading' | 'investigate';
  trendMessage: string;
  hourlyPoints: HourlyPerformancePoint[];
}

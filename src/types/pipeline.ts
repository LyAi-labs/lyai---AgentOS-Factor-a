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




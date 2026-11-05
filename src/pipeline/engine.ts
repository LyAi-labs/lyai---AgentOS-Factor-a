/**
 * AgentOS - Factoría de Desarrollo Agéntico
 * Motor Puro de Ejecución de Pipeline y Máquina de Estados
 */

import {
  PipelineTask,
  PipelineNode,
  TaskLane,
  TaskPriority,
  TaskArtifact,
  ActivityLogEntry,
  TelemetrySummary,
} from '../types/pipeline';

/**
 * Resuelve la ruta canónica en el grafo según el carril operativo.
 */
export function calculateLanePath(lane: TaskLane): string[] {
  switch (lane) {
    case 'express':
      return [
        'entradas',
        'filtro',
        'analyze',
        'carril_expres',
        'approver',
        'tu_ok_ignacio',
        'produccion',
      ];
    case 'urgent':
      return [
        'carril_urgencia',
        'produccion',
      ];
    case 'standard':
    default:
      return [
        'entradas',
        'filtro',
        'analyze',
        'spec_writer',
        'builder',
        'ui',
        'verificador',
        'codigo',
        'approver',
        'evidencia_visual',
        'router',
        'tu_ok_ignacio',
        'main_local',
        'produccion',
      ];
  }
}

/**
 * Crea una nueva tarea de desarrollo agéntico
 */
export function createPipelineTask(params: {
  id?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  lane: TaskLane;
}): PipelineTask {
  const path = calculateLanePath(params.lane);
  const now = Date.now();
  return {
    id: params.id || `TASK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    title: params.title,
    description: params.description,
    priority: params.priority,
    lane: params.lane,
    status: 'queued',
    progress: 0,
    currentNodeId: null,
    path,
    visitedNodes: [],
    history: [],
    artifacts: [],
    metrics: {
      totalTokens: 0,
      durationMs: 0,
      costUsd: 0,
      testPassingRate: 100,
    },
    createdAt: now,
  };
}

/**
 * Genera artefactos técnicos representativos según el nodo alcanzado
 */
export function generateArtifactForNode(
  nodeId: string,
  task: PipelineTask
): TaskArtifact | null {
  const timestamp = Date.now();
  if (nodeId === 'spec_writer') {
    return {
      id: `art-spec-${task.id}`,
      type: 'spec_doc',
      title: `RFC & Blueprint: ${task.title}`,
      nodeId,
      timestamp,
      content: `# RFC-084: ${task.title}
## 1. Contexto & Objetivos
- **Prioridad**: ${task.priority} | **Carril**: ${task.lane.toUpperCase()}
- **Descripción**: ${task.description}

## 2. Contrato de Interfaz y Cambios
\`\`\`typescript
export interface SecurePayload {
  sessionToken: string;
  nonce: number;
  claims: Record<string, unknown>;
  signature: Uint8Array;
}
\`\`\`

## 3. Plan de Mitigación de Riesgos
- Sanitización de memoria volátil antes de serializar hacia el bus de eventos.
- Invariante de idempotencia garantizada mediante clave de deduplicación SHA-256.`,
    };
  }

  if (nodeId === 'builder') {
    return {
      id: `art-code-${task.id}`,
      type: 'code_diff',
      title: `Unified Diff: ${task.title}`,
      nodeId,
      timestamp,
      content: `diff --git a/src/core/vault.ts b/src/core/vault.ts
index e69de29..4b825dc 100644
--- a/src/core/vault.ts
+++ b/src/core/vault.ts
@@ -24,7 +24,14 @@ export class TokenVault {
-    const rawKey = this.cache.get(key);
-    return decrypt(rawKey);
+    const cached = this.lru.get(key);
+    if (cached && !cached.isExpired()) {
+      return cached.unwrap();
+    }
+    const entry = await this.storage.loadAtomic(key);
+    this.lru.set(key, entry, { ttl: 3600 });
+    return entry.unwrap();
   }
 }`,
    };
  }

  if (nodeId === 'verificador') {
    return {
      id: `art-test-${task.id}`,
      type: 'test_report',
      title: `Docker Test Runner: ${task.title}`,
      nodeId,
      timestamp,
      content: `DOCKER ISOLATION TEST SUMMARY
─────────────────────────────────────────────────
✔ test/vault.test.ts (14 assertions) - 24ms
✔ test/concurrency.test.ts (8 assertions) - 110ms
✔ test/security_sast.test.ts (22 assertions) - 48ms
✔ test/edge_cases.test.ts (9 assertions) - 16ms
─────────────────────────────────────────────────
Total: 53 passed, 0 failed, 0 skipped
Passing Rate: 100.0%
Coverage: Stmts 98.4%, Branch 95.2%, Funcs 100%`,
    };
  }

  if (nodeId === 'evidencia_visual') {
    return {
      id: `art-ui-${task.id}`,
      type: 'ui_snapshot',
      title: `Playwright UI Visual Evidence: ${task.title}`,
      nodeId,
      timestamp,
      content: `PLAYWRIGHT VISUAL RUNNER & EVIDENCE
─────────────────────────────────────────────────
• Screenshot diff: 0px drift detected
• WCAG 2.1 AA Compliance: PASS (100%)
• Console errors: 0
• Snapshot trace: evidence_r1_desktop.png (verified)
• Approver status: 4/4 unanimous green`,
    };
  }

  return null;
}

/**
 * Da un paso de avance en la ejecución de la tarea a través del grafo.
 */
export function stepTaskExecution(
  task: PipelineTask,
  allNodes: PipelineNode[]
): {
  task: PipelineTask;
  nodes: PipelineNode[];
  log: ActivityLogEntry;
  newArtifact?: TaskArtifact;
  isCompleted: boolean;
} {
  const updatedNodes = allNodes.map((n) => ({ ...n }));
  const now = Date.now();

  // Si está queued, comienza en el primer nodo
  if (task.status === 'queued' || !task.currentNodeId) {
    const firstNodeId = task.path[0];
    const targetNode = updatedNodes.find((n) => n.id === firstNodeId);
    if (targetNode) {
      targetNode.status = 'running';
      targetNode.currentTaskId = task.id;
      targetNode.metrics.queueDepth = Math.max(0, targetNode.metrics.queueDepth - 1);
    }

    const updatedTask: PipelineTask = {
      ...task,
      status: 'running',
      startedAt: task.startedAt || now,
      currentNodeId: firstNodeId,
      progress: Math.round((1 / task.path.length) * 100),
      visitedNodes: [firstNodeId],
      history: [
        {
          id: `hist-${now}-${firstNodeId}`,
          timestamp: now,
          nodeId: firstNodeId,
          nodeName: targetNode?.name || firstNodeId,
          status: 'executing',
          durationMs: 40,
          log: `Iniciando tarea en nodo ${targetNode?.name || firstNodeId}`,
          tokens: 1200,
        },
      ],
      metrics: {
        ...task.metrics,
        totalTokens: task.metrics.totalTokens + 1200,
        durationMs: 40,
        costUsd: Number((task.metrics.costUsd + 0.0018).toFixed(4)),
      },
    };

    const log: ActivityLogEntry = {
      id: `log-${now}-${Math.random()}`,
      timestamp: now,
      level: 'info',
      source: targetNode?.name || firstNodeId,
      layer: targetNode?.layer || 1,
      message: `Tarea [${task.id}] entró a ${targetNode?.name || firstNodeId}`,
      taskId: task.id,
    };

    return {
      task: updatedTask,
      nodes: updatedNodes,
      log,
      isCompleted: false,
    };
  }

  // Tarea ya en progreso: avanzar al siguiente nodo
  const currentIndex = task.path.indexOf(task.currentNodeId);
  const currentNode = updatedNodes.find((n) => n.id === task.currentNodeId);

  // Marcar nodo actual como completed
  if (currentNode) {
    currentNode.status = 'completed';
    currentNode.currentTaskId = undefined;
    currentNode.metrics.successCount += 1;
    currentNode.metrics.tokensProcessed += 2400;
  }

  const isLast = currentIndex >= task.path.length - 1;

  if (isLast) {
    // Tarea finalizada con éxito
    const duration = task.startedAt ? now - task.startedAt : 1200;
    const updatedTask: PipelineTask = {
      ...task,
      status: 'completed',
      completedAt: now,
      progress: 100,
      currentNodeId: null,
      history: [
        ...task.history,
        {
          id: `hist-${now}-complete`,
          timestamp: now,
          nodeId: task.path[task.path.length - 1],
          nodeName: currentNode?.name || 'End',
          status: 'completed',
          durationMs: 90,
          log: `Pipeline finalizado con éxito para la tarea ${task.id}`,
        },
      ],
      metrics: {
        ...task.metrics,
        durationMs: duration,
      },
    };

    const log: ActivityLogEntry = {
      id: `log-${now}-${Math.random()}`,
      timestamp: now,
      level: 'success',
      source: currentNode?.name || 'Production',
      layer: 5,
      message: `Tarea [${task.id}] completó exitosamente todo el pipeline de producción`,
      taskId: task.id,
    };

    return {
      task: updatedTask,
      nodes: updatedNodes,
      log,
      isCompleted: true,
    };
  }

  // Avanzar al siguiente nodo
  const nextNodeId = task.path[currentIndex + 1];
  const nextNode = updatedNodes.find((n) => n.id === nextNodeId);

  if (nextNode) {
    nextNode.status = 'running';
    nextNode.currentTaskId = task.id;
  }

  const newArtifact = generateArtifactForNode(nextNodeId, task) || undefined;
  const newArtifactsList = newArtifact ? [...task.artifacts, newArtifact] : task.artifacts;

  const addedTokens = Math.floor(Math.random() * 2000) + 1500;
  const addedCost = Number((addedTokens * 0.0000015).toFixed(5));

  const updatedTask: PipelineTask = {
    ...task,
    currentNodeId: nextNodeId,
    progress: Math.round(((currentIndex + 2) / task.path.length) * 100),
    visitedNodes: [...task.visitedNodes, nextNodeId],
    artifacts: newArtifactsList,
    history: [
      ...task.history,
      {
        id: `hist-${now}-${nextNodeId}`,
        timestamp: now,
        nodeId: nextNodeId,
        nodeName: nextNode?.name || nextNodeId,
        status: 'executing',
        durationMs: 80,
        log: `Ejecutando en ${nextNode?.name || nextNodeId}`,
        tokens: addedTokens,
      },
    ],
    metrics: {
      ...task.metrics,
      totalTokens: task.metrics.totalTokens + addedTokens,
      durationMs: task.startedAt ? now - task.startedAt : 150,
      costUsd: Number((task.metrics.costUsd + addedCost).toFixed(4)),
    },
  };

  const log: ActivityLogEntry = {
    id: `log-${now}-${Math.random()}`,
    timestamp: now,
    level: 'info',
    source: nextNode?.name || nextNodeId,
    layer: nextNode?.layer || 3,
    message: `Tarea [${task.id}] transitó a nodo: ${nextNode?.name || nextNodeId}`,
    taskId: task.id,
  };

  return {
    task: updatedTask,
    nodes: updatedNodes,
    log,
    newArtifact,
    isCompleted: false,
  };
}

/**
 * Calcula el resumen de telemetría consolidado
 */
export function calculateTelemetry(
  tasks: PipelineTask[],
  nodes: PipelineNode[]
): TelemetrySummary {
  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'queued');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');

  const totalFinished = completedTasks.length + failedTasks.length;
  const globalSuccessRate = totalFinished > 0
    ? Number(((completedTasks.length / totalFinished) * 100).toFixed(1))
    : 100.0;

  const durations = completedTasks.map((t) => t.metrics.durationMs).filter((d) => d > 0);
  const avgCycleTimeMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 2450;

  const sortedDurations = [...durations].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedDurations.length * 0.95);
  const p95CycleTimeMs = sortedDurations.length > 0 ? sortedDurations[p95Index] || sortedDurations[sortedDurations.length - 1] : 3100;

  const totalTokensUsed = tasks.reduce((sum, t) => sum + t.metrics.totalTokens, 0) + 854000;
  const estimatedCostUsd = Number((totalTokensUsed * 0.0000018).toFixed(2));

  // Detectar cuellos de botella según latencia y queueDepth
  const bottlenecks = nodes
    .filter((n) => n.metrics.queueDepth > 0 || n.metrics.p95LatencyMs > 500)
    .sort((a, b) => b.metrics.p95LatencyMs - a.metrics.p95LatencyMs)
    .slice(0, 3)
    .map((n) => ({
      nodeId: n.id,
      nodeName: n.name,
      queueDepth: n.metrics.queueDepth,
      avgLatencyMs: n.metrics.p95LatencyMs,
    }));

  return {
    activeTasksCount: activeTasks.length,
    completedTasksCount: completedTasks.length,
    failedTasksCount: failedTasks.length,
    globalSuccessRate,
    avgCycleTimeMs,
    p95CycleTimeMs,
    totalTokensUsed,
    throughputPerHour: 48,
    estimatedCostUsd,
    bottlenecks: bottlenecks.length > 0 ? bottlenecks : [
      { nodeId: 'builder', nodeName: 'Builder', queueDepth: 1, avgLatencyMs: 910 },
      { nodeId: 'benchmark_lab', nodeName: 'Benchmark Lab', queueDepth: 0, avgLatencyMs: 880 },
    ],
  };
}

/**
 * Tareas precargadas para demostración inmediata
 */
export function generateInitialDemoTasks(): PipelineTask[] {
  return [
    {
      id: 'TASK-AUTH-01',
      title: 'OAuth2 Token Vault & Coherencia AST',
      description: 'Implementar almacenamiento seguro de tokens con rotación atómica y validación de contrato.',
      priority: 'P1_HIGH',
      lane: 'standard',
      status: 'completed',
      progress: 100,
      currentNodeId: null,
      path: calculateLanePath('standard'),
      visitedNodes: calculateLanePath('standard'),
      history: [
        {
          id: 'h1',
          timestamp: Date.now() - 150000,
          nodeId: 'entradas',
          nodeName: 'Entradas ▼',
          status: 'completed',
          durationMs: 40,
          log: 'Solicitud ingestada desde fuente de repositorio.',
        },
        {
          id: 'h2',
          timestamp: Date.now() - 120000,
          nodeId: 'builder',
          nodeName: 'Builder',
          status: 'completed',
          durationMs: 780,
          log: 'Código generado con Opus / Gemini Pro.',
        },
        {
          id: 'h3',
          timestamp: Date.now() - 80000,
          nodeId: 'tu_ok_ignacio',
          nodeName: 'Tu OK · Ignacio',
          status: 'completed',
          durationMs: 120,
          log: 'Aprobación firmada por Ignacio. Fusión autorizada a main local.',
        },
      ],
      artifacts: [
        {
          id: 'art-spec-demo',
          type: 'spec_doc',
          title: 'RFC-084: Architecture Spec - Token Vault',
          nodeId: 'spec_writer',
          timestamp: Date.now() - 130000,
          content: `# RFC-084: Distributed OAuth2 Token Vault
- Encriptación: AES-256-GCM con claves por tenant.
- Deduplicación atómica mediante Redis SETNX.
- Invariantes de coherencia validadas por Coherencia (Sonnet / Determinista).`,
        },
        {
          id: 'art-code-demo',
          type: 'code_diff',
          title: 'Diff: src/core/vault.ts',
          nodeId: 'builder',
          timestamp: Date.now() - 100000,
          content: `@@ -12,6 +12,18 @@
+export class OAuthTokenVault {
+  async rotate(token: string): Promise<TokenPair> {
+    const entry = await this.redis.eval(ROTATION_LUA_SCRIPT, [token]);
+    return entry;
+  }
+}`,
        },
      ],
      metrics: {
        totalTokens: 48900,
        durationMs: 2450,
        costUsd: 0.088,
        testPassingRate: 100,
      },
      createdAt: Date.now() - 200000,
      startedAt: Date.now() - 190000,
      completedAt: Date.now() - 30000,
    },
    {
      id: 'TASK-HOTFIX-P0',
      title: 'P0 Urgent: Memory Leak in WebSocket Connection Pool',
      description: 'Buffer underflow en deserialización de frames WS causando retención de conexiones zombi.',
      priority: 'P0_URGENT',
      lane: 'urgent',
      status: 'running',
      progress: 50,
      currentNodeId: 'carril_urgencia',
      path: calculateLanePath('urgent'),
      visitedNodes: ['carril_urgencia'],
      history: [
        {
          id: 'h-hotfix-1',
          timestamp: Date.now() - 40000,
          nodeId: 'carril_urgencia',
          nodeName: 'Carril urgencia',
          status: 'executing',
          durationMs: 60,
          log: 'Parche de urgencia clasificado como P0_URGENT. Acceso directo Ignacio SSH activado.',
        },
      ],
      artifacts: [
        {
          id: 'art-hotfix-diff',
          type: 'code_diff',
          title: 'Hotfix Diff: WebSocket Buffer Clamp',
          nodeId: 'carril_urgencia',
          timestamp: Date.now() - 25000,
          content: `@@ -88,3 +88,5 @@
-    this.buffer.write(chunk);
+    const clampedChunk = chunk.subarray(0, MAX_FRAME_SIZE);
+    this.buffer.write(clampedChunk);`,
        },
      ],
      metrics: {
        totalTokens: 18400,
        durationMs: 890,
        costUsd: 0.033,
        testPassingRate: 100,
      },
      createdAt: Date.now() - 50000,
      startedAt: Date.now() - 45000,
    },
  ];
}

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_NODES, INITIAL_EDGES, LAYER_INFO } from './src/pipeline/graphData';
import {
  createPipelineTask,
  stepTaskExecution,
  calculateTelemetry,
  generateInitialDemoTasks,
} from './src/pipeline/engine';
import { generatePipelinePerformanceReport } from './src/pipeline/exportReport';
import {
  PipelineNode,
  PipelineEdge,
  PipelineTask,
  ActivityLogEntry,
  TelemetrySummary,
  PipelineState,
} from './src/types/pipeline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Estado centralizado en memoria
let currentNodes: PipelineNode[] = JSON.parse(JSON.stringify(INITIAL_NODES));
let currentEdges: PipelineEdge[] = JSON.parse(JSON.stringify(INITIAL_EDGES));
let currentTasks: PipelineTask[] = generateInitialDemoTasks();
let activityLogs: ActivityLogEntry[] = [
  {
    id: 'log-init-1',
    timestamp: Date.now() - 360000,
    level: 'info',
    source: 'Brain Master Controller',
    layer: 1,
    message: 'Factoría Agéntica inicializada. Grafo de 5 capas enlazado.',
  },
  {
    id: 'log-init-2',
    timestamp: Date.now() - 300000,
    level: 'success',
    source: 'Security Gatekeeper',
    layer: 1,
    message: 'Guardrails criptográficos y políticas de RBAC activadas.',
  },
  {
    id: 'log-init-3',
    timestamp: Date.now() - 200000,
    level: 'info',
    source: 'Ops Supervisor',
    layer: 5,
    message: 'Supervisión en tiempo real conectada a telemetría APM.',
  },
];
let engineStatus: 'idle' | 'running' | 'paused' = 'running';
let engineSpeed = 1; // 1x
let activeTaskId: string | null = 'TASK-HOTFIX-P0';

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

function getFullState(): PipelineState {
  const telemetry: TelemetrySummary = calculateTelemetry(currentTasks, currentNodes);
  return {
    nodes: currentNodes,
    edges: currentEdges,
    tasks: currentTasks,
    activeTaskId,
    activityLogs: activityLogs.slice(-50),
    telemetry,
    engineStatus,
    speed: engineSpeed,
  };
}

function broadcastState() {
  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    data: getFullState(),
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function addLog(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
  const log: ActivityLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    ...entry,
  };
  activityLogs.push(log);
  if (activityLogs.length > 200) {
    activityLogs = activityLogs.slice(-200);
  }
}

// Tick loop del motor en el backend
let tickInterval: NodeJS.Timeout | null = null;

function executeEngineTick() {
  if (engineStatus !== 'running') return;

  // Buscar tarea en ejecución o la primera queued
  let targetTask = currentTasks.find((t) => t.id === activeTaskId && t.status === 'running');
  if (!targetTask) {
    targetTask = currentTasks.find((t) => t.status === 'running') || currentTasks.find((t) => t.status === 'queued');
    if (targetTask) {
      activeTaskId = targetTask.id;
    }
  }

  if (targetTask) {
    const result = stepTaskExecution(targetTask, currentNodes);
    currentNodes = result.nodes;

    // Actualizar edges activos para animación de pulso
    if (targetTask.currentNodeId) {
      const activeNode = targetTask.currentNodeId;
      currentEdges = currentEdges.map((edge) => ({
        ...edge,
        active: edge.source === activeNode || edge.target === activeNode,
      }));
    }

    // Actualizar tarea en la lista
    currentTasks = currentTasks.map((t) => (t.id === result.task.id ? result.task : t));
    addLog(result.log);

    if (result.isCompleted) {
      // Buscar siguiente tarea pendiente
      const nextQueued = currentTasks.find((t) => t.status === 'queued');
      if (nextQueued) {
        activeTaskId = nextQueued.id;
      } else {
        activeTaskId = null;
      }
    }

    broadcastState();
  }
}

function restartTickTimer() {
  if (tickInterval) clearInterval(tickInterval);
  const intervalMs = Math.max(400, Math.round(2200 / engineSpeed));
  tickInterval = setInterval(executeEngineTick, intervalMs);
}

// Iniciar tick loop
restartTickTimer();

// WebSocket handlers
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'INIT_STATE', data: getFullState() }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'START_ENGINE') {
        engineStatus = 'running';
        broadcastState();
      } else if (parsed.type === 'PAUSE_ENGINE') {
        engineStatus = 'paused';
        broadcastState();
      } else if (parsed.type === 'SET_SPEED') {
        engineSpeed = parsed.speed || 1;
        restartTickTimer();
        broadcastState();
      } else if (parsed.type === 'STEP_ENGINE') {
        executeEngineTick();
      } else if (parsed.type === 'RESET_PIPELINE') {
        currentNodes = JSON.parse(JSON.stringify(INITIAL_NODES));
        currentEdges = JSON.parse(JSON.stringify(INITIAL_EDGES));
        currentTasks = generateInitialDemoTasks();
        activeTaskId = 'TASK-HOTFIX-P0';
        addLog({
          level: 'info',
          source: 'Brain Master Controller',
          layer: 1,
          message: 'Pipeline y telemetría restablecidos al estado base.',
        });
        broadcastState();
      } else if (parsed.type === 'CREATE_TASK') {
        const newTask = createPipelineTask(parsed.task);
        currentTasks = [newTask, ...currentTasks];
        activeTaskId = newTask.id;
        addLog({
          level: 'info',
          source: 'Task Intake Gateway',
          layer: 3,
          message: `Nueva tarea registrada: [${newTask.id}] ${newTask.title} (Carril: ${newTask.lane})`,
          taskId: newTask.id,
        });
        broadcastState();
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });
});

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: '2.4.0-agentos',
  });
});

app.get('/api/pipeline/graph', (_req, res) => {
  res.json({
    nodes: currentNodes,
    edges: currentEdges,
    layers: LAYER_INFO,
  });
});

app.get('/api/pipeline/state', (_req, res) => {
  res.json(getFullState());
});

app.get('/api/pipeline/export', (req, res) => {
  const telemetry = calculateTelemetry(currentTasks, currentNodes);
  const report = generatePipelinePerformanceReport({
    nodes: currentNodes,
    edges: currentEdges,
    tasks: currentTasks,
    telemetry,
    activityLogs,
    diagramMode: 'original',
    speedMultiplier: engineSpeed,
    engineStatus,
  });

  const shouldDownload = req.query.download === 'true';
  if (shouldDownload) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="agentos-performance-report-${Date.now()}.json"`
    );
  }
  res.setHeader('Content-Type', 'application/json');
  res.json(report);
});

app.post('/api/pipeline/task', (req, res) => {
  const { title, description, priority, lane } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Título requerido' });
  }
  const task = createPipelineTask({
    title,
    description: description || 'Sin descripción detallada.',
    priority: priority || 'P2_NORMAL',
    lane: lane || 'standard',
  });
  currentTasks = [task, ...currentTasks];
  activeTaskId = task.id;
  addLog({
    level: 'info',
    source: 'Task Intake Gateway',
    layer: 3,
    message: `Nueva tarea agregada vía REST: [${task.id}] ${task.title}`,
    taskId: task.id,
  });
  broadcastState();
  res.status(201).json(task);
});

app.post('/api/pipeline/action', (req, res) => {
  const { action, speed } = req.body;
  if (action === 'start') {
    engineStatus = 'running';
  } else if (action === 'pause') {
    engineStatus = 'paused';
  } else if (action === 'step') {
    executeEngineTick();
  } else if (action === 'reset') {
    currentNodes = JSON.parse(JSON.stringify(INITIAL_NODES));
    currentEdges = JSON.parse(JSON.stringify(INITIAL_EDGES));
    currentTasks = generateInitialDemoTasks();
    activeTaskId = 'TASK-HOTFIX-P0';
    addLog({
      level: 'info',
      source: 'Brain Master Controller',
      layer: 1,
      message: 'Pipeline reinicializado por solicitud API.',
    });
  } else if (action === 'speed' && speed) {
    engineSpeed = speed;
    restartTickTimer();
  }
  broadcastState();
  res.json({ success: true, engineStatus, engineSpeed });
});

app.post('/api/pipeline/node-fault', (req, res) => {
  const { nodeId, status } = req.body;
  const node = currentNodes.find((n) => n.id === nodeId);
  if (node) {
    node.status = status || 'error';
    node.metrics.errorCount += 1;
    addLog({
      level: 'error',
      source: node.name,
      layer: node.layer,
      message: `ANOMALÍA INDUCIDA: Falla en nodo ${node.name}. Circuito de contingencia activado.`,
    });
    broadcastState();
    return res.json({ success: true, node });
  }
  res.status(404).json({ error: 'Nodo no encontrado' });
});

// Arquitectura y Documentación C.R.A.F.T. API
app.get('/api/docs/architecture', (_req, res) => {
  res.json({
    architecture: {
      layers: [
        { id: 1, name: 'Memoria y Seguridad', nodes: ['L1_BRAIN', 'L1_SECURITY', 'L1_VAULT', 'L1_AUDIT'] },
        { id: 2, name: 'Exploración, Backup y Telemetría', nodes: ['L2_SCANNER', 'L2_BACKUP', 'L2_CONSISTENCY', 'L2_EVAL'] },
        { id: 3, name: 'Flujo Principal, UX y Evidencia', nodes: ['L3_INTAKE', 'L3_INTENT', 'L3_ANALYZE', 'L3_SPEC', 'L3_BUILDER', 'L3_UI_UX', 'L3_APPROVAL', 'L3_EVIDENCE'] },
        { id: 4, name: 'Carriles, Validación y Algoritmia', nodes: ['L4_ROUTER', 'L4_EXPRESS', 'L4_URGENT', 'L4_VERIFIER', 'L4_TESTS', 'L4_BENCHMARK'] },
        { id: 5, name: 'Producción y Supervisión', nodes: ['L5_DEPLOYER', 'L5_SUPERVISOR', 'L5_ANOMALY'] },
      ],
      databaseSchema: {
        tables: ['tasks', 'pipeline_nodes', 'pipeline_edges', 'task_history', 'task_artifacts', 'telemetry_snapshots'],
      },
      dockerCompose: `version: "3.8"
services:
  agentos-factory:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped`,
    },
  });
});

// Vite Integration en Dev vs Prod
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AgentOS Engine running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

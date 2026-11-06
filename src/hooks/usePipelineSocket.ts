/**
 * AgentOS - Hook de WebSocket y Sincronización de Estado en Tiempo Real
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PipelineState,
  PipelineNode,
  PipelineEdge,
  PipelineTask,
  ActivityLogEntry,
  TelemetrySummary,
  TaskPriority,
  TaskLane,
} from '../types/pipeline';
import { INITIAL_NODES, INITIAL_EDGES } from '../pipeline/graphData';
import {
  generateInitialDemoTasks,
  calculateTelemetry,
  createPipelineTask,
  stepTaskExecution,
} from '../pipeline/engine';

export function usePipelineSocket() {
  const [nodes, setNodes] = useState<PipelineNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<PipelineEdge[]>(INITIAL_EDGES);
  const [tasks, setTasks] = useState<PipelineTask[]>(generateInitialDemoTasks());
  const [activeTaskId, setActiveTaskId] = useState<string | null>('TASK-HOTFIX-P0');
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([
    {
      id: 'log-1',
      timestamp: Date.now() - 60000,
      level: 'info',
      source: 'Brain Master Controller',
      layer: 1,
      message: 'Factoría agéntica conectada al bus de eventos reactivo.',
    },
  ]);
  const [telemetry, setTelemetry] = useState<TelemetrySummary>(() =>
    calculateTelemetry(tasks, nodes)
  );
  const [engineStatus, setEngineStatus] = useState<'idle' | 'running' | 'paused'>('running');
  const [speed, setSpeed] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const localTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback local en caso de desconexión del WebSocket
  const runLocalTick = useCallback(() => {
    if (engineStatus !== 'running') return;

    setTasks((prevTasks) => {
      let targetTask = prevTasks.find((t) => t.id === activeTaskId && t.status === 'running');
      if (!targetTask) {
        targetTask = prevTasks.find((t) => t.status === 'running') || prevTasks.find((t) => t.status === 'queued');
      }

      if (!targetTask) return prevTasks;

      let updatedNodes: PipelineNode[] = [];
      const result = stepTaskExecution(targetTask, nodes);
      updatedNodes = result.nodes;
      setNodes(updatedNodes);

      if (targetTask.currentNodeId) {
        const cur = targetTask.currentNodeId;
        setEdges((prevEdges) =>
          prevEdges.map((e) => ({
            ...e,
            active: e.source === cur || e.target === cur,
          }))
        );
      }

      setActivityLogs((prevLogs) => [result.log, ...prevLogs.slice(0, 49)]);

      const nextTasks = prevTasks.map((t) => (t.id === result.task.id ? result.task : t));

      if (result.isCompleted) {
        const nextQueued = nextTasks.find((t) => t.status === 'queued');
        setActiveTaskId(nextQueued ? nextQueued.id : null);
      } else {
        setActiveTaskId(result.task.id);
      }

      setTelemetry(calculateTelemetry(nextTasks, updatedNodes));
      return nextTasks;
    });
  }, [engineStatus, activeTaskId, nodes]);

  // Manejo de conexión WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'INIT_STATE' || message.type === 'STATE_UPDATE') {
            const data: PipelineState = message.data;
            setNodes(data.nodes);
            setEdges(data.edges);
            setTasks(data.tasks);
            setActiveTaskId(data.activeTaskId);
            setActivityLogs(data.activityLogs);
            setTelemetry(data.telemetry);
            setEngineStatus(data.engineStatus);
            setSpeed(data.speed);
          }
        } catch (e) {
          console.warn('Error parseando mensaje WS:', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
      };

      socketRef.current = ws;
    } catch {
      setIsConnected(false);
    }

    return () => {
      isMounted = false;
      if (ws) ws.close();
    };
  }, []);

  // Timer local si el socket no está conectado
  useEffect(() => {
    if (!isConnected && engineStatus === 'running') {
      const interval = Math.max(500, Math.round(2200 / speed));
      localTimerRef.current = setInterval(runLocalTick, interval);
      return () => {
        if (localTimerRef.current) clearInterval(localTimerRef.current);
      };
    }
  }, [isConnected, engineStatus, speed, runLocalTick]);

  // Acciones emitidas al socket o procesadas localmente
  const startEngine = () => {
    setEngineStatus('running');
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'START_ENGINE' }));
    }
  };

  const pauseEngine = () => {
    setEngineStatus('paused');
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'PAUSE_ENGINE' }));
    }
  };

  const setSpeedMultiplier = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'SET_SPEED', speed: newSpeed }));
    }
  };

  const stepEngine = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'STEP_ENGINE' }));
    } else {
      runLocalTick();
    }
  };

  const resetPipeline = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'RESET_PIPELINE' }));
    } else {
      setNodes(JSON.parse(JSON.stringify(INITIAL_NODES)));
      setEdges(JSON.parse(JSON.stringify(INITIAL_EDGES)));
      const demo = generateInitialDemoTasks();
      setTasks(demo);
      setActiveTaskId('TASK-HOTFIX-P0');
      setTelemetry(calculateTelemetry(demo, INITIAL_NODES));
      setActivityLogs([
        {
          id: `log-reset-${Date.now()}`,
          timestamp: Date.now(),
          level: 'info',
          source: 'Brain Master Controller',
          layer: 1,
          message: 'Pipeline reinicializado al estado base.',
        },
      ]);
    }
  };

  const createTask = (params: {
    title: string;
    description: string;
    priority: TaskPriority;
    lane: TaskLane;
  }) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'CREATE_TASK', task: params }));
    } else {
      const newTask = createPipelineTask(params);
      setTasks((prev) => [newTask, ...prev]);
      setActiveTaskId(newTask.id);
      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          level: 'info',
          source: 'Task Intake Gateway',
          layer: 3,
          message: `Nueva tarea creada: [${newTask.id}] ${newTask.title}`,
          taskId: newTask.id,
        },
        ...prev,
      ]);
    }
  };

  const injectFault = (nodeId: string) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            status: 'error',
            metrics: { ...n.metrics, errorCount: n.metrics.errorCount + 1 },
          };
        }
        return n;
      })
    );
    setActivityLogs((prev) => [
      {
        id: `fault-${Date.now()}`,
        timestamp: Date.now(),
        level: 'error',
        source: nodeId,
        layer: 4,
        message: `Fallo forzado inyectado en nodo ${nodeId}. Activando auto-rollback en Capa 5.`,
      },
      ...prev,
    ]);
  };

  const appendActivityLogs = useCallback((newLogs: ActivityLogEntry[]) => {
    if (!newLogs || newLogs.length === 0) return;
    setActivityLogs((prev) => [...newLogs, ...prev].slice(0, 60));
  }, []);

  return {
    nodes,
    edges,
    tasks,
    activeTaskId,
    activityLogs,
    telemetry,
    engineStatus,
    speed,
    isConnected,
    startEngine,
    pauseEngine,
    stepEngine,
    resetPipeline,
    setSpeedMultiplier,
    createTask,
    injectFault,
    appendActivityLogs,
  };
}

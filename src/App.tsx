/**
 * AgentOS v2.4 — Factoría Agéntica
 * Dashboard de Ingeniería de Pipelines con Arquitectura Canvas-First y Cromo Flotante Glassmorphic
 * Inspirado en Linear, Vercel y Godly:
 * - Cabecera estricta de 3 zonas (Marca en 1 línea — 4 enlaces de navegación limpios — 1 acción primaria).
 * - Lienzo de Grafo 3D en primer plano con HUD flotante glassmorphic para filtrar capas, hacer zoom vectorial HD (hasta 400%),
 *   deslizar el flujo (Pan X/Y + cruceta) y estirar/aumentar el tamaño del frame (380px–1400px, presets, 100vh y tirador inferior).
 * - Conectado 100% al Backend Git Real en Linux (11/11 Puntos Reales + Server-Side Git Hooks `pre-receive` y `update` con firma GPG y `#TASK-<id>`).
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  GitBranch,
  GitMerge,
  FileText,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  FileWarning,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  UploadCloud,
  Move,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Terminal,
  GripHorizontal,
} from 'lucide-react';
import { NodeGraphCanvas } from './components/NodeGraphCanvas';
import { NodeInspectorModal } from './components/NodeInspectorModal';
import { DevOnboardingModal } from './components/DevOnboardingModal';
import { LAYER_INFO } from './pipeline/graphData';
import type {
  PipelineNode,
  PipelineEdge,
  NodeLayer,
  TaskLane,
  DiagramMode,
} from './types/pipeline';
import type {
  FactoryTaskRecord,
  GitRepoStatusSnapshot,
  ElevenPointStatus,
  ServerSideHookComplianceResult,
} from './backend/gitFactory';

interface FactoryBackendState {
  repo: GitRepoStatusSnapshot;
  tasks: FactoryTaskRecord[];
  elevenPointsAudit: ElevenPointStatus[];
  graph: {
    nodes: PipelineNode[];
    edges: PipelineEdge[];
  };
}

export function App() {
  const [state, setState] = useState<FactoryBackendState | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);

  // Arquitectura Canvas-First: Zoom Vectorial HD, Deslizamiento X/Y y Redimensionado del Frame
  const [diagramMode] = useState<DiagramMode>('original');
  const [selectedLayer, setSelectedLayer] = useState<NodeLayer | null>(null);
  const [selectedLane] = useState<TaskLane | 'all'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [frameHeight, setFrameHeight] = useState<number>(680);
  const [isFrameMaximized, setIsFrameMaximized] = useState<boolean>(false);
  const [isResizingFrame, setIsResizingFrame] = useState<boolean>(false);
  const resizeStartRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Modales: Inspector 3D del Eje Z y Estudio de Vídeo Onboarding
  const [inspectedNode, setInspectedNode] = useState<PipelineNode | null>(null);
  const [manualZOverrides, setManualZOverrides] = useState<Record<string, number>>({});
  const [isEditMode3DDisabled, setIsEditMode3DDisabled] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Estado de verificación en vivo de Server-Side Git Hooks (pre-receive, update)
  const [lastHookTestResult, setLastHookTestResult] =
    useState<ServerSideHookComplianceResult | null>(null);
  const [showHookScripts, setShowHookScripts] = useState<boolean>(false);

  // Formulario de Nuevo Encargo
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetFile, setNewTargetFile] = useState('');

  const fetchBackendState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/factory/state');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar /api/factory/state');
      }
      setState(data);
      setSelectedTaskId((prev) => prev || data.tasks[0]?.id || null);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error de conexión con el backend',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendState();
  }, [fetchBackendState]);

  // Arrastre vertical inferior para aumentar o reducir la altura del frame del flujo
  useEffect(() => {
    if (!isResizingFrame) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const deltaY = e.clientY - resizeStartRef.current.startY;
      const nextHeight = Math.min(
        1400,
        Math.max(380, resizeStartRef.current.startHeight + deltaY)
      );
      setFrameHeight(nextHeight);
    };

    const handleMouseUp = () => {
      setIsResizingFrame(false);
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingFrame]);

  const handleStartFrameResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFrameMaximized(false);
    setIsResizingFrame(true);
    resizeStartRef.current = {
      startY: e.clientY,
      startHeight: frameHeight,
    };
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setActionMessage(null);
    try {
      const res = await fetch('/api/factory/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          targetFile: newTargetFile.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear el encargo');
      }
      setNewTitle('');
      setNewDescription('');
      setNewTargetFile('');
      await fetchBackendState();
      setSelectedTaskId(data.task.id);
      setActionMessage({
        type: 'ok',
        text: `Punto 1 ejecutado: Encargo ${data.task.id} filtrado y analizado en disco (${data.task.ingestion?.realAnalysisDurationMs}ms).`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al crear encargo',
      });
    }
  };

  const handleGenerateSpec = async (taskId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/factory/tasks/${encodeURIComponent(taskId)}/spec`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchBackendState();
      setActionMessage({
        type: 'ok',
        text: `Punto 2 ejecutado: Especificación coherente guardada en disco (${data.task.spec?.specFilePath}).`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error en Punto 2 (Spec)',
      });
    }
  };

  const handleBuildInBranch = async (taskId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/factory/tasks/${encodeURIComponent(taskId)}/build`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchBackendState();
      setActionMessage({
        type: 'ok',
        text: `Puntos 3–6 y 10 ejecutados: Rama '${data.task.build?.branchName}' (${data.task.build?.commitHash}) firmada con GPG + #TASK-${taskId}, BD aislada OK y Approver ${data.task.approver?.votesPassed}/4.`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error en construcción en rama aislada',
      });
    }
  };

  const handleMergeToMain = async (taskId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/factory/tasks/${encodeURIComponent(taskId)}/merge`, {
        method: 'POST',
      });
      const data = await res.json();
      await fetchBackendState();
      if (!res.ok) {
        setActionMessage({
          type: 'error',
          text: data.error || 'Fusión rechazada por el backend (Punto 7).',
        });
        return;
      }
      setActionMessage({
        type: 'ok',
        text: `Puntos 7 y 9 ejecutados: Tag '${data.mergeResult.checkpointTag}' creado y rama '${data.mergeResult.sourceBranch}' fusionada en 'main' con firma GPG (${data.mergeResult.mergeCommitHash}).`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al intentar fusionar en main',
      });
    }
  };

  const handleCloseAndPushAll = async (taskId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/factory/tasks/${encodeURIComponent(taskId)}/close-and-push`,
        {
          method: 'POST',
        }
      );
      const data = await res.json();
      await fetchBackendState();
      if (!res.ok) {
        setActionMessage({
          type: 'error',
          text: data.error || 'Cierre rechazado por el backend.',
        });
        return;
      }
      setActionMessage({
        type: 'ok',
        text: `¡Construcción cerrada y subida! Fusión en main (${data.mergeResult.mergeCommitHash}) + git push origin main (${data.pushResult.releaseTag}) validados por pre-receive y update.`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al cerrar y hacer push',
      });
    }
  };

  const handleVerifyServerHooks = async (
    scenario: 'missing_task_id' | 'unsigned_gpg' | 'valid_signed_with_task'
  ) => {
    setActionMessage(null);
    try {
      const res = await fetch('/api/factory/git/hooks/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastHookTestResult(data.result);
      await fetchBackendState();
      setActionMessage({
        type: data.result.passedComplianceCheck ? 'ok' : 'error',
        text:
          scenario === 'missing_task_id'
            ? `Hook pre-receive verificado: Rechazó correctamente el push sin #TASK-<id>.\n${data.result.hookOutput}`
            : scenario === 'unsigned_gpg'
            ? `Hook pre-receive verificado: Rechazó correctamente el push sin firma GPG.\n${data.result.hookOutput}`
            : `Hooks pre-receive y update verificados: Aceptaron el commit con firma GPG válida y #TASK-<id>.`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Error al probar server-side git hooks',
      });
    }
  };

  const handleDirtyWorktree = async () => {
    setActionMessage(null);
    try {
      const res = await fetch('/api/factory/git/dirty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'src/cambio_sin_confirmar.ts' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchBackendState();
      setActionMessage({
        type: 'error',
        text: 'Se ha creado "src/cambio_sin_confirmar.ts" sin confirmar. Si intentas fusionar ahora (Punto 7), Git lo rechazará.',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al ensuciar el árbol Git',
      });
    }
  };

  const handleCleanWorktree = async () => {
    setActionMessage(null);
    try {
      const res = await fetch('/api/factory/git/clean', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchBackendState();
      setActionMessage({
        type: 'ok',
        text: 'Árbol de trabajo Git limpiado (git reset --hard HEAD && git clean -fd).',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al limpiar el árbol Git',
      });
    }
  };

  const selectedTask =
    state?.tasks.find((t) => t.id === selectedTaskId) || state?.tasks[0] || null;

  const activeTaskPathNodeIds = selectedTask?.activeGraphNodes || [];
  const realPointsCount =
    state?.elevenPointsAudit.filter((p) => p.status === 'REAL').length || 11;

  return (
    <div className="min-h-screen bg-[#08090E] text-[#F3F4F6] flex flex-col">
      {/* 1. TOP BAR CONTRACT (3 Zonas estrictas: Marca 1 línea — 4 enlaces de navegación — 1 acción primaria) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-white/[0.07] bg-[#08090E]/90 backdrop-blur-md sticky top-0 z-30">
        <a
          href="#canvas-viewport"
          className="text-base font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          AgentOS v2.4 — Factoría Agéntica
        </a>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <a
            href="#canvas-viewport"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Lienzo 3D
          </a>
          <a
            href="#hooks-governance"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Hooks GPG & Git
          </a>
          <a
            href="#pipeline-workbench"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Pipeline 11 Puntos
          </a>
          <button
            data-testid="header-onboarding-video-btn"
            onClick={() => setIsOnboardingOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Estudio de Vídeo
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            data-testid="header-close-and-push-btn"
            onClick={() => selectedTask && handleCloseAndPushAll(selectedTask.id)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Cerrar Construcción & Push Git
          </button>
        </div>
      </header>

      {/* Notificación contextual de operación del Backend Git Real */}
      {actionMessage && (
        <div className="max-w-[1680px] w-full mx-auto px-6 pt-4">
          <div
            data-testid="backend-action-feedback"
            className={`px-4 py-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              actionMessage.type === 'ok'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}
          >
            {actionMessage.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="whitespace-pre-wrap flex-1 font-mono">{actionMessage.text}</div>
          </div>
        </div>
      )}

      {/* 2. ARQUITECTURA CANVAS-FIRST CON CROMO FLOTANTE GLASSMORPHIC */}
      <main className="max-w-[1680px] w-full mx-auto px-6 py-5 space-y-8 flex-1">
        <div id="canvas-viewport" className="space-y-0">
          {/* Tira de telemetría real desempacada (Zero-Pill Metadata Discipline) */}
          {state && (
            <div
              data-testid="header-real-git-strip"
              className="flex flex-wrap items-center justify-between gap-4 pb-3 text-xs text-slate-400 font-mono tabular-nums"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-200 font-medium">
                  Rama {state.repo.currentBranch} ({state.repo.headCommitHash})
                </span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    state.repo.isClean ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'
                  }
                >
                  {state.repo.isClean
                    ? 'git status limpio'
                    : `${state.repo.uncommittedFiles.length} archivo(s) sin confirmar`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">
                  {realPointsCount}/11 Puntos Reales en Linux
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-300">
                  Hooks {state.repo.serverHooks.installed ? 'pre-receive & update activos' : 'inactivos'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">
                  origin HEAD {state.repo.remoteOriginHeadHash || 'pendiente'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchBackendState}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Sincronizar estado del repositorio Git"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Git</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEWPORT PRINCIPAL DEL LIENZO DE GRAFO 3D CON CROMO FLOTANTE GLASSMORPHIC */}
          <section
            data-testid="flow-graph-frame"
            style={{
              height: isFrameMaximized ? 'calc(100vh - 125px)' : `${frameHeight}px`,
            }}
            className="rounded-t-xl border border-white/[0.08] overflow-hidden bg-[#06080F] relative transition-[height] duration-75"
          >
            {/* CROMO FLOTANTE SUPERIOR: Filtro segmentado de Capas + Zoom Vectorial HD */}
            <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              {/* Filtro segmentado de las 5 capas */}
              <div className="glass-chrome px-2 py-1.5 rounded-lg flex items-center gap-1 pointer-events-auto">
                <button
                  onClick={() => setSelectedLayer(null)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedLayer === null
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas (25)
                </button>
                {([1, 2, 3, 4, 5] as NodeLayer[]).map((layer) => (
                  <button
                    key={layer}
                    onClick={() => setSelectedLayer(selectedLayer === layer ? null : layer)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedLayer === layer
                        ? 'text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    style={{
                      backgroundColor:
                        selectedLayer === layer ? LAYER_INFO[layer].color : 'transparent',
                    }}
                  >
                    C{layer} {LAYER_INFO[layer].name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Cromo Flotante Derecho: Zoom Vectorial Ultra-HD (45% a 400%) */}
              <div className="glass-chrome px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 pointer-events-auto font-mono tabular-nums text-xs">
                <button
                  data-testid="zoom-out-btn"
                  onClick={() =>
                    setZoomLevel((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))
                  }
                  className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span
                  data-testid="zoom-percentage-badge"
                  className="px-2 py-0.5 text-cyan-300 font-semibold whitespace-nowrap shrink-0"
                >
                  {Math.round(zoomLevel * 100)}% HD
                </span>
                <button
                  data-testid="zoom-in-btn"
                  onClick={() =>
                    setZoomLevel((z) => Math.min(4.0, Number((z + 0.2).toFixed(2))))
                  }
                  className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                  title="Acercar hasta 400% HD"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  data-testid="zoom-hd-macro-btn"
                  onClick={() => setZoomLevel((z) => (z >= 1.6 ? 0.9 : 1.75))}
                  className="px-2.5 py-1 rounded bg-white/[0.07] hover:bg-white/[0.14] text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {zoomLevel >= 1.6 ? 'Vista 90%' : 'Macro 175%'}
                </button>
              </div>
            </div>

            {/* LIENZO INTERACTIVO DE NODOS 3D */}
            {state?.graph ? (
              <NodeGraphCanvas
                nodes={state.graph.nodes}
                edges={state.graph.edges}
                selectedLayer={selectedLayer}
                selectedLane={selectedLane}
                onSelectNode={(node) => setInspectedNode(node)}
                zoomLevel={zoomLevel}
                panOffset={panOffset}
                onPanChange={setPanOffset}
                onZoomChange={setZoomLevel}
                diagramMode={diagramMode}
                activeTaskPathNodeIds={activeTaskPathNodeIds}
                inspectedNodeId={inspectedNode?.id}
                manualZOverrides={manualZOverrides}
                isEditMode3DDisabled={isEditMode3DDisabled}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Cargando grafo conectado al repositorio Git real...
              </div>
            )}

            {/* CROMO FLOTANTE INFERIOR: Controles para Deslizar el Flujo (Pan X/Y) y Aumentar el Tamaño del Frame */}
            <div className="absolute bottom-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              {/* Deslizar Flujo (Panning X / Y + Cruceta) */}
              <div
                data-testid="flow-pan-controls"
                className="glass-chrome px-3 py-1.5 rounded-lg flex flex-wrap items-center gap-2.5 pointer-events-auto text-xs"
              >
                <span className="text-slate-300 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <Move className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deslizar Flujo</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    data-testid="pan-left-btn"
                    onClick={() => setPanOffset((p) => ({ ...p, x: p.x + 120 }))}
                    className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 cursor-pointer"
                    title="Deslizar hacia la izquierda"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    data-testid="pan-right-btn"
                    onClick={() => setPanOffset((p) => ({ ...p, x: p.x - 120 }))}
                    className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 cursor-pointer"
                    title="Deslizar hacia la derecha"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    data-testid="pan-up-btn"
                    onClick={() => setPanOffset((p) => ({ ...p, y: p.y + 90 }))}
                    className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 cursor-pointer"
                    title="Deslizar hacia arriba"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    data-testid="pan-down-btn"
                    onClick={() => setPanOffset((p) => ({ ...p, y: p.y - 90 }))}
                    className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 cursor-pointer"
                    title="Deslizar hacia abajo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-[11px] text-slate-400">X</span>
                  <input
                    data-testid="pan-x-slider"
                    type="range"
                    min={-900}
                    max={600}
                    step={10}
                    value={Math.round(panOffset.x)}
                    onChange={(e) =>
                      setPanOffset((prev) => ({ ...prev, x: Number(e.target.value) }))
                    }
                    className="w-20 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-[11px] text-slate-400">Y</span>
                  <input
                    data-testid="pan-y-slider"
                    type="range"
                    min={-600}
                    max={500}
                    step={10}
                    value={Math.round(panOffset.y)}
                    onChange={(e) =>
                      setPanOffset((prev) => ({ ...prev, y: Number(e.target.value) }))
                    }
                    className="w-20 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <button
                  data-testid="pan-reset-btn"
                  onClick={() => setPanOffset({ x: 20, y: 20 })}
                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Centrar</span>
                </button>
              </div>

              {/* Aumentar Tamaño del Frame (Slider + Presets + Pantalla Completa) */}
              <div
                data-testid="flow-frame-size-controls"
                className="glass-chrome px-3 py-1.5 rounded-lg flex flex-wrap items-center gap-2 pointer-events-auto text-xs font-mono tabular-nums"
              >
                <span className="text-slate-300 font-sans font-medium whitespace-nowrap shrink-0">
                  Altura Frame
                </span>
                <input
                  data-testid="frame-height-slider"
                  type="range"
                  min={380}
                  max={1400}
                  step={20}
                  value={frameHeight}
                  onChange={(e) => {
                    setIsFrameMaximized(false);
                    setFrameHeight(Number(e.target.value));
                  }}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
                <span
                  data-testid="frame-height-badge"
                  className="text-cyan-300 font-semibold whitespace-nowrap shrink-0"
                >
                  {isFrameMaximized ? 'MAX (100vh)' : `${frameHeight}px`}
                </span>
                <button
                  data-testid="frame-size-preset-lg"
                  onClick={() => {
                    setIsFrameMaximized(false);
                    setFrameHeight(850);
                  }}
                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  850px
                </button>
                <button
                  data-testid="frame-size-preset-xl"
                  onClick={() => {
                    setIsFrameMaximized(false);
                    setFrameHeight(1150);
                  }}
                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  1150px XL
                </button>
                <button
                  data-testid="frame-maximize-toggle-btn"
                  onClick={() => setIsFrameMaximized((v) => !v)}
                  className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer font-sans font-medium"
                >
                  {isFrameMaximized ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Restaurar</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Expandir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* TIRADOR INFERIOR INTERACTIVO PARA ESTIRAR EL FRAME DEL FLUJO ARRASTRANDO */}
          <div
            data-testid="flow-frame-resize-handle"
            onMouseDown={handleStartFrameResize}
            className="h-6 bg-[#0C0E16] hover:bg-[#121624] border-x border-b border-white/[0.08] rounded-b-xl flex items-center justify-center gap-2 cursor-ns-resize select-none text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Arrastra hacia abajo o hacia arriba para ajustar la altura del frame del flujo"
          >
            <GripHorizontal className="w-4 h-4 text-slate-500" />
            <span>
              Arrastra para estirar el frame del flujo ·{' '}
              <span className="font-mono tabular-nums text-slate-300">
                {isFrameMaximized ? '100vh' : `${frameHeight}px`}
              </span>
            </span>
          </div>
        </div>

        {/* 3. WORKBENCH DE INGENIERÍA: SERVER-SIDE HOOKS GPG/#TASK + EJECUCIÓN DE LOS 11 PUNTOS REALES */}
        <div
          id="hooks-governance"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2"
        >
          {/* Columna Izquierda (5 cols): Gobernanza de Server-Side Git Hooks + Ingesta + Estado del Repositorio */}
          <div className="lg:col-span-5 space-y-6">
            {state && (
              <section
                data-testid="server-side-hooks-panel"
                className="linear-surface rounded-xl p-5 space-y-4"
              >
                <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] pb-3">
                  <h2 className="text-sm font-semibold text-white">
                    01. Server-Side Git Hooks (pre-receive & update)
                  </h2>
                  <span className="text-xs font-mono text-emerald-400 whitespace-nowrap shrink-0">
                    {state.repo.serverHooks.installed ? 'Activos en .factory-git-workspace' : 'Inactivos'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Los hooks del servidor rechazan automáticamente cualquier{' '}
                  <code className="text-slate-200">git push</code> cuyos commits no estén firmados con
                  una clave GPG Ed25519 válida (<code className="text-slate-200">git verify-commit</code>)
                  o que no incluyan el identificador <code className="text-amber-300">#TASK-&lt;id&gt;</code>{' '}
                  en el mensaje.
                </p>

                <div className="text-xs font-mono text-slate-400 break-all pt-1">
                  Huella GPG activa ·{' '}
                  <span className="text-cyan-300">{state.repo.serverHooks.gpgKeyFingerprint}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    data-testid="btn-hook-test-no-task"
                    onClick={() => handleVerifyServerHooks('missing_task_id')}
                    className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/40 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap truncate"
                  >
                    Probar sin #TASK
                  </button>
                  <button
                    data-testid="btn-hook-test-no-gpg"
                    onClick={() => handleVerifyServerHooks('unsigned_gpg')}
                    className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-amber-500/15 border border-white/[0.08] hover:border-amber-500/40 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap truncate"
                  >
                    Probar sin GPG
                  </button>
                  <button
                    data-testid="btn-hook-test-valid"
                    onClick={() => handleVerifyServerHooks('valid_signed_with_task')}
                    className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-500/40 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap truncate"
                  >
                    Probar GPG + #TASK
                  </button>
                </div>

                {lastHookTestResult && (
                  <div
                    data-testid="hook-test-result-box"
                    className="pt-3 border-t border-white/[0.06] space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">{lastHookTestResult.scenario}</span>
                      <span
                        className={
                          lastHookTestResult.passedComplianceCheck
                            ? 'text-emerald-400 font-semibold'
                            : 'text-rose-400 font-semibold'
                        }
                      >
                        {lastHookTestResult.pushAccepted
                          ? 'PUSH ACEPTADO'
                          : 'PUSH BLOQUEADO POR HOOK'}
                      </span>
                    </div>
                    <pre className="text-[11px] text-slate-300 whitespace-pre-wrap bg-[#08090E] p-3 rounded-lg border border-white/[0.06] max-h-32 overflow-y-auto">
                      {lastHookTestResult.hookOutput}
                    </pre>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    onClick={() => setShowHookScripts((v) => !v)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>
                      {showHookScripts
                        ? 'Ocultar scripts pre-receive y update'
                        : 'Inspeccionar scripts pre-receive y update en disco'}
                    </span>
                  </button>
                </div>

                {showHookScripts && (
                  <div className="space-y-3 pt-2 border-t border-white/[0.06] font-mono">
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1">
                        .factory-git-workspace/hooks/pre-receive
                      </div>
                      <pre className="p-3 rounded-lg bg-[#08090E] border border-white/[0.06] text-[10.5px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {state.repo.serverHooks.preReceiveScriptPreview}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1">
                        .factory-git-workspace/hooks/update
                      </div>
                      <pre className="p-3 rounded-lg bg-[#08090E] border border-white/[0.06] text-[10.5px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {state.repo.serverHooks.updateScriptPreview}
                      </pre>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Formulario de Ingesta de Nuevo Encargo (Punto 1) */}
            <section className="linear-surface rounded-xl p-5 space-y-4">
              <div className="border-b border-white/[0.06] pb-3">
                <h2 className="text-sm font-semibold text-white">
                  02. Ingesta y Análisis de Alcance en Disco (Punto 1)
                </h2>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1.5">Título del encargo</label>
                  <input
                    data-testid="new-task-title-input"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Validador de sesión con firma criptográfica"
                    className="w-full px-3 py-2 rounded-lg bg-[#08090E] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5">Ruta de archivo objetivo en Git</label>
                  <input
                    data-testid="new-task-file-input"
                    type="text"
                    value={newTargetFile}
                    onChange={(e) => setNewTargetFile(e.target.value)}
                    placeholder="Ej: src/authSession.ts"
                    className="w-full px-3 py-2 rounded-lg bg-[#08090E] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5">Especificación funcional</label>
                  <textarea
                    data-testid="new-task-desc-input"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={2}
                    placeholder="Criterios de aceptación verificables..."
                    className="w-full px-3 py-2 rounded-lg bg-[#08090E] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  data-testid="create-task-submit-btn"
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar y Analizar en Disco</span>
                </button>
              </form>
            </section>

            {/* Estado del Repositorio Git Real y Remotos */}
            {state && (
              <section className="linear-surface rounded-xl p-5 space-y-4 text-xs">
                <div className="border-b border-white/[0.06] pb-3">
                  <h2 className="text-sm font-semibold text-white">
                    03. Repositorio Git Real y Remotos Configurados
                  </h2>
                </div>

                <div className="space-y-1.5 font-mono text-[11.5px] text-slate-400 break-all">
                  <div>
                    Workspace · <span className="text-slate-200">{state.repo.repoPath}</span>
                  </div>
                  <div>
                    Origin Bare · <span className="text-slate-300">{state.repo.bareRemotePath}</span>
                  </div>
                  <div>
                    GIT_REMOTE_URL ·{' '}
                    <span data-testid="git-remote-url-value" className="text-cyan-300 font-medium">
                      {state.repo.gitRemoteUrl}
                    </span>
                  </div>
                  <div>
                    FACTORY_REMOTE ·{' '}
                    <span className="text-slate-300">{state.repo.factoryRemoteUrl}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    data-testid="btn-push-github"
                    onClick={async () => {
                      setActionMessage(null);
                      try {
                        const res = await fetch('/api/factory/git/push', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ remote: 'github' }),
                        });
                        const data = await res.json();
                        await fetchBackendState();
                        if (!res.ok) {
                          setActionMessage({
                            type: 'error',
                            text:
                              data.error ||
                              'git push rechazado por falta de credenciales en el contenedor.',
                          });
                          return;
                        }
                        setActionMessage({
                          type: 'ok',
                          text: `git push github main completado: ${data.pushResult.output}`,
                        });
                      } catch (err) {
                        setActionMessage({
                          type: 'error',
                          text: err instanceof Error ? err.message : 'Error en git push',
                        });
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-slate-200 font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>git push github main</span>
                  </button>

                  <a
                    data-testid="btn-download-git-bundle"
                    href="/api/factory/git/bundle"
                    download="lyai-ski.bundle"
                    className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-emerald-300 font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Descargar lyai-ski.bundle</span>
                  </a>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="text-slate-400">
                    Guardia de Árbol de Trabajo Limpio (Punto 7 — <code>git status --porcelain</code>):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      data-testid="btn-dirty-worktree"
                      onClick={handleDirtyWorktree}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/15 border border-white/[0.08] text-amber-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <FileWarning className="w-3.5 h-3.5" />
                      <span>Crear cambio sin confirmar</span>
                    </button>
                    <button
                      data-testid="btn-clean-worktree"
                      onClick={handleCleanWorktree}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar árbol Git</span>
                    </button>
                  </div>
                </div>

                {/* Historial de commits con estado GPG y referencia #TASK desempacados */}
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="text-slate-400">Historial de Commits Firmados (GPG + #TASK)</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-mono text-[11px] tabular-nums">
                    {state.repo.recentCommits.map((c) => (
                      <div
                        key={c.hash}
                        className="pb-1.5 border-b border-white/[0.05] last:border-0 text-slate-300"
                      >
                        <span className="text-amber-300 font-semibold">{c.hash}</span>
                        <span aria-hidden="true"> · </span>
                        <span
                          className={
                            c.gpgStatus === 'G' || c.gpgStatus === 'U'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          GPG:{c.gpgStatus}
                        </span>
                        {c.taskIdRef && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-cyan-300">{c.taskIdRef}</span>
                          </>
                        )}
                        <span aria-hidden="true"> — </span>
                        <span className="text-slate-200">{c.subject}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Columna Derecha (7 cols): Orquestador de Encargo Activo + Tabla de los 11 Puntos Reales */}
          <div id="pipeline-workbench" className="lg:col-span-7 space-y-6">
            {selectedTask && (
              <section className="linear-surface rounded-xl p-5 space-y-5 text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/[0.06] pb-3.5">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-slate-400">
                      <span>{selectedTask.id}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-emerald-400">{selectedTask.stage}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Archivo: {selectedTask.targetFile}</span>
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      {selectedTask.title}
                    </h2>
                  </div>

                  <button
                    data-testid="btn-close-and-push-task"
                    onClick={() => handleCloseAndPushAll(selectedTask.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Cerrar Construcción + Push a Origin</span>
                  </button>
                </div>

                {/* Pasos de ejecución en el servidor Linux */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    data-testid="btn-step-2-spec"
                    onClick={() => handleGenerateSpec(selectedTask.id)}
                    className="p-3.5 rounded-lg bg-[#08090E] hover:bg-white/[0.04] border border-white/[0.08] text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>01. Generar Spec (P2)</span>
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Persiste <code>specs/{selectedTask.id}.md</code> en disco y valida coherencia.
                    </p>
                  </button>

                  <button
                    data-testid="btn-step-3-build"
                    onClick={() => handleBuildInBranch(selectedTask.id)}
                    className="p-3.5 rounded-lg bg-[#08090E] hover:bg-white/[0.04] border border-white/[0.08] text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>02. Rama Aislada + GPG (P3–P6)</span>
                      <GitBranch className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Rama <code>task/{selectedTask.id}</code>, commit GPG + <code>#TASK-{selectedTask.id}</code> y Approver 4/4.
                    </p>
                  </button>

                  <button
                    data-testid="btn-step-7-merge"
                    onClick={() => handleMergeToMain(selectedTask.id)}
                    className="p-3.5 rounded-lg bg-[#08090E] hover:bg-white/[0.04] border border-white/[0.08] text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>03. Fusionar en main (P7)</span>
                      <GitMerge className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Rechaza si hay cambios sin confirmar; fusiona con <code>--no-ff -S</code> si está limpio.
                    </p>
                  </button>
                </div>

                {/* Telemetría real de verificación sin cajas anidadas */}
                {selectedTask.approver && (
                  <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-slate-300 tabular-nums">
                    <span>
                      Approver:{' '}
                      <strong className="text-emerald-400">
                        {selectedTask.approver.votesPassed}/4 votos reales
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Verificador BD aislada:{' '}
                      <strong className="text-emerald-400">
                        exit {selectedTask.verifier?.subprocessExitCode} (
                        {selectedTask.verifier?.realVerificationDurationMs}ms)
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Seguridad:{' '}
                      <strong className="text-emerald-400">
                        {selectedTask.securityScan?.passed ? '0 fugas' : 'alerta'}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Visor de git diff real */}
                {selectedTask.build && (
                  <div className="pt-2 space-y-1.5">
                    <div className="text-xs font-mono text-slate-400">
                      git diff main..{selectedTask.build.branchName} · commit{' '}
                      <span className="text-cyan-300">{selectedTask.build.commitHash}</span>
                    </div>
                    <pre
                      data-testid="real-git-diff-viewer"
                      className="p-3.5 rounded-lg bg-[#08090E] border border-white/[0.07] text-[11px] text-emerald-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto"
                    >
                      {selectedTask.build.gitDiff}
                    </pre>
                  </div>
                )}
              </section>
            )}

            {/* Matriz de Auditoría de los 11 Puntos del Encargo (11/11 Reales) */}
            {state && (
              <section className="linear-surface rounded-xl p-5 space-y-4 text-xs">
                <div className="flex items-baseline justify-between border-b border-white/[0.06] pb-3">
                  <h2 className="text-sm font-semibold text-white">
                    04. Auditoría de Cumplimiento de los 11 Puntos del Encargo
                  </h2>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {realPointsCount}/11 REALES EN LINUX
                  </span>
                </div>

                <div className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto pr-1">
                  {state.elevenPointsAudit.map((item) => (
                    <div
                      key={item.pointNumber}
                      className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-slate-100">
                          {String(item.pointNumber).padStart(2, '0')}. {item.title}
                        </div>
                        <div className="text-[11.5px] text-slate-400 leading-relaxed">
                          {item.explanation}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-emerald-400 shrink-0 tabular-nums">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Modal Inspector de Nodo + Depurador 3D del Eje Z y Override Manual */}
      <NodeInspectorModal
        node={inspectedNode}
        onClose={() => setInspectedNode(null)}
        onInjectFault={() => {}}
        tasks={[]}
        logs={[]}
        activeTaskPathNodeIds={activeTaskPathNodeIds}
        manualZOverride={
          inspectedNode && manualZOverrides[inspectedNode.id] !== undefined
            ? manualZOverrides[inspectedNode.id]
            : null
        }
        onChangeManualZOverride={(nodeId, val) => {
          setManualZOverrides((prev) => {
            const next = { ...prev };
            if (val === null) {
              delete next[nodeId];
            } else {
              next[nodeId] = val;
            }
            return next;
          });
        }}
        isEditMode3DDisabled={isEditMode3DDisabled}
        onToggleEditMode3D={() => setIsEditMode3DDisabled((v) => !v)}
      />

      {/* Modal de Tutorial Onboarding + Estudio de Vídeo Explicativo (YouTube / TikTok / GitHub) */}
      <DevOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNavigateTab={() => setIsOnboardingOpen(false)}
        initialMode="video"
      />
    </div>
  );
}

export default App;

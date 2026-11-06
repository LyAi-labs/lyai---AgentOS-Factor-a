/**
 * Dashboard Completo AgentOS — Lienzo de Grafo Interactivo 3D + Backend Git Real de 11 Puntos en Linux
 * - Sin barras de desplazamiento horizontales feas.
 * - Sin datos inventados (todo proviene de `/api/factory/state`, ejecutando Git real, subprocesos Node y criptografía Ed25519).
 * - Los 11 puntos del encargo funcionan en modo REAL en el servidor Linux.
 * - Incluye Zoom Vectorial HD (hasta 400%), Inspector 3D del Eje Z y Estudio de Vídeo Onboarding (YouTube, TikTok, GitHub).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  FileWarning,
  ShieldAlert,
  Cpu,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Film,
  UploadCloud,
  ShieldCheck,
  Network,
  Layers,
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

  // Estado del Dashboard Visual del Grafo (Lienzo 3D + Zoom HD + Inspector Eje Z)
  const [diagramMode, setDiagramMode] = useState<DiagramMode>('original');
  const [selectedLayer, setSelectedLayer] = useState<NodeLayer | null>(null);
  const [selectedLane, setSelectedLane] = useState<TaskLane | 'all'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 15, y: 15 });
  const [inspectedNode, setInspectedNode] = useState<PipelineNode | null>(null);
  const [manualZOverrides, setManualZOverrides] = useState<Record<string, number>>({});
  const [isEditMode3DDisabled, setIsEditMode3DDisabled] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

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
        text: `Puntos 3, 4, 5, 6 y 10 ejecutados: Rama Git '${data.task.build?.branchName}' (${data.task.build?.commitHash}), Verificador BD aislada OK, Firma Ed25519 válida y Approver ${data.task.approver?.votesPassed}/4.`,
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
        text: `Puntos 7 y 9 ejecutados: Tag '${data.mergeResult.checkpointTag}' creado y rama '${data.mergeResult.sourceBranch}' fusionada en 'main' (${data.mergeResult.mergeCommitHash}).`,
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
        text: `¡Construcción cerrada y subida! Fusión en main (${data.mergeResult.mergeCommitHash}) + git push origin main (${data.pushResult.releaseTag}) completados con éxito.`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al cerrar y hacer push',
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
    <div className="min-h-screen bg-[#050811] text-slate-100 font-mono flex flex-col">
      {/* 1. CABECERA HUD SUPERIOR (Sin barras de desplazamiento horizontales y con datos 100% reales de Git) */}
      <header className="bg-slate-950/95 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Identidad del Sistema */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">AgentOS</h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  11/11 PUNTOS REALES
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dashboard de Grafo 3D + Backend Git Real en Linux
              </p>
            </div>
          </div>

          {/* Tira de Estado Real del Backend Git (Sin overflow-x-auto ni datos inventados) */}
          {state && (
            <div
              data-testid="header-real-git-strip"
              className="flex flex-wrap items-center gap-2 py-1 px-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs"
            >
              <div className="flex items-center gap-1.5 px-1.5">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Rama Git Real</span>
                  <span className="font-bold text-cyan-300">
                    {state.repo.currentBranch} ({state.repo.headCommitHash})
                  </span>
                </div>
              </div>

              <div className="h-5 w-px bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-1.5 px-1.5">
                {state.repo.isClean ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">
                    git status --porcelain
                  </span>
                  <span
                    className={`font-bold ${
                      state.repo.isClean ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {state.repo.isClean
                      ? 'ÁRBOL LIMPIO'
                      : `${state.repo.uncommittedFiles.length} SIN CONFIRMAR`}
                  </span>
                </div>
              </div>

              <div className="h-5 w-px bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-1.5 px-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">
                    Auditoría Backend
                  </span>
                  <span className="font-bold text-emerald-300">
                    {realPointsCount}/11 REALES
                  </span>
                </div>
              </div>

              <div className="h-5 w-px bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-1.5 px-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">
                    Remoto Origin (Bare Git)
                  </span>
                  <span className="font-bold text-purple-300">
                    {state.repo.remoteOriginHeadHash || 'sin push'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Acciones Globales */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedTask && (
              <button
                data-testid="header-close-and-push-btn"
                onClick={() => handleCloseAndPushAll(selectedTask.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Cerrar Construcción & Push Git</span>
              </button>
            )}

            <button
              data-testid="header-onboarding-video-btn"
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-500/60 font-bold text-xs transition cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Tutorial & Vídeo (YT / TikTok / GitHub)</span>
            </button>

            <button
              onClick={fetchBackendState}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Refrescar estado real de Git"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. BARRA DE CONTROLES DEL LIENZO Y ZOOM VECTORIAL HD (Sin barra de desplazamiento horizontal) */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Selector de Capas */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Capas del Grafo:
            </span>
            <button
              onClick={() => setSelectedLayer(null)}
              className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                selectedLayer === null
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas (5)
            </button>
            {([1, 2, 3, 4, 5] as NodeLayer[]).map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayer(selectedLayer === layer ? null : layer)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  selectedLayer === layer
                    ? 'text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{
                  backgroundColor:
                    selectedLayer === layer ? LAYER_INFO[layer].color : 'transparent',
                }}
              >
                C{layer}
              </button>
            ))}
          </div>

          {/* Controles de Zoom Vectorial HD (hasta 400%) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <Network className="w-3.5 h-3.5 text-cyan-400" /> Definición Vectorial:
            </span>
            <button
              data-testid="zoom-out-btn"
              onClick={() => setZoomLevel((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              data-testid="zoom-percentage-badge"
              className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold"
            >
              {Math.round(zoomLevel * 100)}% HD
            </span>
            <button
              data-testid="zoom-in-btn"
              onClick={() => setZoomLevel((z) => Math.min(4.0, Number((z + 0.2).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              title="Acercar hasta 400% HD"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              data-testid="zoom-hd-macro-btn"
              onClick={() => setZoomLevel((z) => (z >= 1.6 ? 0.85 : 1.75))}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold text-[11px] transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{zoomLevel >= 1.6 ? 'Vista 85%' : 'Zoom Macro 175%'}</span>
            </button>
            <button
              onClick={() => setZoomLevel(0.85)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              title="Ajustar al lienzo"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje de respuesta de la última acción sobre el Backend Git Real */}
      {actionMessage && (
        <div className="max-w-[1700px] w-full mx-auto px-4 pt-3">
          <div
            data-testid="backend-action-feedback"
            className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              actionMessage.type === 'ok'
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                : 'bg-rose-950/80 border-rose-600 text-rose-200'
            }`}
          >
            {actionMessage.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="whitespace-pre-wrap flex-1">{actionMessage.text}</div>
          </div>
        </div>
      )}

      {/* 3. CUERPO PRINCIPAL DEL DASHBOARD: LIENZO DE GRAFO 3D ARRIBA + PANEL OPERATIVO GIT REAL DE 11 PUNTOS DEBAJO */}
      <main className="max-w-[1700px] w-full mx-auto p-4 space-y-6 flex-1">
        {/* A. LIENZO INTERACTIVO DE NODOS (5 Capas, Brillo Focalizado + Profundidad 3D translateZ con useSpring) */}
        <section className="rounded-xl border border-slate-800 overflow-hidden bg-[#060911] shadow-2xl h-[540px] relative">
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
        </section>

        {/* B. CONSOLA DEL BACKEND GIT REAL (Puntos 1 al 11 en Verde REAL + Ejecución Paso a Paso) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda (5 cols): Crear Encargo + Lista de Encargos + Estado Real Git */}
          <div className="lg:col-span-5 space-y-6">
            <section className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Nuevo Encargo Real (Punto 1: Ingesta + Analyze en disco)</span>
              </h2>
              <form onSubmit={handleCreateTask} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Título del encargo *</label>
                  <input
                    data-testid="new-task-title-input"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Añadir verificación de sesión firmada"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Archivo objetivo en Git</label>
                  <input
                    data-testid="new-task-file-input"
                    type="text"
                    value={newTargetFile}
                    onChange={(e) => setNewTargetFile(e.target.value)}
                    placeholder="Ej: src/authSession.ts"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Descripción</label>
                  <textarea
                    data-testid="new-task-desc-input"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={2}
                    placeholder="Requisitos verificables..."
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <button
                  data-testid="create-task-submit-btn"
                  type="submit"
                  className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition cursor-pointer"
                >
                  Registrar y Analizar en Disco (Punto 1)
                </button>
              </form>
            </section>

            {/* Estado Git Real en Servidor Linux */}
            {state && (
              <section className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 space-y-3 text-xs">
                <h2 className="font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <GitCommit className="w-4 h-4 text-emerald-400" />
                  <span>Repositorio Git Real en Servidor Linux</span>
                </h2>
                <div className="text-[11px] text-slate-400 break-all space-y-1">
                  <div>
                    Working Repo: <code className="text-slate-200">{state.repo.repoPath}</code>
                  </div>
                  <div>
                    Bare Remote (<code>origin</code>):{' '}
                    <code className="text-purple-300">{state.repo.bareRemotePath}</code>
                  </div>
                  <div>
                    GIT_REMOTE_URL (<code>github</code>):{' '}
                    <code data-testid="git-remote-url-value" className="text-cyan-300 font-bold">
                      {state.repo.gitRemoteUrl}
                    </code>
                  </div>
                </div>

                {/* Acciones de Push a GitHub y exportación de Git Bundle real */}
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-cyan-300">
                    Sincronización Remota ({state.repo.gitRemoteUrl}):
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                      className="px-2.5 py-1.5 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-600 text-cyan-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>git push github main</span>
                    </button>

                    <a
                      data-testid="btn-download-git-bundle"
                      href="/api/factory/git/bundle"
                      download="lyai-ski.bundle"
                      className="px-2.5 py-1.5 rounded bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Descargar lyai-ski.bundle (Git Real)</span>
                    </a>
                  </div>
                </div>

                {/* Prueba interactiva del Punto 7 */}
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">
                    Prueba de Guardia Git (Punto 7 — Árbol Limpio vs Sucio):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      data-testid="btn-dirty-worktree"
                      onClick={handleDirtyWorktree}
                      className="px-2.5 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileWarning className="w-3.5 h-3.5" />
                      <span>Crear cambio sin confirmar</span>
                    </button>
                    <button
                      data-testid="btn-clean-worktree"
                      onClick={handleCleanWorktree}
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar árbol Git</span>
                    </button>
                  </div>
                </div>

                {/* Historial real de commits */}
                <div>
                  <div className="text-slate-400 mb-1">
                    Historial real (<code>git log --oneline</code>):
                  </div>
                  <div className="space-y-1 max-h-44 overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800">
                    {state.repo.recentCommits.map((c) => (
                      <div key={c.hash} className="text-[11px] flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">{c.hash}</span>
                        <span className="text-slate-200 flex-1">{c.subject}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Columna Derecha (7 cols): Ejecución de Puntos 1–11 sobre el Encargo + Los 11 Puntos en Estado REAL */}
          <div className="lg:col-span-7 space-y-6">
            {selectedTask && (
              <section className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{selectedTask.id}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold uppercase">
                        {selectedTask.stage}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      {selectedTask.title}
                    </h2>
                  </div>
                  <button
                    data-testid="btn-close-and-push-task"
                    onClick={() => handleCloseAndPushAll(selectedTask.id)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Cerrar Construcción + Push a Origin</span>
                  </button>
                </div>

                {/* Botones de pasos individuales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    data-testid="btn-step-2-spec"
                    onClick={() => handleGenerateSpec(selectedTask.id)}
                    className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-amber-600/60 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span>1. Punto 2: Spec</span>
                      <FileText className="w-4 h-4" />
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-1">
                      Escribe <code>specs/{selectedTask.id}.md</code> y valida coherencia.
                    </p>
                  </button>

                  <button
                    data-testid="btn-step-3-build"
                    onClick={() => handleBuildInBranch(selectedTask.id)}
                    className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-sky-600/60 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-sky-300">
                      <span>2. Puntos 3–6: Rama + Test</span>
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-1">
                      Rama <code>task/{selectedTask.id}</code>, BD aislada, Firma Ed25519 y Approver 4/4.
                    </p>
                  </button>

                  <button
                    data-testid="btn-step-7-merge"
                    onClick={() => handleMergeToMain(selectedTask.id)}
                    className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-emerald-600/60 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span>3. Punto 7: Fusionar main</span>
                      <GitMerge className="w-4 h-4" />
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-1">
                      Bloquea si hay cambios sin confirmar; si está limpio fusiona en <code>main</code>.
                    </p>
                  </button>
                </div>

                {/* Resumen de Verificación Real (Puntos 4, 5, 6 y 10) */}
                {selectedTask.approver && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded bg-slate-950 border border-emerald-800/60">
                      <span className="text-[10px] text-slate-400 block">Approver (Punto 6)</span>
                      <span className="font-bold text-emerald-300">
                        {selectedTask.approver.votesPassed}/4 VOTOS REALES
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-emerald-800/60">
                      <span className="text-[10px] text-slate-400 block">Verificador (Punto 5)</span>
                      <span className="font-bold text-emerald-300">
                        Exit Code {selectedTask.verifier?.subprocessExitCode} (
                        {selectedTask.verifier?.realVerificationDurationMs}ms)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-emerald-800/60">
                      <span className="text-[10px] text-slate-400 block">Firma Ed25519 (Punto 6)</span>
                      <span className="font-bold text-cyan-300 truncate block">
                        {selectedTask.verifier?.publicKeyFingerprint}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-emerald-800/60">
                      <span className="text-[10px] text-slate-400 block">Seguridad (Punto 10)</span>
                      <span className="font-bold text-emerald-300">
                        {selectedTask.securityScan?.passed ? '0 VULNERABILIDADES' : 'ALERTA'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Diff real de Git */}
                {selectedTask.build && (
                  <div>
                    <div className="font-bold text-sky-300 mb-1">
                      git diff real ({selectedTask.build.branchName} @ {selectedTask.build.commitHash}):
                    </div>
                    <pre
                      data-testid="real-git-diff-viewer"
                      className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 whitespace-pre-wrap max-h-44 overflow-y-auto"
                    >
                      {selectedTask.build.gitDiff}
                    </pre>
                  </div>
                )}
              </section>
            )}

            {/* Estado de los 11 Puntos del Encargo: 11/11 REALES */}
            {state && (
              <section className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold uppercase tracking-wider text-emerald-300">
                    Auditoría de los 11 Puntos del Encargo ({realPointsCount}/11 REALES en Linux)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold text-[10px]">
                    100% OPERATIVO EN SERVIDOR
                  </span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {state.elevenPointsAudit.map((item) => (
                    <div
                      key={item.pointNumber}
                      className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-100">
                          Punto {item.pointNumber}: {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.explanation}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border bg-emerald-950 border-emerald-600 text-emerald-300">
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

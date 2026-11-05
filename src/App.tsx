/**
 * AgentOS - Factoría de Desarrollo Agéntico
 * Orquestador Principal de la Aplicación Full-Stack
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { usePipelineSocket } from './hooks/usePipelineSocket';
import { HeaderHUD } from './components/HeaderHUD';
import { LayerFilterBar, ActiveTab } from './components/LayerFilterBar';
import { NodeGraphCanvas } from './components/NodeGraphCanvas';
import { NodeInspectorModal } from './components/NodeInspectorModal';
import { TaskQueueDrawer } from './components/TaskQueueDrawer';
import { ArtifactViewerModal } from './components/ArtifactViewerModal';
import { NewTaskModal } from './components/NewTaskModal';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { ActivityLogStream } from './components/ActivityLogStream';
import { ProposalDiffBanner } from './components/ProposalDiffBanner';
import { VersionControlDrawer } from './components/VersionControlDrawer';
import { SimulationEngineModal } from './components/SimulationEngineModal';
import { ThroughputProjectionPanel } from './components/ThroughputProjectionPanel';
import { ExportReportModal } from './components/ExportReportModal';
import { DevOnboardingModal } from './components/DevOnboardingModal';
import { ResourceAllocationModal } from './components/ResourceAllocationModal';
import {
  PipelineNode,
  PipelineTask,
  NodeLayer,
  TaskLane,
  DiagramMode,
  AgentCommit,
  AgentBranch,
  LaneBudgetCap,
} from './types/pipeline';
import {
  getNodesForMode,
  getEdgesForMode,
} from './pipeline/graphData';
import {
  getInitialBranchesAndCommits,
  revertNodesToCommit,
} from './pipeline/vcs';
import {
  DEFAULT_LANE_BUDGETS,
  calculateAgentDensityMap,
  calculateLaneResourceConsumption,
} from './pipeline/resourceManager';
import { Sparkles } from 'lucide-react';

export default function App() {
  const {
    nodes,
    edges,
    tasks,
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
  } = usePipelineSocket();

  // Estados de interfaz
  const [activeTab, setActiveTab] = useState<ActiveTab>('canvas');
  const [selectedLayer, setSelectedLayer] = useState<NodeLayer | null>(null);
  const [selectedLane, setSelectedLane] = useState<TaskLane | 'all'>('all');
  const [diagramMode, setDiagramMode] = useState<DiagramMode>('original');

  // Agent Density Heat-Map & Resource Allocation Manager
  const [heatmapEnabled, setHeatmapEnabled] = useState<boolean>(true);
  const [laneBudgets, setLaneBudgets] = useState<Record<TaskLane, LaneBudgetCap>>(DEFAULT_LANE_BUDGETS);

  // Sistema de Control de Versiones (Agent VCS)
  const [vcsState, setVcsState] = useState(() => getInitialBranchesAndCommits(nodes));
  const [currentBranch, setCurrentBranch] = useState<string>('main');

  // Modales y paneles emergentes
  const [inspectedNode, setInspectedNode] = useState<PipelineNode | null>(null);
  const [selectedArtifactTask, setSelectedArtifactTask] = useState<PipelineTask | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  // Zoom y Paneo del Canvas
  const [zoomLevel, setZoomLevel] = useState(0.85);
  const [panOffset, setPanOffset] = useState({ x: 30, y: 20 });

  // Confeti en finalización de despliegue
  const prevCompletedCountRef = useRef(telemetry.completedTasksCount);
  useEffect(() => {
    if (telemetry.completedTasksCount > prevCompletedCountRef.current) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#38bdf8', '#34d399', '#facc15', '#a855f7'],
        });
      } catch {
        // Fallback
      }
    }
    prevCompletedCountRef.current = telemetry.completedTasksCount;
  }, [telemetry.completedTasksCount]);

  // Controles de zoom
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z * 1.15, 2.0));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z * 0.85, 0.45));
  const handleFitView = () => {
    setZoomLevel(0.85);
    setPanOffset({ x: 30, y: 20 });
  };

  // Nodos y Aristas reactivos según modo seleccionado
  const modeNodes = getNodesForMode(diagramMode);
  const modeEdges = getEdgesForMode(diagramMode);

  const activeNodes = useMemo(
    () =>
      modeNodes.map((baseNode) => {
        const liveNode = nodes.find((n) => n.id === baseNode.id);
        if (!liveNode) return baseNode;
        return {
          ...baseNode,
          status: liveNode.status,
          currentTaskId: liveNode.currentTaskId,
          metrics: {
            ...baseNode.metrics,
            errorCount: liveNode.metrics.errorCount,
            successCount: liveNode.metrics.successCount,
          },
        };
      }),
    [modeNodes, nodes]
  );

  const activeEdges = useMemo(
    () =>
      modeEdges.map((baseEdge) => {
        const liveEdge = edges.find((e) => e.source === baseEdge.source && e.target === baseEdge.target);
        return {
          ...baseEdge,
          active: liveEdge ? liveEdge.active : false,
        };
      }),
    [modeEdges, edges]
  );

  // Cálculo reactivo del Heat-Map de Densidad Agéntica y Consumo de Recursos por Carril
  const densityMap = useMemo(
    () => calculateAgentDensityMap(activeNodes, tasks),
    [activeNodes, tasks]
  );

  const laneConsumption = useMemo(
    () => calculateLaneResourceConsumption(activeNodes, tasks, laneBudgets, speed),
    [activeNodes, tasks, laneBudgets, speed]
  );

  const handleUpdateLaneBudget = (lane: TaskLane, updated: Partial<LaneBudgetCap>) => {
    setLaneBudgets((prev) => ({
      ...prev,
      [lane]: {
        ...prev[lane],
        ...updated,
      },
    }));
  };

  const handleResetLaneBudgets = () => {
    setLaneBudgets(DEFAULT_LANE_BUDGETS);
  };

  // Manejo de VCS (Commits, Ramas y Rollback)
  const handleCreateBranch = (branchName: string) => {
    const newBranch: AgentBranch = {
      name: branchName,
      headCommitHash: vcsState.commits[0]?.hash || 'a1b2c3d',
      createdAt: Date.now(),
    };
    setVcsState((prev) => ({
      ...prev,
      branches: [newBranch, ...prev.branches],
    }));
    setCurrentBranch(branchName);
  };

  const handleCreateCommit = (newCommit: AgentCommit) => {
    setVcsState((prev) => ({
      ...prev,
      commits: [newCommit, ...prev.commits],
      branches: prev.branches.map((b) =>
        b.name === newCommit.branch ? { ...b, headCommitHash: newCommit.hash } : b
      ),
    }));
  };

  const handleRevertCommit = (commit: AgentCommit) => {
    revertNodesToCommit(commit, nodes);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Header HUD con Telemetría Global, Barras de Presupuesto por Carril y Controles */}
      <HeaderHUD
        telemetry={telemetry}
        engineStatus={engineStatus}
        speed={speed}
        isConnected={isConnected}
        onPlay={startEngine}
        onPause={pauseEngine}
        onStep={stepEngine}
        onReset={resetPipeline}
        onSetSpeed={setSpeedMultiplier}
        onOpenNewTask={() => setIsNewTaskModalOpen(true)}
        onOpenArchitecture={() => setIsArchitectureModalOpen(true)}
        onOpenThroughput={() => setActiveTab('throughput')}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenTour={() => setIsTourModalOpen(true)}
        laneConsumption={laneConsumption}
        onOpenResources={() => setActiveTab('resources')}
      />

      {/* 2. Barra de Filtros, Modos de Vista y Selector de Propuesta */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 bg-[#0a0f1d] px-4 py-1.5 gap-2">
        <LayerFilterBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedLayer={selectedLayer}
          onSelectLayer={setSelectedLayer}
          selectedLane={selectedLane}
          onSelectLane={setSelectedLane}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          heatmapEnabled={heatmapEnabled}
          onToggleHeatmap={() => setHeatmapEnabled((v) => !v)}
        />

        {/* Selector de Modo: Diagrama Actual vs Propuesta 2.0 */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono shrink-0">
          <button
            onClick={() => setDiagramMode('original')}
            className={`px-3 py-1 rounded-md transition font-semibold ${
              diagramMode === 'original'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tu Diagrama Actual
          </button>

          <button
            onClick={() => setDiagramMode('proposed')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition font-semibold ${
              diagramMode === 'proposed'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Propuesta AgentOS 2.0</span>
          </button>
        </div>
      </div>

      {/* 3. Área Central según Pestaña Activa */}
      <main className="flex-1 relative overflow-hidden bg-[#070b14] flex flex-col">
        {/* Banner de Comparativa Arquitectónica (visible en vista canvas) */}
        {activeTab === 'canvas' && (
          <ProposalDiffBanner
            diagramMode={diagramMode}
            onToggleMode={setDiagramMode}
            onOpenArchitectureModal={() => setIsArchitectureModalOpen(true)}
          />
        )}

        {/* PESTAÑA: LIENZO DE NODOS */}
        {activeTab === 'canvas' && (
          <div className="flex-1 relative overflow-hidden">
            <NodeGraphCanvas
              nodes={activeNodes}
              edges={activeEdges}
              selectedLayer={selectedLayer}
              selectedLane={selectedLane}
              diagramMode={diagramMode}
              onSelectNode={(node) => setInspectedNode(node)}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
              onPanChange={setPanOffset}
              onZoomChange={setZoomLevel}
              heatmapEnabled={heatmapEnabled}
              onToggleHeatmap={() => setHeatmapEnabled((v) => !v)}
              densityMap={densityMap}
            />
          </div>
        )}

        {/* PESTAÑA: TABLERO DE TAREAS */}
        {activeTab === 'board' && (
          <div className="h-full overflow-y-auto flex-1">
            <TaskQueueDrawer
              tasks={tasks}
              onSelectTask={(task) => {
                const targetNode = nodes.find((n) => n.id === task.currentNodeId);
                if (targetNode) setInspectedNode(targetNode);
              }}
              onViewArtifacts={(task) => setSelectedArtifactTask(task)}
            />
          </div>
        )}

        {/* PESTAÑA: EVIDENCIAS & DIFF */}
        {activeTab === 'artifacts' && (
          <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-mono text-white">
                  Catálogo de Evidencias Técnicas & Diffs
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Artefactos generados por los agentes del flujo (Specs, unified diffs, pruebas Docker y Playwright)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.flatMap((t) => t.artifacts).map((art) => (
                <div
                  key={art.id}
                  onClick={() => {
                    const parentTask = tasks.find((t) => t.artifacts.some((a) => a.id === art.id));
                    if (parentTask) setSelectedArtifactTask(parentTask);
                  }}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 cursor-pointer transition space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {art.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
                      {art.type}
                    </span>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10.5px] font-mono text-slate-400 line-clamp-4">
                    {art.content}
                  </pre>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                    <span>Emisor: {art.nodeId}</span>
                    <span>{new Date(art.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA: CONTROL DE VERSIONES (VCS) */}
        {activeTab === 'vcs' && (
          <div className="h-full overflow-y-auto flex-1">
            <VersionControlDrawer
              nodes={nodes}
              branches={vcsState.branches}
              commits={vcsState.commits}
              currentBranch={currentBranch}
              onSelectBranch={setCurrentBranch}
              onCreateBranch={handleCreateBranch}
              onCreateCommit={handleCreateCommit}
              onRevertCommit={handleRevertCommit}
            />
          </div>
        )}

        {/* PESTAÑA: SIMULADOR SANDBOX */}
        {activeTab === 'simulation' && (
          <div className="h-full overflow-y-auto flex-1">
            <SimulationEngineModal
              nodes={nodes}
              isOpen={true}
              onClose={() => setActiveTab('canvas')}
            />
          </div>
        )}

        {/* PESTAÑA: TENDENCIA D3 THROUGHPUT */}
        {activeTab === 'throughput' && (
          <div className="h-full overflow-y-auto flex-1">
            <ThroughputProjectionPanel
              tasks={tasks}
              speed={speed}
              onClose={() => setActiveTab('canvas')}
            />
          </div>
        )}

        {/* PESTAÑA: GESTOR DE ASIGNACIÓN DE RECURSOS (CPU/RAM POR CARRIL) */}
        {activeTab === 'resources' && (
          <div className="h-full overflow-y-auto flex-1">
            <ResourceAllocationModal
              isOpen={true}
              nodes={activeNodes}
              budgets={laneBudgets}
              consumption={laneConsumption}
              densityMap={densityMap}
              onUpdateBudget={handleUpdateLaneBudget}
              onResetBudgets={handleResetLaneBudgets}
              onClose={() => setActiveTab('canvas')}
            />
          </div>
        )}

        {/* PESTAÑA: ARQUITECTURA & DOCS */}
        {activeTab === 'architecture' && (
          <div className="h-full overflow-y-auto flex-1">
            <ArchitectureDocsModal
              isOpen={true}
              onClose={() => setActiveTab('canvas')}
            />
          </div>
        )}
      </main>

      {/* 4. Consola de Registro de Actividad Inferior */}
      <ActivityLogStream logs={activityLogs} />

      {/* 5. Modales Emergentes */}
      <NodeInspectorModal
        node={inspectedNode}
        tasks={tasks}
        logs={activityLogs}
        onClose={() => setInspectedNode(null)}
        onInjectFault={(nodeId) => {
          injectFault(nodeId);
        }}
      />

      <ArtifactViewerModal
        task={selectedArtifactTask}
        onClose={() => setSelectedArtifactTask(null)}
      />

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onCreateTask={(taskParams) => {
          createTask(taskParams);
        }}
      />

      {isArchitectureModalOpen && (
        <ArchitectureDocsModal
          isOpen={isArchitectureModalOpen}
          onClose={() => setIsArchitectureModalOpen(false)}
        />
      )}

      {/* 6. Modal de Exportación JSON de Telemetría y Grafo */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        nodes={activeNodes}
        edges={activeEdges}
        tasks={tasks}
        telemetry={telemetry}
        activityLogs={activityLogs}
        diagramMode={diagramMode}
        speedMultiplier={speed}
        engineStatus={engineStatus}
      />

      {/* 7. Modal de Onboarding y Tour Interactivo para Desarrolladores */}
      <DevOnboardingModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
      />
    </div>
  );
}

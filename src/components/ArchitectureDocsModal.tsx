/**
 * AgentOS - Especificación de Arquitectura C.R.A.F.T., Esquemas y Docker
 */

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Database,
  Server,
  Terminal,
  FileCode2,
  GitBranch,
  Layers,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { PROPOSED_OPTIMIZATIONS_SUMMARY } from '../pipeline/graphData';

interface ArchitectureDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeDocTab, setActiveDocTab] = useState<'proposal' | 'schema' | 'api' | 'docker' | 'tree'>('proposal');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const dockerComposeCode = `version: "3.8"

services:
  agentos-factory:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: agentos-factory
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    volumes:
      - ./evidence_vault:/app/evidence_vault
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  redis-cache:
    image: redis:7-alpine
    container_name: agentos-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes`;

  const postgresDDL = `-- ESQUEMA DE DATOS RELACIONAL Y GRAFO DE NODO EN POSTGRESQL

CREATE TYPE node_layer_enum AS ENUM ('1', '2', '3', '4', '5');
CREATE TYPE task_priority_enum AS ENUM ('P0_URGENT', 'P1_HIGH', 'P2_NORMAL', 'P3_LOW');
CREATE TYPE task_lane_enum AS ENUM ('standard', 'express', 'urgent');
CREATE TYPE task_status_enum AS ENUM ('queued', 'running', 'completed', 'failed');

-- Tabla de Tareas del Pipeline
CREATE TABLE tasks (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority task_priority_enum NOT NULL DEFAULT 'P2_NORMAL',
    lane task_lane_enum NOT NULL DEFAULT 'standard',
    status task_status_enum NOT NULL DEFAULT 'queued',
    progress INT NOT NULL DEFAULT 0,
    current_node_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_tokens INT DEFAULT 0,
    duration_ms INT DEFAULT 0
);

-- Tabla de Nodos del Grafo
CREATE TABLE pipeline_nodes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    label VARCHAR(64) NOT NULL,
    layer node_layer_enum NOT NULL,
    category VARCHAR(32) NOT NULL, -- user_ui, agent_logic, policy, etc.
    operational_state VARCHAR(16) DEFAULT 'HECHO', -- HECHO | EN PRUEBA
    engine_tag VARCHAR(64),
    x INT NOT NULL,
    y INT NOT NULL
);

-- Tabla de Aristas y Conectores de Topología
CREATE TABLE pipeline_edges (
    id VARCHAR(64) PRIMARY KEY,
    source_node_id VARCHAR(64) REFERENCES pipeline_nodes(id),
    target_node_id VARCHAR(64) REFERENCES pipeline_nodes(id),
    lane task_lane_enum NOT NULL,
    label VARCHAR(64)
);

-- Tabla de Evidencias y Artefactos
CREATE TABLE task_artifacts (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(32) REFERENCES tasks(id) ON DELETE CASCADE,
    node_id VARCHAR(64) REFERENCES pipeline_nodes(id),
    type VARCHAR(32) NOT NULL, -- code_diff, spec_doc, test_report, ui_snapshot
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-950/70 border border-purple-700 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white">
                Arquitectura de la Factoría Agéntica • Documento C.R.A.F.T.
              </h3>
              <p className="text-xs text-slate-400">
                Diseño del sistema, modelos de datos, endpoints y propuesta de optimización
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveDocTab('proposal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeDocTab === 'proposal'
                ? 'bg-purple-950 text-purple-300 border border-purple-600 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Propuesta vs Diagrama Actual</span>
          </button>

          <button
            onClick={() => setActiveDocTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeDocTab === 'schema'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-600 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Esquema SQL & Grafo</span>
          </button>

          <button
            onClick={() => setActiveDocTab('api')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeDocTab === 'api'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>API REST & WebSocket</span>
          </button>

          <button
            onClick={() => setActiveDocTab('docker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeDocTab === 'docker'
                ? 'bg-amber-950 text-amber-300 border border-amber-600 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Docker & Ejecución</span>
          </button>

          <button
            onClick={() => setActiveDocTab('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeDocTab === 'tree'
                ? 'bg-slate-800 text-slate-200 border border-slate-600 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Árbol de Código</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono bg-slate-950 flex-1">
          {/* TAB: PROPUESTA VS DIAGRAMA ACTUAL */}
          {activeDocTab === 'proposal' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 space-y-2">
                <span className="text-purple-300 font-bold text-sm block">
                  💡 Análisis de tu Diagrama y Propuesta Optimizada (AgentOS 2.0)
                </span>
                <p className="text-slate-300 leading-relaxed font-sans text-xs">
                  Tu diagrama actual tiene una segmentación funcional muy limpia y bien pensada en 5 capas. Para llevarlo a un nivel de producción hiper-escalable en una Arena de Agentes de Código, proponemos 4 optimizaciones de alto impacto:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROPOSED_OPTIMIZATIONS_SUMMARY.map((opt, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-xs">{opt.title}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                        {opt.impact}
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Matriz comparativa */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
                <span className="font-bold text-slate-200 block mb-3 text-xs">
                  Tabla Comparativa: Diagrama Actual vs Propuesta AgentOS 2.0
                </span>
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 pr-4">Dimensión</th>
                      <th className="py-2 pr-4">Diagrama Actual (Blueprint)</th>
                      <th className="py-2">Propuesta AgentOS 2.0</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans text-xs">
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-400">Preparación de Spec</td>
                      <td className="py-2.5 text-slate-400">Secuencial (Mockup → Coherencia → Spec writer)</td>
                      <td className="py-2.5 text-emerald-400 font-bold">Speculative Spike concurrente (-42% tiempo)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-400">Ciclo de Error UI</td>
                      <td className="py-2.5 text-slate-400">Loop ciego "falla · máx 2"</td>
                      <td className="py-2.5 text-emerald-400 font-bold">Self-Healing con inyección de aserciones DOM</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-400">Retroalimentación rev &lt;24h</td>
                      <td className="py-2.5 text-slate-400">Línea discontinua pasiva hacia Brain</td>
                      <td className="py-2.5 text-emerald-400 font-bold">Vector Vault continuo con precalentamiento de caché</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-400">Carril Urgencia SSH</td>
                      <td className="py-2.5 text-slate-400">Bypass manual directo</td>
                      <td className="py-2.5 text-emerald-400 font-bold">Bypass con Checkpoint atómico y 1-click Rollback</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ESQUEMA SQL */}
          {activeDocTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">
                  Definición DDL en PostgreSQL (Relacional + Topología de Grafos)
                </span>
                <button
                  onClick={() => copyToClipboard(postgresDDL, 'sql')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedSection === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'sql' ? 'Copiado' : 'Copiar DDL'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 overflow-x-auto text-[11px] leading-relaxed">
                {postgresDDL}
              </pre>
            </div>
          )}

          {/* TAB: API REST & WS */}
          {activeDocTab === 'api' && (
            <div className="space-y-4">
              <span className="text-slate-300 font-bold block">
                Especificación de Endpoints REST & Protocolo WebSocket
              </span>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-cyan-400">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-[10px]">GET</span>
                    <span>/api/pipeline/state</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 font-sans">
                    Retorna el estado global del grafo, nodos, tareas activas, telemetría consolidada y logs.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px]">POST</span>
                    <span>/api/pipeline/task</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 font-sans">
                    Crea y encola una nueva tarea. Body: {'{ title, description, priority: "P0_URGENT"|"P1_HIGH"..., lane: "standard"|"express"|"urgent" }'}.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-purple-400">
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-[10px]">WS</span>
                    <span>/ws</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 font-sans">
                    Canal bidireccional. Mensajes emitidos: <code>INIT_STATE</code>, <code>STATE_UPDATE</code>. Acciones recibidas: <code>START_ENGINE</code>, <code>PAUSE_ENGINE</code>, <code>STEP_ENGINE</code>, <code>SET_SPEED</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DOCKER & EJECUCIÓN */}
          {activeDocTab === 'docker' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">
                  Configuración Contenerizada (Docker Compose)
                </span>
                <button
                  onClick={() => copyToClipboard(dockerComposeCode, 'docker')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedSection === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'docker' ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 overflow-x-auto text-[11px] leading-relaxed">
                {dockerComposeCode}
              </pre>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">Comandos de Ejecución Local:</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div><code># 1. Levantar servidor completo (Dev Server + WebSocket + Vite)</code></div>
                  <div className="text-cyan-300">npm run dev</div>
                  <div className="pt-2"><code># 2. Ejecutar suite de pruebas unitarias de la máquina de estados</code></div>
                  <div className="text-emerald-300">npm test</div>
                  <div className="pt-2"><code># 3. Compilación para producción</code></div>
                  <div className="text-indigo-300">npm run build && npm start</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ÁRBOL DE CÓDIGO */}
          {activeDocTab === 'tree' && (
            <div className="space-y-3">
              <span className="text-slate-300 font-bold block">
                Estructura de Directorios Modular
              </span>
              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 overflow-x-auto text-[11px] leading-relaxed">
{`/
├── server.ts                       # Servidor Express + WebSocket + proxy API
├── src/
│   ├── types/
│   │   └── pipeline.ts             # Modelos de dominio, estados, nodos y eventos
│   ├── pipeline/
│   │   ├── graphData.ts            # Topología de las 5 capas y leyenda
│   │   ├── engine.ts               # Máquina de estados desacoplada y telemetría
│   │   └── engine.test.ts          # Pruebas unitarias de enrutamiento y transiciones
│   ├── hooks/
│   │   └── usePipelineSocket.ts    # Sincronización WS y fallback reactivo
│   ├── components/
│   │   ├── HeaderHUD.tsx           # Barra superior con telemetría en vivo y controles
│   │   ├── LayerFilterBar.tsx      # Barra de pestañas, capas y carriles
│   │   ├── NodeGraphCanvas.tsx     # Lienzo de nodos interactivo estilo Archifact
│   │   ├── NodeInspectorModal.tsx  # Drawer de telemetría e inyección de fallas
│   │   ├── TaskQueueDrawer.tsx     # Tablero de tareas y trazabilidad de ejecución
│   │   ├── ArtifactViewerModal.tsx # Visor de evidencias (diffs, AST, Playwright)
│   │   ├── NewTaskModal.tsx        # Inyector de tareas personalizadas y plantillas
│   │   └── ArchitectureDocsModal.tsx# Especificación técnica C.R.A.F.T.
│   └── App.tsx                     # Orquestador principal de vistas y estado`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-slate-400">
            AgentOS Architectural Whitepaper • Listo para evaluación en arenas de agentes
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            Cerrar Especificación
          </button>
        </div>
      </div>
    </div>
  );
};

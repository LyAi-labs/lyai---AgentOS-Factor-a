/**
 * AgentOS - Visor de Evidencias y Artefactos Técnicos
 * Muestra Diff unificado de código, RFCs de arquitectura, pruebas de Docker y reportes Playwright.
 */

import React, { useState } from 'react';
import { TaskArtifact, PipelineTask } from '../types/pipeline';
import {
  X,
  FileCode2,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Copy,
  Check,
  Download,
} from 'lucide-react';

interface ArtifactViewerModalProps {
  task: PipelineTask | null;
  onClose: () => void;
}

export const ArtifactViewerModal: React.FC<ArtifactViewerModalProps> = ({
  task,
  onClose,
}) => {
  if (!task || task.artifacts.length === 0) return null;

  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentArtifact = task.artifacts[selectedArtifactIndex] || task.artifacts[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getArtifactIcon = (type: TaskArtifact['type']) => {
    switch (type) {
      case 'code_diff':
        return <FileCode2 className="w-4 h-4 text-cyan-400" />;
      case 'spec_doc':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'test_report':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'security_audit':
        return <ShieldCheck className="w-4 h-4 text-rose-400" />;
      case 'ui_snapshot':
        return <Eye className="w-4 h-4 text-purple-400" />;
      default:
        return <FileCode2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-mono text-white">
                  Evidencias & Artefactos Generados
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">
                  {task.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5 truncate max-w-lg">
                {task.title}
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

        {/* Selector de Artefactos */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 overflow-x-auto">
          {task.artifacts.map((art, idx) => (
            <button
              key={art.id}
              onClick={() => setSelectedArtifactIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition shrink-0 ${
                selectedArtifactIndex === idx
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {getArtifactIcon(art.type)}
              <span>{art.title}</span>
            </button>
          ))}
        </div>

        {/* Visor de Contenido */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs bg-slate-950">
          <div className="flex items-center justify-between mb-3 text-slate-400 border-b border-slate-800 pb-2">
            <span className="text-[11px] text-slate-400">
              Nodo emisor: <span className="text-slate-200 font-bold">{currentArtifact.nodeId}</span> •{' '}
              {new Date(currentArtifact.timestamp).toLocaleTimeString()}
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {currentArtifact.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            Firma criptográfica inmutable • Generado en tiempo real
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

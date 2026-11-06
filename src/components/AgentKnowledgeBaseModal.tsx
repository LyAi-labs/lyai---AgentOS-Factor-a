/**
 * AgentOS - Modal de Edición de Base de Conocimiento de Agentes (Agent Knowledge Base)
 * Permite a los desarrolladores consultar y editar la documentación técnica en Markdown
 * que actúa como Fuente de Verdad (Single Source of Truth) para la lógica, parámetros,
 * entradas y salidas esperadas de cada agente.
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Edit3,
  Eye,
  Save,
  CheckCircle2,
  X,
  Tag,
  Clock,
  User,
  Sliders,
  FileCode2,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { PipelineNode } from '../types/pipeline';
import {
  AgentKnowledgeDoc,
  getAgentKnowledgeDoc,
} from '../pipeline/agentKnowledgeBase';

interface AgentKnowledgeBaseModalProps {
  node: PipelineNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (nodeId: string, doc: AgentKnowledgeDoc) => void;
}

export const AgentKnowledgeBaseModal: React.FC<AgentKnowledgeBaseModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !node) return null;

  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [doc, setDoc] = useState<AgentKnowledgeDoc>(() =>
    getAgentKnowledgeDoc(node.id, node.name, node.role, node.description)
  );
  const [markdown, setMarkdown] = useState<string>(doc.markdownContent);
  const [author, setAuthor] = useState<string>(doc.author);
  const [version, setVersion] = useState<string>(doc.version);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(doc.tags);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sincronizar si cambia el nodo
  useEffect(() => {
    const initialDoc = getAgentKnowledgeDoc(node.id, node.name, node.role, node.description);
    setDoc(initialDoc);
    setMarkdown(initialDoc.markdownContent);
    setAuthor(initialDoc.author);
    setVersion(initialDoc.version);
    setTags(initialDoc.tags);
    setSaveToast(null);
  }, [node]);

  const handleSave = () => {
    const updatedDoc: AgentKnowledgeDoc = {
      ...doc,
      author,
      version,
      tags,
      markdownContent: markdown,
      lastUpdated: Date.now(),
    };
    setDoc(updatedDoc);
    if (onSave) {
      onSave(node.id, updatedDoc);
    }
    setSaveToast('¡Documentación guardada como Fuente de Verdad para este agente!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(newTagInput.trim())) {
        setTags([...tags, newTagInput.trim()]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleInsertTemplate = (sectionName: string, snippet: string) => {
    setMarkdown((prev) => prev + `\n\n### ${sectionName}\n${snippet}\n`);
    setActiveTab('edit');
  };

  // Renderizador liviano de Markdown sin dependencias externas pesadas
  const renderSimpleMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = line.trim().replace('```', '') || 'yaml';
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <div key={`code-${index}`} className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
              <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] text-cyan-400 font-mono flex items-center justify-between">
                <span>{codeBlockLang.toUpperCase()}</span>
                <span>Config / Schema</span>
              </div>
              <pre className="p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                {codeBlockContent.join('\n')}
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-base font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800 flex items-center gap-2">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-sm font-bold text-cyan-300 mt-3 mb-1.5 flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('---')) {
        elements.push(<hr key={index} className="my-3 border-slate-800" />);
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={index} className="text-slate-300 ml-4 list-disc text-xs my-0.5 font-sans">
            {line.replace('- ', '')}
          </li>
        );
      } else if (/^\d+\.\s/.test(line)) {
        elements.push(
          <li key={index} className="text-slate-300 ml-4 list-decimal text-xs my-0.5 font-sans">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={index} className="text-xs text-slate-300 leading-relaxed font-sans my-1">
            {line}
          </p>
        );
      } else {
        elements.push(<div key={index} className="h-1.5" />);
      }
    });

    return elements;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 text-xs font-mono">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-700 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Base de Conocimiento del Agente • {node.name}
                </h3>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold text-[10px]">
                  SINGLE SOURCE OF TRUTH
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  v{version}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Especificación técnica de lógica, parámetros de inferencia y contratos para {node.name}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de modo Vista Previa / Editor */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                data-testid="kb-preview-tab"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Vista Previa</span>
              </button>
              <button
                type="button"
                data-testid="kb-edit-tab"
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Editor Markdown</span>
              </button>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificación Toast de Guardado */}
        {saveToast && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/60 p-2.5 px-4 text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{saveToast}</span>
          </div>
        )}

        {/* Barra de Metadatos del Documento: Autor, Versión, Tags y Última Actualización */}
        <div className="bg-slate-950 border-b border-slate-800 p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[11px]">Autor:</span>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white text-xs w-36 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Versión:</span>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white text-xs w-20 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Actualizado: {new Date(doc.lastUpdated).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px] flex items-center gap-1"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="+Tag (Enter)"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 text-[10px] w-24 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Snippets Rápidos de Estructura de Documentación */}
        {activeTab === 'edit' && (
          <div className="bg-slate-900/60 border-b border-slate-800 px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Insertar Plantilla:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplate(
                    'Esquema de Validación de Salidas',
                    '- Output format: JSON Schema validado por AST\n- SLA de respuesta: < 800ms\n- Tolerancia a fallos: reintento exponencial con jitter'
                  )
                }
                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              >
                + Validación de Salidas
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplate(
                    'Parámetros de Inferencia de Modelo',
                    '```yaml\nmodel: "Claude 3.7 Sonnet / Gemini Pro"\ntemperature: 0.2\nmaxRetries: 3\nstrictMode: true\n```'
                  )
                }
                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              >
                + Parámetros YAML
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplate(
                    'Guardrails & Mitigaciones de Contingencia',
                    '1. Circuit breaker tras 2 fallos consecutivos.\n2. Conmutación a réplica en carril urgente SSH.\n3. Registro automático en APM audit log.'
                  )
                }
                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              >
                + Guardrails
              </button>
            </div>
          </div>
        )}

        {/* Contenido Principal: Editor o Vista Previa */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-950">
          {activeTab === 'preview' ? (
            <div className="max-w-3xl mx-auto space-y-2 prose prose-invert">
              {renderSimpleMarkdown(markdown)}
            </div>
          ) : (
            <div className="h-full flex flex-col space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
                <span>Escribe en formato Markdown estándar (# Título, ## Sección, ```yaml, listas):</span>
                <span>{markdown.length} caracteres • {markdown.split('\n').length} líneas</span>
              </div>
              <textarea
                data-testid="kb-markdown-textarea"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Escribe la especificación de lógica, parámetros y salidas esperadas..."
                className="w-full h-[400px] p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40 resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2 text-xs">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Esta documentación es sincronizada y accesible desde el Node Inspector Modal.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

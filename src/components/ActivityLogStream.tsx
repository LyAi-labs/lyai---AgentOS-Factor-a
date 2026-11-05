/**
 * AgentOS - Consola de Registro de Actividad y Eventos en Tiempo Real
 */

import React, { useState } from 'react';
import { ActivityLogEntry } from '../types/pipeline';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Filter,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';

interface ActivityLogStreamProps {
  logs: ActivityLogEntry[];
  onClearLogs?: () => void;
}

export const ActivityLogStream: React.FC<ActivityLogStreamProps> = ({
  logs,
  onClearLogs,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const latestLog = logs[0];

  return (
    <div className="border-t border-slate-800 bg-[#070b14]/95 text-xs font-mono transition-all duration-200 z-30">
      {/* Header bar / Mini console preview */}
      <div className="px-4 py-2 flex items-center justify-between bg-slate-950/80 border-b border-slate-900">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition flex-1 overflow-hidden"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-bold shrink-0">Consola de Eventos:</span>
          {latestLog ? (
            <span className="text-[11px] text-slate-400 truncate">
              <span className="text-slate-600">[{new Date(latestLog.timestamp).toLocaleTimeString()}]</span>{' '}
              <span className="text-cyan-300 font-semibold">{latestLog.source}:</span>{' '}
              {latestLog.message}
            </span>
          ) : (
            <span className="text-slate-600 italic">Esperando eventos del pipeline...</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition text-[11px]"
          >
            <span>{isExpanded ? 'Contraer' : 'Expandir'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Logs Panel */}
      {isExpanded && (
        <div className="p-3 bg-[#060912] space-y-2 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 text-slate-500" />
              <span>Nivel:</span>
              {(['all', 'info', 'success', 'warn', 'error'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-1.5 py-0.5 rounded uppercase text-[9.5px] font-bold transition ${
                    filterLevel === lvl
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <span className="text-slate-500">
              Mostrando {filteredLogs.length} de {logs.length} eventos
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
            {filteredLogs.map((log) => {
              let levelColor = 'text-cyan-400';
              let icon = <Info className="w-3 h-3 text-cyan-400 shrink-0" />;

              if (log.level === 'success') {
                levelColor = 'text-emerald-400';
                icon = <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />;
              } else if (log.level === 'warn') {
                levelColor = 'text-amber-400';
                icon = <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />;
              } else if (log.level === 'error') {
                levelColor = 'text-rose-400';
                icon = <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />;
              }

              return (
                <div
                  key={log.id}
                  className="p-1 rounded hover:bg-slate-900/60 flex items-start gap-2 transition"
                >
                  <span className="text-slate-600 shrink-0 text-[10px] pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="pt-0.5">{icon}</div>
                  <span className="text-slate-300 font-semibold shrink-0">
                    [{log.source}]:
                  </span>
                  <span className="text-slate-400 break-words flex-1">{log.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

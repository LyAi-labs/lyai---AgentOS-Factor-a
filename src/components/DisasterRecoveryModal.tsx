/**
 * AgentOS - Modal de Recuperación ante Desastres (Disaster Recovery & SystemSnapshots)
 * Muestra el estado del cron-job de 10 minutos, el historial de instantáneas en la tabla 'SystemSnapshots'
 * y permite restaurar (rollback) el estado global del grafo de agentes.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  RotateCcw,
  Camera,
  CheckCircle2,
  AlertTriangle,
  X,
  Database,
  Layers,
  Activity,
  ArrowRight,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { SystemSnapshotRecord } from '../pipeline/snapshots';

interface DisasterRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
}

export const DisasterRecoveryModal: React.FC<DisasterRecoveryModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [snapshots, setSnapshots] = useState<SystemSnapshotRecord[]>([]);
  const [cronIntervalMinutes, setCronIntervalMinutes] = useState<number>(10);
  const [lastSnapshotTakenAt, setLastSnapshotTakenAt] = useState<number | null>(null);
  const [nextScheduledSnapshotAt, setNextScheduledSnapshotAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SystemSnapshotRecord | null>(null);

  const fetchSnapshots = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/snapshots');
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
        setCronIntervalMinutes(data.cronIntervalMinutes || 10);
        setLastSnapshotTakenAt(data.lastSnapshotTakenAt || null);
        setNextScheduledSnapshotAt(data.nextScheduledSnapshotAt || null);
        if (data.snapshots && data.snapshots.length > 0 && !selectedSnapshot) {
          setSelectedSnapshot(data.snapshots[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching system snapshots:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
    }
  }, [isOpen]);

  const handleTriggerManualSnapshot = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/snapshots/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Instantánea de salvaguarda manual solicitada desde la UI' }),
      });
      if (res.ok) {
        await fetchSnapshots();
      }
    } catch (e) {
      console.error('Error triggering snapshot:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreSnapshot = async (id: string) => {
    if (!confirm(`¿Confirmas la restauración del sistema a la instantánea ${id}? Se aplicará un rollback completo del grafo y tareas.`)) {
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreMessage(null);
      const res = await fetch(`/api/snapshots/restore/${id}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setRestoreMessage(data.message || `Sistema restaurado con éxito a la instantánea ${id}`);
        await fetchSnapshots();
        if (onRestoreSuccess) {
          onRestoreSuccess();
        }
      } else {
        const err = await res.json();
        alert(`Error al restaurar: ${err.error || 'Error desconocido'}`);
      }
    } catch (e) {
      console.error('Error restoring snapshot:', e);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 text-xs font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Servicio de Instantáneas del Grafo & Recuperación ante Desastres
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-[10px]">
                  CRON {cronIntervalMinutes}M ACTIVO
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Tabla <code className="text-rose-300">SystemSnapshots</code> respaldando el estado global de los 25 agentes cada 10 minutos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerManualSnapshot}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tomar Instantánea Manual</span>
            </button>
            <button
              onClick={fetchSnapshots}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de Mensaje de Rollback si ocurrió */}
        {restoreMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/60 p-3 px-5 text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-xs font-bold">{restoreMessage}</span>
          </div>
        )}

        {/* HUD de Monitoreo del Cron-Job de 10 minutos */}
        <div className="bg-slate-950/60 border-b border-slate-800 p-4 px-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Cadencia de Instantáneas:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-white text-xs">Cada {cronIntervalMinutes} minutos</strong>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Último Snapshot Tomado:</span>
            <strong className="text-cyan-300 text-xs block mt-0.5 truncate">
              {lastSnapshotTakenAt ? new Date(lastSnapshotTakenAt).toLocaleTimeString() : 'N/A'}
            </strong>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Próxima Ejecución Cron:</span>
            <strong className="text-purple-300 text-xs block mt-0.5 truncate">
              {nextScheduledSnapshotAt ? new Date(nextScheduledSnapshotAt).toLocaleTimeString() : 'En 10 min'}
            </strong>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Instantáneas Almacenadas:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Database className="w-3.5 h-3.5 text-rose-400" />
              <strong className="text-white text-xs">{snapshots.length} en memoria</strong>
            </div>
          </div>
        </div>

        {/* Cuerpo Principal: Lista de Snapshots a la izquierda e Inspector a la derecha */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-950">
          {/* Lista de Instantáneas */}
          <div className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Tabla 'SystemSnapshots' (Historial de Recuperación):
            </span>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">
                Cargando o no hay instantáneas en el sistema...
              </div>
            ) : (
              snapshots.map((snap) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                const isCron = snap.triggerType === 'cron_10m';

                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 text-rose-100 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{snap.id}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            isCron
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {snap.triggerType}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate font-sans">
                        {snap.triggerReason}
                      </p>
                      <div className="flex items-center gap-2 text-[9.5px] text-slate-500">
                        <span>{new Date(snap.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>{snap.graphChecksum}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-[10px] block">
                        Salud {snap.globalHealthScore}%
                      </span>
                      <span className="text-[9.5px] text-slate-500 mt-1 block">
                        {snap.totalNodes} nodos
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Inspector de la Instantánea Seleccionada y Botón de Restauración */}
          <div className="w-full md:w-1/2 p-5 overflow-y-auto space-y-4 bg-slate-900/60">
            {selectedSnapshot ? (
              <>
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">
                    Detalles de la Instantánea
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1">
                    {selectedSnapshot.id}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                    {selectedSnapshot.triggerReason}
                  </p>
                </div>

                {/* Métricas del Grafo en el momento del Snapshot */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Checksum de Integridad:</span>
                    <strong className="text-cyan-300 font-mono text-[11px]">
                      {selectedSnapshot.graphChecksum}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Salud Global Registrada:</span>
                    <strong className="text-emerald-400 text-[11px]">
                      {selectedSnapshot.globalHealthScore}%
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Nodos & Aristas:</span>
                    <strong className="text-white text-[11px]">
                      {selectedSnapshot.totalNodes} nodos • {selectedSnapshot.totalEdges} aristas
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Tareas Activas / Hechas:</span>
                    <strong className="text-white text-[11px]">
                      {selectedSnapshot.activeTasksCount} activas • {selectedSnapshot.completedTasksCount} hechas
                    </strong>
                  </div>
                </div>

                {/* Registro de Auditoría de Recuperación ante Desastres */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Procedimiento de Recuperación ante Desastres (Disaster Recovery):
                  </span>
                  <ul className="text-[10.5px] text-slate-400 space-y-1 list-disc list-inside font-sans">
                    <li>Se genera automáticamente una salvaguarda pre-disaster previa al rollback.</li>
                    <li>Se restaura la memoria completa de los 25 nodos del grafo y sus estados.</li>
                    <li>Se reinicia el bucle de sincronización WebSocket y telemetría APM.</li>
                  </ul>
                </div>

                {/* Botón de Restauración */}
                <div className="pt-2">
                  <button
                    onClick={() => handleRestoreSnapshot(selectedSnapshot.id)}
                    disabled={isRestoring}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                    <span>
                      {isRestoring
                        ? 'Restaurando Estado del Grafo...'
                        : `Restaurar Sistema a Instantánea (${selectedSnapshot.id})`}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                Selecciona una instantánea para ver su detalle y opciones de rollback.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-slate-400">
          <span className="text-[11px]">
            Política de retención: Instantáneas preservadas por 7 días en <code className="text-slate-300">SystemSnapshots</code>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

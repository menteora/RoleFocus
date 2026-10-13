import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  getThresholdTimestamp,
  formatThresholdDate,
  isTaskOlderThanThreshold,
  getTaskCompletionDate,
} from '../utils/cleanupUtils';
import type { TaskCleanupUnit, RoleTask } from '../types';
import {
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';

export const TaskCleanupSection: React.FC = () => {
  const { tasks, roles, deleteCompletedTasksOlderThan } = useApp();

  const [amount, setAmount] = useState<number>(14);
  const [unit, setUnit] = useState<TaskCleanupUnit>('days');
  const [isListExpanded, setIsListExpanded] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const thresholdTimestamp = useMemo(() => {
    return getThresholdTimestamp(amount, unit);
  }, [amount, unit]);

  const formattedCutoffDate = useMemo(() => {
    return formatThresholdDate(thresholdTimestamp);
  }, [thresholdTimestamp]);

  // Find all completed tasks older than threshold
  const matchingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.completed && isTaskOlderThanThreshold(t, thresholdTimestamp))
      .sort((a, b) => getTaskCompletionDate(a) - getTaskCompletionDate(b));
  }, [tasks, thresholdTimestamp]);

  // Breakdown by role
  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of matchingTasks) {
      map[t.roleId] = (map[t.roleId] || 0) + 1;
    }
    return map;
  }, [matchingTasks]);

  const unitLabels: Record<TaskCleanupUnit, { singular: string; plural: string }> = {
    hours: { singular: 'ora', plural: 'ore' },
    days: { singular: 'giorno', plural: 'giorni' },
    weeks: { singular: 'settimana', plural: 'settimane' },
  };

  const currentUnitLabel =
    amount === 1 ? unitLabels[unit].singular : unitLabels[unit].plural;

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    try {
      const deletedCount = await deleteCompletedTasksOlderThan(amount, unit);
      setIsConfirmModalOpen(false);
      setSuccessMessage(
        `Eliminati definitivamente ${deletedCount} task chiusi più vecchi di ${amount} ${currentUnitLabel}.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-900/60 shadow-2xs">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Manutenzione & Pulizia Task Chiusi</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Elimina in blocco i compiti completati storici per alleggerire il database locale e velocizzare la sincronizzazione CouchDB.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Threshold Configuration Form */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Elimina i task completati più vecchi di:
            </span>

            {/* Amount input */}
            <input
              type="number"
              min={1}
              max={365}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2.5 py-1.5 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
            />

            {/* Unit selector */}
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as TaskCleanupUnit)}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="hours">Ore</option>
              <option value="days">Giorni</option>
              <option value="weeks">Settimane</option>
            </select>
          </div>

          {/* Cutoff Date Info */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Chiusi prima del {formattedCutoffDate}</span>
          </div>
        </div>

        {/* Live Matching Summary Badge */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 flex-wrap">
            <span className="font-semibold">
              {matchingTasks.length === 0 ? (
                <span className="text-slate-400">Nessun task completato corrisponde ai criteri</span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-bold">
                  {matchingTasks.length} {matchingTasks.length === 1 ? 'task chiuso trovato' : 'task chiusi trovati'}
                </span>
              )}
            </span>

            {matchingTasks.length > 0 && (
              <span className="text-[11px] text-slate-400">
                (
                {Object.entries(breakdown)
                  .map(([roleId, count]) => {
                    const r = roles.find((role) => role.id === roleId);
                    return `${count} ${r?.name || 'Senza ruolo'}`;
                  })
                  .join(' · ')}
                )
              </span>
            )}
          </div>

          {matchingTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setIsListExpanded(!isListExpanded)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium self-start sm:self-auto"
            >
              <span>{isListExpanded ? 'Nascondi anteprima' : 'Mostra anteprima'}</span>
              {isListExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Expandable Preview List */}
      {isListExpanded && matchingTasks.length > 0 && (
        <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 max-h-60 overflow-y-auto">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            Task che verranno eliminati definitivamente:
          </span>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {matchingTasks.map((task) => {
              const role = roles.find((r) => r.id === task.roleId);
              const compDate = formatThresholdDate(getTaskCompletionDate(task));
              return (
                <div key={task.id} className="py-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: role?.color || '#94a3b8' }}
                    />
                    <span className="truncate text-slate-800 dark:text-slate-200">{task.text}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 font-mono">
                    Completato il {compDate}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>I task aperti (non completati) e le sessioni del timer non verranno toccati.</span>
        </div>

        <button
          type="button"
          onClick={() => setIsConfirmModalOpen(true)}
          disabled={matchingTasks.length === 0}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>
            {matchingTasks.length === 0
              ? 'Nessun task da pulire'
              : `Elimina ${matchingTasks.length} task chiusi`}
          </span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-800/80">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Confermi l'eliminazione definitiva?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Stai per eliminare definitivamente{' '}
                <strong className="text-red-600 dark:text-red-400 font-bold">
                  {matchingTasks.length} task completati
                </strong>{' '}
                più vecchi di {amount} {currentUnitLabel} (completati prima del {formattedCutoffDate}).
              </p>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Questa azione è irreversibile e rimuoverà i task anche su CouchDB.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                {isDeleting ? 'Eliminazione...' : 'Conferma ed Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

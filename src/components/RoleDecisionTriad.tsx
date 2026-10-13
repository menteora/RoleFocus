import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DECISION_MODES, type DecisionMode, type Role, type RoleTask } from '../types';
import { formatMinutesToHoursMinutes } from '../utils/timeUtils';
import {
  Zap,
  BatteryLow,
  Unlock,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  Circle,
  X,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RoleDecisionTriadProps {
  role: Role;
  tasksByCategory: Record<DecisionMode, RoleTask[]>;
  activeDecisionMode: DecisionMode;
  onStartTimer: (
    role: Role,
    taskText: string,
    durationMinutes: number,
    category: DecisionMode,
    taskId?: string
  ) => void;
  isRoleTimerRunning: boolean;
}

export const RoleDecisionTriad: React.FC<RoleDecisionTriadProps> = ({
  role,
  tasksByCategory,
  activeDecisionMode,
  onStartTimer,
  isRoleTimerRunning,
}) => {
  const {
    addOrUpdateTask,
    deleteTask,
    toggleTaskStatus,
    setRoleDecisionMode,
    setRoleActiveDecision,
  } = useApp();

  // Local immediate reactive state for instant 0ms visual feedback on click
  const [selectedMode, setSelectedMode] = useState<DecisionMode>(activeDecisionMode || 'important');

  // Sync when prop changes (e.g. switching role or external update)
  useEffect(() => {
    if (activeDecisionMode) {
      setSelectedMode(activeDecisionMode);
    }
  }, [activeDecisionMode]);

  // State for creating/editing a task inside a specific category
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<DecisionMode | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [customDuration, setCustomDuration] = useState<number | null>(null);

  // Closed tasks accordion: compressed/collapsed by default
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(false);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return Zap;
      case 'BatteryLow':
        return BatteryLow;
      case 'Unlock':
        return Unlock;
      default:
        return Sparkles;
    }
  };

  const handleSelectMode = (mode: DecisionMode) => {
    setSelectedMode(mode);
    setRoleDecisionMode(role.id, mode);
    setCustomDuration(null);
  };

  const handleStartEditing = (task: RoleTask) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
  };

  const handleSaveEdit = async (task: RoleTask) => {
    if (!editingText.trim()) return;
    await addOrUpdateTask({
      id: task.id,
      roleId: task.roleId,
      category: task.category,
      text: editingText.trim(),
      estimatedMinutes: task.estimatedMinutes,
      isCurrentPriority: task.isCurrentPriority,
    });
    setEditingTaskId(null);
    setEditingText('');
  };

  const handleAddNewTask = async (category: DecisionMode) => {
    if (!newTaskText.trim()) return;
    await addOrUpdateTask({
      roleId: role.id,
      category,
      text: newTaskText.trim(),
      isCurrentPriority: true,
    });
    setNewTaskText('');
    setAddingToCategory(null);
    setSelectedMode(category);
    setRoleDecisionMode(role.id, category);
  };

  // Find the tasks for the selected mode, partitioned into active vs completed
  const currentCategoryTasks = tasksByCategory[selectedMode] || [];
  const activeTasks = currentCategoryTasks.filter((t) => !t.completed);
  const completedTasks = currentCategoryTasks.filter((t) => t.completed);

  // Active target task for the timer: prioritizes uncompleted priority task
  const currentActiveTask =
    activeTasks.find((t) => t.isCurrentPriority) ||
    activeTasks[0] ||
    null;

  const currentModeConfig = DECISION_MODES.find((m) => m.key === selectedMode) || DECISION_MODES[0];
  const effectiveMinutes = customDuration || currentModeConfig.defaultMinutes;

  return (
    <div className="space-y-4">
      
      {/* 3 Decision Mode Strategy Cards (Più importante, Più veloce, Sblocca le altre) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {DECISION_MODES.map((modeConfig) => {
          const isSelected = selectedMode === modeConfig.key;
          const Icon = getIcon(modeConfig.iconName);
          const modeTasks = tasksByCategory[modeConfig.key] || [];
          const activeModeTasks = modeTasks.filter((t) => !t.completed);
          const completedModeTasks = modeTasks.filter((t) => t.completed);
          const topTask = activeModeTasks[0] || null;
          const uncompletedCount = activeModeTasks.length;
          const totalCategoryMinutes = modeTasks.reduce((sum, t) => sum + (t.totalMinutesSpent || 0), 0);

          return (
            <button
              type="button"
              key={modeConfig.key}
              onClick={() => handleSelectMode(modeConfig.key)}
              aria-pressed={isSelected}
              className={`w-full p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden select-none active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 group ${
                isSelected
                  ? `bg-white dark:bg-slate-800/95 shadow-sm ${modeConfig.borderColorClass} ring-2 ring-blue-500/30 dark:ring-blue-400/20`
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="w-full">
                {/* Header of card: Energy condition + Action */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded-md border ${modeConfig.badgeColorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {modeConfig.conditionLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {totalCategoryMinutes > 0 && (
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Tempo totale accumulato in questa categoria"
                      >
                        {formatMinutesToHoursMinutes(totalCategoryMinutes)}
                      </span>
                    )}
                    {uncompletedCount > 0 && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {uncompletedCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <span>→ {modeConfig.actionLabel}</span>
                </div>

                {/* Primary preview task in this bucket (uncompleted task or all completed state) */}
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed min-h-[32px] flex items-center">
                  {topTask ? (
                    <span className="truncate">{topTask.text}</span>
                  ) : completedModeTasks.length > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{completedModeTasks.length} {completedModeTasks.length === 1 ? 'completata' : 'completate'}</span>
                    </span>
                  ) : (
                    <span className="italic text-slate-400">Nessuna attività impostata</span>
                  )}
                </div>
              </div>

              {/* Status footer inside card */}
              <div className="w-full pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                <span>Suggerito: {modeConfig.defaultMinutes}m</span>
                {isSelected ? (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Selezionato
                  </span>
                ) : (
                  <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Clicca per aprire
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* SELECTED STRATEGY ACTIVE PANEL (Detail & Task Management: Modify / Add / Remove) */}
      <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 space-y-3">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {currentModeConfig.conditionLabel} → <span className="text-blue-600 dark:text-blue-400">{currentModeConfig.actionLabel}</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              ({currentModeConfig.subtitle})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAddingToCategory(addingToCategory === selectedMode ? null : selectedMode)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi attività</span>
          </button>
        </div>

        {/* Inline Add Task Form */}
        {addingToCategory === selectedMode && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddNewTask(selectedMode);
            }}
            className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 rounded-xl animate-in fade-in duration-150"
          >
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder={`Scrivi l'attività "${currentModeConfig.actionLabel}"...`}
              autoFocus
              className="flex-1 px-2 py-1 text-xs bg-transparent focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
            />
            <button
              type="button"
              onClick={() => setAddingToCategory(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              disabled={!newTaskText.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Salva
            </button>
          </form>
        )}

        {/* ACTIVE / OPEN TASKS LIST (Clean, unclosed tasks only) */}
        <div className="space-y-1.5">
          {activeTasks.length > 0 ? (
            activeTasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const isTaskActiveForTimer = currentActiveTask?.id === task.id;
              const minutesSpent = task.totalMinutesSpent || 0;

              return (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    isTaskActiveForTimer
                      ? 'bg-white dark:bg-slate-800 border-blue-400 dark:border-blue-600 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  {/* Checkbox and Text / Editor */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      title="Segna come completato"
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                    >
                      <Circle className="w-4 h-4" />
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(task);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-blue-500 rounded-lg text-slate-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(task)}
                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setRoleActiveDecision(role.id, selectedMode, task.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
                        title="Clicca per selezionare come obiettivo prioritario per il timer"
                      >
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate">
                          {task.text}
                        </span>

                        {isTaskActiveForTimer && (
                          <span className="shrink-0 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                            Priorità attiva
                          </span>
                        )}

                        {/* Tracked Time Badge on Task */}
                        {minutesSpent > 0 && (
                          <span
                            className="shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 flex items-center gap-1"
                            title={`Tempo totale speso: ${minutesSpent} min (${task.sessionCount || 1} sessioni)`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatMinutesToHoursMinutes(minutesSpent)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions (Modify, Delete) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditing(task)}
                        title="Modifica attività"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        title="Togli / Elimina attività"
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : completedTasks.length > 0 ? (
            /* All active tasks are completed */
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tutte le attività in questa categoria sono state completate! 🎉</span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-normal">
                Usa "+ Aggiungi attività" per crearne una nuova, oppure avvia una sessione focus libera.
              </p>
            </div>
          ) : (
            /* No tasks at all */
            <div className="p-4 text-center text-xs text-slate-400 italic bg-white/40 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              Nessuna attività aperta per "{currentModeConfig.actionLabel}". Clicca su "+ Aggiungi attività" sopra per aggiungerne una.
            </div>
          )}
        </div>

        {/* COMPLETED TASKS: Compressed / Collapsed by default */}
        {completedTasks.length > 0 && (
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowCompletedTasks((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 py-1 px-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
            >
              {showCompletedTasks ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
              )}
              <span>
                {showCompletedTasks ? 'Nascondi completate' : 'Mostra completate'} ({completedTasks.length})
              </span>
            </button>

            {showCompletedTasks && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                {completedTasks.map((task) => {
                  const minutesSpent = task.totalMinutesSpent || 0;
                  return (
                    <div
                      key={task.id}
                      className="p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/30 flex items-center justify-between gap-2.5 opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleTaskStatus(task.id)}
                          title="Riapri attività (segna come non completata)"
                          className="text-emerald-600 dark:text-emerald-400 hover:text-slate-400 transition-colors shrink-0 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 fill-emerald-50 dark:fill-emerald-950" />
                        </button>

                        <span className="text-xs line-through text-slate-400 dark:text-slate-500 truncate flex-1">
                          {task.text}
                        </span>

                        {minutesSpent > 0 && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatMinutesToHoursMinutes(minutesSpent)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        title="Elimina attività completata"
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TIMER LAUNCH ACTION BAR */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Quick duration presets */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Durata:</span>
            {[10, 15, 25, 45, 60].map((mins) => (
              <button
                type="button"
                key={mins}
                onClick={() => setCustomDuration(mins)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-lg transition-colors cursor-pointer ${
                  effectiveMinutes === mins
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Launch Focus Timer button */}
          <button
            type="button"
            onClick={() =>
              onStartTimer(
                role,
                currentActiveTask?.text || `${currentModeConfig.actionLabel} (${role.name})`,
                effectiveMinutes,
                selectedMode,
                currentActiveTask?.id
              )
            }
            disabled={isRoleTimerRunning}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
              isRoleTimerRunning
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md active:scale-[0.99]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {isRoleTimerRunning
                ? 'Timer in corso...'
                : `Avvia ${currentModeConfig.actionLabel} (${effectiveMinutes} min)`}
            </span>
          </button>

        </div>

      </div>

    </div>
  );
};

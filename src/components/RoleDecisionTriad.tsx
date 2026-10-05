import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DECISION_MODES, type DecisionMode, type Role, type RoleTask } from '../types';
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
} from 'lucide-react';

interface RoleDecisionTriadProps {
  role: Role;
  tasksByCategory: Record<DecisionMode, RoleTask[]>;
  activeDecisionMode: DecisionMode;
  onStartTimer: (role: Role, taskText: string, durationMinutes: number, category: DecisionMode) => void;
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

  // State for creating/editing a task inside a specific category
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<DecisionMode | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [customDuration, setCustomDuration] = useState<number | null>(null);

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
    setRoleDecisionMode(role.id, category);
  };

  // Find the active task for the selected mode
  const currentCategoryTasks = tasksByCategory[activeDecisionMode] || [];
  const currentActiveTask =
    currentCategoryTasks.find((t) => t.isCurrentPriority && !t.completed) ||
    currentCategoryTasks.find((t) => !t.completed) ||
    currentCategoryTasks[0] ||
    null;

  const currentModeConfig = DECISION_MODES.find((m) => m.key === activeDecisionMode) || DECISION_MODES[0];
  const effectiveMinutes = customDuration || currentModeConfig.defaultMinutes;

  return (
    <div className="space-y-4">
      
      {/* 3 Decision Mode Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {DECISION_MODES.map((modeConfig) => {
          const isSelected = activeDecisionMode === modeConfig.key;
          const Icon = getIcon(modeConfig.iconName);
          const modeTasks = tasksByCategory[modeConfig.key] || [];
          const topTask = modeTasks.find((t) => !t.completed) || modeTasks[0];
          const uncompletedCount = modeTasks.filter((t) => !t.completed).length;

          return (
            <div
              key={modeConfig.key}
              onClick={() => handleSelectMode(modeConfig.key)}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? `bg-white dark:bg-slate-800/90 shadow-sm ${modeConfig.borderColorClass} ring-2 ring-blue-500/20 dark:ring-blue-400/10`
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <div>
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
                  {uncompletedCount > 0 && (
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {uncompletedCount}
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <span>→ {modeConfig.actionLabel}</span>
                </div>

                {/* Primary preview task in this bucket */}
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed min-h-[32px]">
                  {topTask ? (
                    <span className={topTask.completed ? 'line-through text-slate-400' : ''}>
                      {topTask.text}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">Nessuna attività impostata</span>
                  )}
                </p>
              </div>

              {/* Status footer inside card */}
              <div className="pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                <span>Suggerito: {modeConfig.defaultMinutes}m</span>
                {isSelected && (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Selezionato
                  </span>
                )}
              </div>
            </div>
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
            onClick={() => setAddingToCategory(addingToCategory === activeDecisionMode ? null : activeDecisionMode)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi attività</span>
          </button>
        </div>

        {/* Inline Add Task Form */}
        {addingToCategory === activeDecisionMode && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddNewTask(activeDecisionMode);
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
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              disabled={!newTaskText.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Salva
            </button>
          </form>
        )}

        {/* Tasks List for the Active Decision Category */}
        <div className="space-y-1.5">
          {currentCategoryTasks.length > 0 ? (
            currentCategoryTasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const isTaskActiveForTimer = currentActiveTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    isTaskActiveForTimer
                      ? 'bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 shadow-xs'
                      : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  {/* Checkbox and Text / Editor */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTaskStatus(task.id)}
                      title={task.completed ? 'Segna come non completato' : 'Segna come completato'}
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
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
                          onClick={() => handleSaveEdit(task)}
                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => setRoleActiveDecision(role.id, activeDecisionMode, task.id)}
                        className={`text-xs flex-1 truncate cursor-pointer select-none ${
                          task.completed
                            ? 'line-through text-slate-400'
                            : 'font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        title="Clicca per selezionare questa come attività prioritaria"
                      >
                        {task.text}
                      </span>
                    )}
                  </div>

                  {/* Actions (Modify, Delete) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEditing(task)}
                        title="Modifica attività"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        title="Togli / Elimina attività"
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 italic">
              Nessuna attività inserita per "{currentModeConfig.actionLabel}". Clicca su "+ Aggiungi attività" sopra per aggiungerne una.
            </div>
          )}
        </div>

        {/* TIMER LAUNCH ACTION BAR */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Quick duration presets */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Durata:</span>
            {[10, 15, 25, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => setCustomDuration(mins)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-lg transition-colors ${
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
            onClick={() =>
              onStartTimer(
                role,
                currentActiveTask?.text || `${currentModeConfig.actionLabel} (${role.name})`,
                effectiveMinutes,
                activeDecisionMode
              )
            }
            disabled={isRoleTimerRunning}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all ${
              isRoleTimerRunning
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
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

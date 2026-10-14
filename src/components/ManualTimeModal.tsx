import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RoleIcon } from '../utils/icons';
import { DECISION_MODES, type DecisionMode } from '../types';
import { Clock, X, Check, Calendar, Plus, Sparkles, Zap, BatteryLow, Unlock } from 'lucide-react';

interface ManualTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoleId?: string;
  initialTaskId?: string;
  initialTaskText?: string;
  initialCategory?: DecisionMode;
}

export const ManualTimeModal: React.FC<ManualTimeModalProps> = ({
  isOpen,
  onClose,
  initialRoleId,
  initialTaskId,
  initialTaskText,
  initialCategory,
}) => {
  const { roles, tasks, addManualTimeSession } = useApp();

  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('custom');
  const [customTaskText, setCustomTaskText] = useState<string>('');
  const [category, setCategory] = useState<DecisionMode>('important');
  const [minutes, setMinutes] = useState<number>(25);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      const defaultRoleId = initialRoleId || (roles.length > 0 ? roles[0].id : '');
      setSelectedRoleId(defaultRoleId);

      if (initialTaskId) {
        setSelectedTaskId(initialTaskId);
        const linkedTask = tasks.find((t) => t.id === initialTaskId);
        if (linkedTask) {
          setCustomTaskText(linkedTask.text);
          setCategory(linkedTask.category || 'important');
        } else {
          setCustomTaskText(initialTaskText || '');
        }
      } else if (initialTaskText) {
        setSelectedTaskId('custom');
        setCustomTaskText(initialTaskText);
        if (initialCategory) setCategory(initialCategory);
      } else {
        setSelectedTaskId('custom');
        setCustomTaskText('');
      }

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
      setMinutes(25);
      setNotes('');
    }
  }, [isOpen, initialRoleId, initialTaskId, initialTaskText, initialCategory, roles, tasks]);

  if (!isOpen) return null;

  // Role tasks for current selected role
  const roleTasks = tasks.filter((t) => t.roleId === selectedRoleId);
  const currentRole = roles.find((r) => r.id === selectedRoleId);

  const handleRoleChange = (newRoleId: string) => {
    setSelectedRoleId(newRoleId);
    // If current selected task doesn't belong to new role, reset to custom
    if (selectedTaskId !== 'custom') {
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task && task.roleId !== newRoleId) {
        setSelectedTaskId('custom');
        setCustomTaskText('');
      }
    }
  };

  const handleTaskSelection = (tId: string) => {
    setSelectedTaskId(tId);
    if (tId !== 'custom') {
      const task = tasks.find((t) => t.id === tId);
      if (task) {
        setCustomTaskText(task.text);
        setCategory(task.category || 'important');
      }
    } else {
      setCustomTaskText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId) return;

    const taskText =
      selectedTaskId !== 'custom'
        ? tasks.find((t) => t.id === selectedTaskId)?.text || customTaskText.trim()
        : customTaskText.trim();

    if (!taskText) return;

    setIsSubmitting(true);
    try {
      // Calculate start timestamp from selectedDate (at midday or current time if today)
      let timestamp = Date.now();
      if (selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const d = new Date();
        const isSelectedDayToday =
          d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;

        if (isSelectedDayToday) {
          timestamp = Date.now() - minutes * 60 * 1000;
        } else {
          const customDate = new Date(year, month - 1, day, 12, 0, 0);
          timestamp = customDate.getTime();
        }
      }

      await addManualTimeSession({
        roleId: selectedRoleId,
        taskId: selectedTaskId !== 'custom' ? selectedTaskId : undefined,
        taskText,
        category,
        durationMinutes: minutes,
        dateTimestamp: timestamp,
        notes: notes.trim() || undefined,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetMinutes = [5, 10, 15, 25, 30, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Inserisci Tempo a Mano
              </h3>
              <p className="text-[11px] text-slate-400">
                Registra il tempo dedicato a un'attività o a un ruolo dopo averla svolta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ruolo di riferimento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {roles.map((r) => {
                const isSelected = selectedRoleId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleChange(r.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 text-xs"
                      style={{ backgroundColor: r.color || '#3b82f6' }}
                    >
                      <RoleIcon name={r.iconName} className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {r.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task selector / Custom input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Attività / Task <span className="text-red-500">*</span></span>
              {roleTasks.length > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  {roleTasks.length} task disponibili nel ruolo
                </span>
              )}
            </label>

            {roleTasks.length > 0 && (
              <select
                value={selectedTaskId}
                onChange={(e) => handleTaskSelection(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white mb-2"
              >
                <option value="custom">✍️ Digita una nuova attività o sessione libera...</option>
                <optgroup label="Task del ruolo:">
                  {roleTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.completed ? '✓ ' : '○ '} {t.text} {t.isUrgent ? '🔥' : ''} {t.totalMinutesSpent ? `(${t.totalMinutesSpent}m spesi)` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}

            {(selectedTaskId === 'custom' || roleTasks.length === 0) && (
              <input
                type="text"
                value={customTaskText}
                onChange={(e) => setCustomTaskText(e.target.value)}
                placeholder="Es. Revisione contratti, Call con fornitore, Debug bug #42..."
                required
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            )}
          </div>

          {/* Duration Selector with Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tempo Dedicato (Minuti) <span className="text-red-500">*</span>
              </label>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}m` : ''}` : `${minutes} min`}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {presetMinutes.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMinutes(p)}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border transition-colors cursor-pointer ${
                    minutes === p
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  +{p}m
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="1440"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-28 p-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-center"
              />
              <span className="text-xs text-slate-400">minuti personalizzati</span>
            </div>
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Data della sessione</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, '0');
                  const d = String(now.getDate()).padStart(2, '0');
                  setSelectedDate(`${y}-${m}-${d}`);
                }}
                className="px-3 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                Oggi
              </button>
            </div>
          </div>

          {/* Strategy Mode / Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Modalità Decisionale
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DECISION_MODES.map((dm) => {
                const isSelected = category === dm.key;
                const Icon = dm.key === 'important' ? Zap : dm.key === 'quick' ? BatteryLow : Unlock;
                return (
                  <button
                    key={dm.key}
                    type="button"
                    onClick={() => setCategory(dm.key)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-1 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                      {dm.actionLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Note (opzionale)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. Lavoro offline, riunione di persona, revisione..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Submit & Cancel */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedRoleId || (!customTaskText.trim() && selectedTaskId === 'custom')}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salva Tempo Speso</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

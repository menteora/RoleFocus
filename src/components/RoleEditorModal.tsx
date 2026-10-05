import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AVAILABLE_ICONS, PRESET_COLORS, RoleIcon } from '../utils/icons';
import { DAYS_OF_WEEK_SHORT } from '../utils/timeUtils';
import { X, Check, Trash2, Calendar } from 'lucide-react';
import type { Role } from '../types';

interface RoleEditorModalProps {
  isOpen: boolean;
  roleToEdit?: Role | null;
  onClose: () => void;
}

export const RoleEditorModal: React.FC<RoleEditorModalProps> = ({
  isOpen,
  roleToEdit,
  onClose,
}) => {
  const { createOrUpdateRole, deleteRole, roles } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [iconName, setIconName] = useState('Briefcase');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(25);
  const [priority, setPriority] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setDescription(roleToEdit.description || '');
      setColor(roleToEdit.color);
      setIconName(roleToEdit.iconName || 'Briefcase');
      setSelectedDays(roleToEdit.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]);
      setDefaultDurationMinutes(roleToEdit.defaultDurationMinutes || 25);
      setPriority(roleToEdit.priority || 1);
    } else {
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[roles.length % PRESET_COLORS.length].hex);
      setIconName(AVAILABLE_ICONS[roles.length % AVAILABLE_ICONS.length].name);
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setDefaultDurationMinutes(25);
      setPriority(roles.length + 1);
    }
    setError('');
  }, [roleToEdit, isOpen, roles.length]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        setError('Devi selezionare almeno un giorno della settimana.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
    setError('');
  };

  const selectAllDays = () => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setError('');
  };

  const selectWeekdays = () => {
    setSelectedDays([1, 2, 3, 4, 5]);
    setError('');
  };

  const selectWeekend = () => {
    setSelectedDays([0, 6]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci il nome del ruolo');
      return;
    }

    if (selectedDays.length === 0) {
      setError('Seleziona almeno un giorno della settimana');
      return;
    }

    try {
      await createOrUpdateRole({
        ...(roleToEdit?.id ? { id: roleToEdit.id } : {}),
        name: name.trim(),
        description: description.trim(),
        color,
        iconName,
        daysOfWeek: selectedDays.length === 7 ? undefined : selectedDays,
        defaultDurationMinutes: Math.max(1, defaultDurationMinutes),
        priority: Number(priority),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    }
  };

  const handleDelete = async () => {
    if (!roleToEdit) return;
    if (confirm(`Sei sicuro di voler eliminare il ruolo "${roleToEdit.name}" e tutte le sue fasce orarie?`)) {
      await deleteRole(roleToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <RoleIcon name={iconName} className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {roleToEdit ? 'Modifica Ruolo' : 'Nuovo Ruolo'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Nome del Ruolo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Lavoratore Bancolini, Genitore, Studio..."
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Descrizione o Obiettivo Principale (Opzionale)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Es. Progetti, mansioni operative, tempo con la famiglia..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Days of Week Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Giorni della Settimana Attivi *</span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Tutti
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Lun-Ven
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  onClick={selectWeekend}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Sab-Dom
                </button>
              </div>
            </div>

            {/* Italian day order: Lun (1) to Dom (0) */}
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                const isSelected = selectedDays.includes(dayNum);
                return (
                  <button
                    type="button"
                    key={dayNum}
                    onClick={() => toggleDay(dayNum)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {DAYS_OF_WEEK_SHORT[dayNum]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Colore Distintivo
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    color === c.hex ? 'scale-115 ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Icona Rappresentativa
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
              {AVAILABLE_ICONS.map((item) => {
                const Icon = item.icon;
                const isSelected = iconName === item.name;
                return (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => setIconName(item.name)}
                    title={item.label}
                    className={`p-2 rounded-xl flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings: Duration & Priority */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Timer Default (min)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={defaultDurationMinutes}
                onChange={(e) => setDefaultDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Priorità (1 = Max)
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {roleToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Ruolo</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
              >
                {roleToEdit ? 'Salva Modifiche' : 'Crea Ruolo'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

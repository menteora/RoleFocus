import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DAYS_OF_WEEK_SHORT } from '../utils/timeUtils';
import { X, Trash2, Clock } from 'lucide-react';
import type { TimeSlot, Role } from '../types';

interface SlotEditorModalProps {
  isOpen: boolean;
  role: Role | null;
  slotToEdit?: TimeSlot | null;
  onClose: () => void;
}

export const SlotEditorModal: React.FC<SlotEditorModalProps> = ({
  isOpen,
  role,
  slotToEdit,
  onClose,
}) => {
  const { createOrUpdateSlot, deleteSlot } = useApp();

  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:30');
  const [label, setLabel] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Lun-Ven
  const [error, setError] = useState('');

  useEffect(() => {
    if (slotToEdit) {
      setStartTime(slotToEdit.startTime);
      setEndTime(slotToEdit.endTime);
      setLabel(slotToEdit.label || '');
      setSelectedDays(slotToEdit.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]);
    } else {
      setStartTime('08:30');
      setEndTime('17:30');
      setLabel('');
      setSelectedDays([1, 2, 3, 4, 5]);
    }
    setError('');
  }, [slotToEdit, isOpen]);

  if (!isOpen || !role) return null;

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        setError('Devi selezionare almeno un giorno.');
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
    if (!startTime || !endTime) {
      setError('Inserisci sia orario di inizio che di fine.');
      return;
    }

    if (selectedDays.length === 0) {
      setError('Seleziona almeno un giorno della settimana.');
      return;
    }

    try {
      await createOrUpdateSlot({
        ...(slotToEdit?.id ? { id: slotToEdit.id } : {}),
        roleId: role.id,
        startTime,
        endTime,
        label: label.trim() || undefined,
        daysOfWeek: selectedDays.length === 7 ? undefined : selectedDays,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio della fascia');
    }
  };

  const handleDelete = async () => {
    if (!slotToEdit) return;
    if (confirm('Sei sicuro di voler eliminare questa fascia oraria?')) {
      await deleteSlot(slotToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {slotToEdit ? 'Modifica Fascia Oraria' : 'Aggiungi Fascia Oraria'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Ruolo:{' '}
            <span className="font-semibold text-slate-900 dark:text-white" style={{ color: role.color }}>
              {role.name}
            </span>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          {/* Start and End Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Dalle (Inizio) *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Alle (Fine) *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Days of Week Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Giorni Attivi
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Tutti
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Lun-Ven
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  onClick={selectWeekend}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sab-Dom
                </button>
              </div>
            </div>

            {/* Days buttons in standard Italian order (Lun=1 to Dom=0) */}
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                const isSelected = selectedDays.includes(dayNum);
                return (
                  <button
                    type="button"
                    key={dayNum}
                    onClick={() => toggleDay(dayNum)}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {DAYS_OF_WEEK_SHORT[dayNum]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Label */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Etichetta Opzionale
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Es. Turno Mattina, Orario Ufficio, Pomeriggio..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {slotToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Fascia</span>
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
                {slotToEdit ? 'Salva Modifiche' : 'Aggiungi Fascia'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

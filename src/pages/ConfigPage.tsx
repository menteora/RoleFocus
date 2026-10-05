import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RoleIcon } from '../utils/icons';
import { formatSlotDays, getSlotDurationMinutes } from '../utils/timeUtils';
import { RoleEditorModal } from '../components/RoleEditorModal';
import { SlotEditorModal } from '../components/SlotEditorModal';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  ArrowUp,
  ArrowDown,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import type { Role, TimeSlot } from '../types';

export const ConfigPage: React.FC = () => {
  const {
    roles,
    timeSlots,
    deleteRole,
    deleteSlot,
    updateRoleOrder,
  } = useApp();

  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<Role | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [selectedRoleForSlot, setSelectedRoleForSlot] = useState<Role | null>(null);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<TimeSlot | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  const handleOpenAddRole = () => {
    setSelectedRoleForEdit(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setSelectedRoleForEdit(role);
    setIsRoleModalOpen(true);
  };

  const handleOpenAddSlot = (role: Role) => {
    setSelectedRoleForSlot(role);
    setSelectedSlotForEdit(null);
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (role: Role, slot: TimeSlot) => {
    setSelectedRoleForSlot(role);
    setSelectedSlotForEdit(slot);
    setIsSlotModalOpen(true);
  };

  const handleMoveRole = async (index: number, direction: 'up' | 'down') => {
    const newRoles = [...roles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRoles.length) return;

    const temp = newRoles[index];
    newRoles[index] = newRoles[targetIndex];
    newRoles[targetIndex] = temp;

    await updateRoleOrder(newRoles.map((r) => r.id));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Configurazione Sistema</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 font-['Syne',sans-serif]">
            Ruoli e Fasce Orarie
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Definisci chi sei durante l'arco della giornata e imposta le fasce orarie in cui ogni ruolo è attivo.
          </p>
        </div>

        <button
          onClick={handleOpenAddRole}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuovo Ruolo</span>
        </button>
      </div>

      {/* ROLES LIST */}
      <div className="space-y-4">
        {roles.map((role, index) => {
          const roleSlots = timeSlots.filter((slot) => slot.roleId === role.id);
          const totalSlotMinutes = roleSlots.reduce((sum, s) => sum + getSlotDurationMinutes(s), 0);
          const totalHours = (totalSlotMinutes / 60).toFixed(1);

          return (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all relative overflow-hidden"
            >
              {/* Left accent border */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: role.color }}
              />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Role Details */}
                <div className="flex items-start gap-3.5">
                  
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button
                      onClick={() => handleMoveRole(index, 'up')}
                      disabled={index === 0}
                      title="Sposta su priorità"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveRole(index, 'down')}
                      disabled={index === roles.length - 1}
                      title="Sposta giù priorità"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: role.color }}
                  >
                    <RoleIcon name={role.iconName} className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {role.name}
                      </h2>
                      <span className="text-xs font-mono text-slate-400">
                        (Priorità #{role.priority})
                      </span>
                    </div>

                    {role.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {role.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-2">
                      <span>Giorni: <strong className="text-slate-600 dark:text-slate-300">{formatSlotDays(role.daysOfWeek)}</strong></span>
                      <span>·</span>
                      <span>Timer default: <strong className="text-slate-600 dark:text-slate-300 font-mono">{role.defaultDurationMinutes || 25}m</strong></span>
                      <span>·</span>
                      <span>{roleSlots.length} {roleSlots.length === 1 ? 'fascia oraria' : 'fasce orarie'}</span>
                      {roleSlots.length > 0 && (
                        <>
                          <span>·</span>
                          <span>~{totalHours}h/giorno</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleOpenAddSlot(role)}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi Fascia</span>
                  </button>
                  
                  <button
                    onClick={() => handleOpenEditRole(role)}
                    title="Modifica ruolo"
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* TIME SLOTS SUB-LIST */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {roleSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {roleSlots.map((slot) => (
                      <div
                        key={slot.id}
                        onClick={() => handleOpenEditSlot(role, slot)}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>{slot.startTime} - {slot.endTime}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatSlotDays(slot.daysOfWeek)}
                            {slot.label && ` · ${slot.label}`}
                          </div>
                        </div>

                        <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic flex items-center justify-between py-1">
                    <span>Nessuna fascia oraria assegnata a questo ruolo.</span>
                    <button
                      onClick={() => handleOpenAddSlot(role)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium not-italic"
                    >
                      + Aggiungi fascia adesso
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}

        {roles.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nessun ruolo presente
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Crea il tuo primo ruolo per iniziare a strutturare le fasce orarie della tua giornata.
              </p>
            </div>
            <button
              onClick={handleOpenAddRole}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium"
            >
              Crea Primo Ruolo
            </button>
          </div>
        )}
      </div>

      {/* Role Editor Modal */}
      <RoleEditorModal
        isOpen={isRoleModalOpen}
        roleToEdit={selectedRoleForEdit}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedRoleForEdit(null);
        }}
      />

      {/* Slot Editor Modal */}
      <SlotEditorModal
        isOpen={isSlotModalOpen}
        role={selectedRoleForSlot}
        slotToEdit={selectedSlotForEdit}
        onClose={() => {
          setIsSlotModalOpen(false);
          setSelectedRoleForSlot(null);
          setSelectedSlotForEdit(null);
        }}
      />

    </div>
  );
};

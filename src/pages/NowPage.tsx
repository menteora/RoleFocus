import React from 'react';
import { useApp } from '../context/AppContext';
import { minutesToTimeString, getNextUpcomingSlot } from '../utils/timeUtils';
import { RoleIcon } from '../utils/icons';
import { ActiveTimerWidget } from '../components/ActiveTimerWidget';
import { RoleDecisionTriad } from '../components/RoleDecisionTriad';
import {
  Play,
  Clock,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type { Role, DecisionMode } from '../types';

export const NowPage: React.FC = () => {
  const {
    activeRolesInfo,
    roles,
    timeSlots,
    effectiveMinutes,
    effectiveDayOfWeek,
    startTimerForRole,
    activeTimer,
    setActiveTab,
  } = useApp();

  const isTimerRunning = Boolean(activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused'));

  const handleStartTimer = async (
    role: Role,
    taskText: string,
    durationMinutes: number,
    category: DecisionMode
  ) => {
    await startTimerForRole(role, taskText, durationMinutes, category);
  };

  // Find next upcoming role if no roles are active right now
  const upcomingSlotsByRole = roles
    .map((role) => {
      const roleSlots = timeSlots.filter((s) => s.roleId === role.id);
      const upcoming = getNextUpcomingSlot(roleSlots, effectiveMinutes, effectiveDayOfWeek);
      return { role, upcoming };
    })
    .filter((item) => item.upcoming !== null)
    .sort((a, b) => (a.upcoming?.startMinutes || 0) - (b.upcoming?.startMinutes || 0));

  const nextUpcoming = upcomingSlotsByRole[0] || null;

  return (
    <div className="space-y-6">
      
      {/* Active Timer Floating/Pinned Card if active */}
      <ActiveTimerWidget />

      {/* Main header for Now page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Fascia Oraria Attuale ({minutesToTimeString(effectiveMinutes)})</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 font-['Syne',sans-serif]">
            Cosa sei chiamato a essere adesso
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Scegli la tua priorità in base al tuo livello di energia o alle dipendenze del momento.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('config')}
          className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 self-start sm:self-auto py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Gestisci ruoli e fasce</span>
        </button>
      </div>

      {/* ACTIVE ROLES GRID / LIST */}
      {activeRolesInfo.length > 0 ? (
        <div className="space-y-6">
          {activeRolesInfo.map(({ role, activeSlots, tasksByCategory, activeDecisionMode }) => {
            const isRoleFocusedInTimer = Boolean(activeTimer?.roleId === role.id && isTimerRunning);

            return (
              <div
                key={role.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs transition-all relative overflow-hidden space-y-5 ${
                  isRoleFocusedInTimer
                    ? 'border-blue-500/80 ring-2 ring-blue-500/20 dark:ring-blue-400/10'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Accent top color strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: role.color }}
                />

                {/* Top Bar inside Role Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: role.color }}
                    >
                      <RoleIcon name={role.iconName} className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {role.name}
                        </h2>
                        {isRoleFocusedInTimer && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                            Focus in corso
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Active Slots badges */}
                  <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                    {activeSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                        {slot.label && <span className="font-sans text-[10px] text-slate-400 font-normal hidden sm:inline">({slot.label})</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Decision Activities Management & Selector */}
                <RoleDecisionTriad
                  role={role}
                  tasksByCategory={tasksByCategory}
                  activeDecisionMode={activeDecisionMode}
                  onStartTimer={handleStartTimer}
                  isRoleTimerRunning={isRoleFocusedInTimer}
                />

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State when no roles match current time */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nessun ruolo programmato per le {minutesToTimeString(effectiveMinutes)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              In questa fascia oraria non ci sono ruoli attivi impostati.
            </p>
          </div>

          {nextUpcoming && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs flex items-center justify-between text-left">
              <div>
                <span className="text-slate-400 text-[11px] block">Prossimo ruolo in programma:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {nextUpcoming.role.name}
                </span>
              </div>
              <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                alle {nextUpcoming.upcoming?.slot.startTime}
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={() => setActiveTab('config')}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors"
            >
              Configura fasce orarie
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              Vedi panoramica 24h
            </button>
          </div>
        </div>
      )}

      {/* ALL ROLES QUICK LAUNCH SECTION (for ad-hoc sessions) */}
      {roles.length > 0 && (
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tutti i tuoi ruoli (avvio rapido)
            </h3>
            <span className="text-[11px] text-slate-400">
              Avvia una sessione di concentrazione su qualsiasi ruolo anche fuori orario
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {roles.map((r) => {
              const isActiveNow = activeRolesInfo.some((info) => info.role.id === r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => handleStartTimer(r, `Focus: ${r.name}`, r.defaultDurationMinutes || 25, 'important')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between group transition-all ${
                    isActiveNow
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {r.name}
                    </span>
                  </div>
                  <Play className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

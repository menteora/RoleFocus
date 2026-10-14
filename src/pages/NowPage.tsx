import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { minutesToTimeString, isSlotActiveAtTime, getNextUpcomingSlot } from '../utils/timeUtils';
import { RoleIcon } from '../utils/icons';
import { ActiveTimerWidget } from '../components/ActiveTimerWidget';
import { RoleDecisionTriad } from '../components/RoleDecisionTriad';
import {
  Clock,
  Sliders,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Flame,
  ListTodo,
  Play,
  Circle,
  ArrowRight,
} from 'lucide-react';
import type { Role, DecisionMode, TimeSlot, RoleTask } from '../types';

export const NowPage: React.FC = () => {
  const {
    activeRolesInfo,
    roles,
    timeSlots,
    tasks,
    effectiveMinutes,
    effectiveDayOfWeek,
    startTimerForRole,
    activeTimer,
    selectedDecisions,
    setActiveTab,
    toggleTaskStatus,
    toggleTaskUrgent,
  } = useApp();

  // Manually selected role id (if null, defaults to first scheduled role)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const isTimerRunning = Boolean(activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused'));

  const handleStartTimer = async (
    role: Role,
    taskText: string,
    durationMinutes: number,
    category: DecisionMode,
    taskId?: string
  ) => {
    await startTimerForRole(role, taskText, durationMinutes, category, taskId);
  };

  // Determine which role is effectively viewed
  const effectiveRoleId = useMemo(() => {
    if (selectedRoleId) {
      const exists = roles.some((r) => r.id === selectedRoleId);
      if (exists) return selectedRoleId;
    }
    // Default to first active role in current time slot, or first role overall
    return activeRolesInfo[0]?.role.id || roles[0]?.id || null;
  }, [selectedRoleId, activeRolesInfo, roles]);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === effectiveRoleId) || null;
  }, [roles, effectiveRoleId]);

  // Check if selected role is active in current schedule
  const isSelectedRoleScheduledNow = useMemo(() => {
    if (!selectedRole) return false;
    return activeRolesInfo.some((info) => info.role.id === selectedRole.id);
  }, [selectedRole, activeRolesInfo]);

  // Find next upcoming role if no roles are active right now
  const upcomingSlotsByRole = useMemo(() => {
    return roles
      .map((role) => {
        const roleSlots = timeSlots.filter((s) => s.roleId === role.id);
        const upcoming = getNextUpcomingSlot(roleSlots, effectiveMinutes, effectiveDayOfWeek);
        return { role, upcoming };
      })
      .filter((item) => item.upcoming !== null)
      .sort((a, b) => (a.upcoming?.startMinutes || 0) - (b.upcoming?.startMinutes || 0));
  }, [roles, timeSlots, effectiveMinutes, effectiveDayOfWeek]);

  const nextUpcoming = upcomingSlotsByRole[0] || null;

  // Selected role tasks & slots
  const selectedRoleData = useMemo(() => {
    if (!selectedRole) return null;

    const roleSlots = timeSlots.filter((s) => s.roleId === selectedRole.id);
    const activeSlots = roleSlots.filter((s) =>
      isSlotActiveAtTime(s, effectiveMinutes, effectiveDayOfWeek)
    );

    const roleTasks = tasks.filter((t) => t.roleId === selectedRole.id);
    const tasksByCategory: Record<DecisionMode, RoleTask[]> = {
      important: roleTasks.filter((t) => (t.category || 'important') === 'important'),
      quick: roleTasks.filter((t) => t.category === 'quick'),
      unblocker: roleTasks.filter((t) => t.category === 'unblocker'),
    };

    return {
      role: selectedRole,
      activeSlots,
      allSlots: roleSlots,
      tasksByCategory,
    };
  }, [selectedRole, timeSlots, tasks, effectiveMinutes, effectiveDayOfWeek]);

  // Visible tabs: All currently scheduled roles in current time slot + selected role if outside schedule
  const displayedRoleTabs = useMemo(() => {
    const list: { role: Role; isScheduledNow: boolean; activeSlots: TimeSlot[] }[] = [];

    // Add all scheduled roles
    for (const info of activeRolesInfo) {
      list.push({
        role: info.role,
        isScheduledNow: true,
        activeSlots: info.activeSlots,
      });
    }

    // If selected role is outside schedule, include it as an off-schedule tab
    if (selectedRole && !list.some((item) => item.role.id === selectedRole.id)) {
      list.push({
        role: selectedRole,
        isScheduledNow: false,
        activeSlots: [],
      });
    }

    return list;
  }, [activeRolesInfo, selectedRole]);

  const isSelectedRoleTimerRunning = Boolean(
    activeTimer?.roleId === selectedRole?.id && isTimerRunning
  );

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const urgentTasks = useMemo(() => openTasks.filter((t) => t.isUrgent), [openTasks]);

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

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('tasks')}
            className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ListTodo className="w-3.5 h-3.5 text-blue-500" />
            <span>Tutti i task ({openTasks.length})</span>
            {urgentTasks.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400">
                <Flame className="w-2.5 h-2.5 fill-orange-500 text-orange-500 animate-pulse" />
                {urgentTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Gestisci ruoli</span>
          </button>
        </div>
      </div>

      {/* SPOTLIGHT: TASK URGENTI CON RISALTO (PINNED 🔥) */}
      {urgentTasks.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-orange-950/20 border-2 border-orange-400/90 dark:border-orange-500/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-200/80 dark:border-orange-900/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                <Flame className="w-4 h-4 fill-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-orange-950 dark:text-orange-100">
                    Task Urgenti da Risolvere
                  </h2>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.2 rounded-full bg-orange-500 text-white shadow-2xs">
                    {urgentTasks.length} {urgentTasks.length === 1 ? 'urgente' : 'urgenti'}
                  </span>
                </div>
                <p className="text-[11px] text-orange-800/80 dark:text-orange-300/80">
                  Attività pinned ad alta priorità su tutti i ruoli.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs font-semibold text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-white flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Vedi tutti i {openTasks.length} task</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {urgentTasks.map((t) => {
              const role = roles.find((r) => r.id === t.roleId);
              const isTimerRunningOnThisTask = Boolean(activeTimer?.taskId === t.id && (activeTimer.status === 'running' || activeTimer.status === 'paused'));

              return (
                <div
                  key={t.id}
                  className="p-3 bg-white/95 dark:bg-slate-900/95 border border-orange-300/80 dark:border-orange-800/80 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(t.id)}
                      title="Segna come completato"
                      className="text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                    >
                      <Circle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleTaskUrgent(t.id)}
                      title="Rimuovi risalto urgente"
                      className="p-1 rounded-md text-orange-500 hover:text-orange-600 bg-orange-100 dark:bg-orange-950/80 shrink-0 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {t.text}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {role && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md flex items-center gap-1 border shrink-0"
                            style={{
                              backgroundColor: `${role.color}15`,
                              borderColor: `${role.color}40`,
                              color: role.color,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: role.color }}
                            />
                            <span>{role.name}</span>
                          </span>
                        )}
                        {isTimerRunningOnThisTask && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md animate-pulse">
                            Focus attivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {role && !isTimerRunningOnThisTask && (
                    <button
                      type="button"
                      onClick={() => {
                        const cat = t.category || 'important';
                        const duration = role.defaultDurationMinutes || 25;
                        startTimerForRole(role, t.text, duration, cat, t.id);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                      title="Avvia subito timer su questo task"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Avvia Focus</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROLE TABS IN CURRENT SECTION (Scheduled + Selected out-of-schedule) */}
      {displayedRoleTabs.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {displayedRoleTabs.map(({ role, isScheduledNow, activeSlots }) => {
            const isTabSelected = role.id === effectiveRoleId;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border shrink-0 ${
                  isTabSelected
                    ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800/60 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: role.color }}
                />
                <span>{role.name}</span>
                {isScheduledNow ? (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md">
                    In fascia
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md">
                    Fuori orario
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ACTIVE / SELECTED ROLE CARD */}
      {selectedRole && selectedRoleData ? (
        <div
          className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs transition-all relative overflow-hidden space-y-5 ${
            isSelectedRoleTimerRunning
              ? 'border-blue-500/80 ring-2 ring-blue-500/20 dark:ring-blue-400/10'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          {/* Accent top color strip */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: selectedRole.color }}
          />

          {/* Top Bar inside Role Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: selectedRole.color }}
              >
                <RoleIcon name={selectedRole.iconName} className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedRole.name}
                  </h2>
                  {isSelectedRoleTimerRunning && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      Focus in corso
                    </span>
                  )}
                </div>
                {selectedRole.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {selectedRole.description}
                  </p>
                )}
              </div>
            </div>

            {/* Active Slots badges or Fuori Orario indicator */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {isSelectedRoleScheduledNow ? (
                selectedRoleData.activeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Fascia attiva: {slot.startTime} - {slot.endTime}</span>
                    {slot.label && <span className="font-sans text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">({slot.label})</span>}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Visualizzazione fuori orario</span>
                  </div>

                  {activeRolesInfo.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(activeRolesInfo[0].role.id)}
                      className="px-2 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
                      title="Torna al ruolo programmato per adesso"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Torna alla fascia attuale ({activeRolesInfo[0].role.name})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3 Decision Activities Management & Selector */}
          <RoleDecisionTriad
            role={selectedRole}
            tasksByCategory={selectedRoleData.tasksByCategory}
            activeDecisionMode={selectedDecisions[selectedRole.id] || 'important'}
            onStartTimer={handleStartTimer}
            isRoleTimerRunning={isSelectedRoleTimerRunning}
          />
        </div>
      ) : (
        /* Empty State when no roles match current time and no roles exist */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nessun ruolo programmato per le {minutesToTimeString(effectiveMinutes)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              In questa fascia oraria non ci sono ruoli attivi impostati. Seleziona un ruolo sotto per visualizzarlo fuori orario, o configura le fasce.
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

      {/* ALL ROLES SELECTOR SECTION */}
      {roles.length > 0 && (
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tutti i tuoi ruoli
            </h3>
            <span className="text-[11px] text-slate-400">
              Seleziona un ruolo per visualizzarlo sopra e gestirne le priorità, anche fuori orario.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {roles.map((r) => {
              const isScheduledNow = activeRolesInfo.some((info) => info.role.id === r.id);
              const isCurrentlyViewed = r.id === effectiveRoleId;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoleId(r.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all group ${
                    isCurrentlyViewed
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                      : isScheduledNow
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: r.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {r.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {isCurrentlyViewed ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">Visualizzato</span>
                        ) : isScheduledNow ? (
                          <span className="text-emerald-600 dark:text-emerald-400">In fascia adesso</span>
                        ) : (
                          <span>Fuori orario</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isCurrentlyViewed ? (
                    <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : isScheduledNow ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

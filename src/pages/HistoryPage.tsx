import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../db/db';
import { formatMinutesToHoursMinutes } from '../utils/timeUtils';
import { RoleIcon } from '../utils/icons';
import {
  History,
  CheckCircle2,
  Trash2,
  Clock,
  Filter,
  Search,
  Zap,
  BatteryLow,
  Unlock,
  BarChart3,
  Calendar,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import type { DecisionMode } from '../types';

type HistoryViewMode = 'activities' | 'sessions' | 'strategy';

export const HistoryPage: React.FC = () => {
  const { timerSessions, tasks, roles } = useApp();
  const [viewMode, setViewMode] = useState<HistoryViewMode>('activities');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtered sessions based on role and category
  const filteredSessions = useMemo(() => {
    return timerSessions.filter((s) => {
      if (selectedRoleFilter !== 'all' && s.roleId !== selectedRoleFilter) return false;
      if (selectedCategoryFilter !== 'all' && s.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim() && !s.taskText.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [timerSessions, selectedRoleFilter, selectedCategoryFilter, searchQuery]);

  // Total minutes calculations
  const totalMinutesAllTime = filteredSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  // Today's focus sessions
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaySessions = filteredSessions.filter((s) => s.startedAt >= startOfToday.getTime());
  const todayMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  // Aggregated activities with time spent
  const aggregatedActivities = useMemo(() => {
    // Map tasks by key (taskId or lowercased taskText + roleId)
    const map = new Map<
      string,
      {
        key: string;
        taskId?: string;
        taskText: string;
        roleId: string;
        roleName: string;
        roleColor: string;
        category?: DecisionMode;
        totalMinutes: number;
        sessionsCount: number;
        completed: boolean;
        lastSessionDate?: number;
      }
    >();

    // 1. First add all defined tasks in database
    for (const t of tasks) {
      const role = roles.find((r) => r.id === t.roleId);
      map.set(t.id, {
        key: t.id,
        taskId: t.id,
        taskText: t.text,
        roleId: t.roleId,
        roleName: role?.name || 'Ruolo non trovato',
        roleColor: role?.color || '#2563eb',
        category: t.category,
        totalMinutes: t.totalMinutesSpent || 0,
        sessionsCount: t.sessionCount || 0,
        completed: t.completed,
      });
    }

    // 2. Aggregate sessions into tasks (or ad-hoc sessions)
    for (const s of timerSessions) {
      if (s.taskId && map.has(s.taskId)) {
        const item = map.get(s.taskId)!;
        // ensure last session date is tracked
        if (!item.lastSessionDate || s.startedAt > item.lastSessionDate) {
          item.lastSessionDate = s.startedAt;
        }
      } else {
        // Look up by matching taskText & roleId
        const existingEntry = Array.from(map.values()).find(
          (item) =>
            item.roleId === s.roleId &&
            item.taskText.trim().toLowerCase() === s.taskText.trim().toLowerCase()
        );

        if (existingEntry) {
          if (!existingEntry.lastSessionDate || s.startedAt > existingEntry.lastSessionDate) {
            existingEntry.lastSessionDate = s.startedAt;
          }
        } else {
          // Ad-hoc session not tied to a predefined task
          const adHocKey = `adhoc-${s.roleId}-${s.taskText.trim().toLowerCase()}`;
          if (map.has(adHocKey)) {
            const item = map.get(adHocKey)!;
            item.totalMinutes += s.durationMinutes;
            item.sessionsCount += 1;
            if (!item.lastSessionDate || s.startedAt > item.lastSessionDate) {
              item.lastSessionDate = s.startedAt;
            }
          } else {
            const role = roles.find((r) => r.id === s.roleId);
            map.set(adHocKey, {
              key: adHocKey,
              taskText: s.taskText,
              roleId: s.roleId,
              roleName: s.roleName || role?.name || 'Senza ruolo',
              roleColor: s.roleColor || role?.color || '#2563eb',
              category: s.category || 'important',
              totalMinutes: s.durationMinutes,
              sessionsCount: 1,
              completed: s.completed,
              lastSessionDate: s.startedAt,
            });
          }
        }
      }
    }

    // Convert map to array and apply filters
    let list = Array.from(map.values());

    if (selectedRoleFilter !== 'all') {
      list = list.filter((a) => a.roleId === selectedRoleFilter);
    }
    if (selectedCategoryFilter !== 'all') {
      list = list.filter((a) => a.category === selectedCategoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.taskText.toLowerCase().includes(q) ||
          a.roleName.toLowerCase().includes(q)
      );
    }

    // Sort by total minutes spent descending, then by sessions count
    return list.sort((a, b) => b.totalMinutes - a.totalMinutes || b.sessionsCount - a.sessionsCount);
  }, [tasks, timerSessions, roles, selectedRoleFilter, selectedCategoryFilter, searchQuery]);

  // Strategy distribution breakdown
  const strategyStats = useMemo(() => {
    const categories: Record<DecisionMode, { label: string; icon: any; totalMins: number; count: number; colorClass: string }> = {
      important: {
        label: 'Hai energia → Più importante',
        icon: Zap,
        totalMins: 0,
        count: 0,
        colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      },
      quick: {
        label: 'Hai poca energia → Più veloce',
        icon: BatteryLow,
        totalMins: 0,
        count: 0,
        colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      },
      unblocker: {
        label: 'Hai molte dipendenze → Sblocca le altre',
        icon: Unlock,
        totalMins: 0,
        count: 0,
        colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      },
    };

    for (const s of filteredSessions) {
      const cat = s.category || 'important';
      if (categories[cat]) {
        categories[cat].totalMins += s.durationMinutes || 0;
        categories[cat].count += 1;
      }
    }

    return categories;
  }, [filteredSessions]);

  const handleDeleteSession = async (sessionId: string) => {
    await db.timerSessions.delete(sessionId);
  };

  const handleClearAllHistory = async () => {
    if (confirm('Vuoi davvero cancellare tutto lo storico delle sessioni di focus?')) {
      await db.timerSessions.clear();
      // Reset totalMinutesSpent on tasks
      const allTasks = await db.tasks.toArray();
      for (const t of allTasks) {
        await db.tasks.update(t.id, { totalMinutesSpent: 0, sessionCount: 0 });
      }
    }
  };

  const maxActivityMinutes = Math.max(1, ...aggregatedActivities.map((a) => a.totalMinutes));

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Tracciamento & Storico</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 font-['Syne',sans-serif]">
            Tempo Speso per Attività
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analizza il tempo dedicato a ciascuna attività, ruolo e modalità decisionale.
          </p>
        </div>

        {timerSessions.length > 0 && (
          <button
            onClick={handleClearAllHistory}
            className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 py-1.5 px-3 rounded-xl border border-red-200 dark:border-red-900/60 transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Svuota Storico</span>
          </button>
        )}
      </div>

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Focus di Oggi</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatMinutesToHoursMinutes(todayMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {todaySessions.length} {todaySessions.length === 1 ? 'sessione completata' : 'sessioni completate'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Tempo Totale Tracciato</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatMinutesToHoursMinutes(totalMinutesAllTime)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredSessions.length} sessioni complessive
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Attività Più Lavorata</span>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate" title={aggregatedActivities[0]?.taskText}>
            {aggregatedActivities[0]?.taskText || 'Nessuna attività'}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
            {aggregatedActivities[0]?.totalMinutes ? `${formatMinutesToHoursMinutes(aggregatedActivities[0].totalMinutes)} spesi` : 'Nessun dato'}
          </span>
        </div>

      </div>

      {/* View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('activities')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'activities'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tempo per Attività ({aggregatedActivities.length})</span>
          </button>

          <button
            onClick={() => setViewMode('sessions')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'sessions'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Registro Sessioni ({filteredSessions.length})</span>
          </button>

          <button
            onClick={() => setViewMode('strategy')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'strategy'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Energia & Strategia</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome attività..."
            className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* Filter Badges: Roles */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Ruolo:
        </span>
        <button
          onClick={() => setSelectedRoleFilter('all')}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            selectedRoleFilter === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          Tutti i Ruoli
        </button>

        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoleFilter(r.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedRoleFilter === r.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
            <span>{r.name}</span>
          </button>
        ))}
      </div>

      {/* VIEW 1: AGGREGATED TIME PER ACTIVITY (Main Request) */}
      {viewMode === 'activities' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          {aggregatedActivities.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {aggregatedActivities.map((act) => {
                const percent = Math.min(100, Math.round((act.totalMinutes / maxActivityMinutes) * 100));

                return (
                  <div
                    key={act.key}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      
                      {/* Left: Task Title and Meta */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5"
                          style={{ backgroundColor: act.roleColor }}
                        >
                          <RoleIcon name="Target" className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {act.roleName}
                            </span>
                            {act.category && (
                              <>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  {act.category === 'important' && '⚡ Più importante'}
                                  {act.category === 'quick' && '🔋 Più veloce'}
                                  {act.category === 'unblocker' && '🔓 Sblocca le altre'}
                                </span>
                              </>
                            )}
                            {act.completed && (
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Completata
                              </span>
                            )}
                          </div>

                          <h3 className={`text-sm font-semibold mt-0.5 ${act.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                            {act.taskText}
                          </h3>
                        </div>
                      </div>

                      {/* Right: Time spent and session counts */}
                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatMinutesToHoursMinutes(act.totalMinutes)}
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {act.sessionsCount} {act.sessionsCount === 1 ? 'sessione' : 'sessioni'}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Progress Bar showing relative weight of time spent */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(3, percent)}%`,
                          backgroundColor: act.roleColor,
                        }}
                      />
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p>Nessuna attività trovata per i criteri selezionati.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CHRONOLOGICAL SESSIONS LOG */}
      {viewMode === 'sessions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          {filteredSessions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSessions.map((session) => {
                const dateStr = new Date(session.startedAt).toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={session.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: session.roleColor || '#2563eb' }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {session.roleName}
                          </span>
                          {session.category && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {session.category === 'important' && '⚡ Più importante'}
                                {session.category === 'quick' && '🔋 Più veloce'}
                                {session.category === 'unblocker' && '🔓 Sblocca le altre'}
                              </span>
                            </>
                          )}
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {dateStr}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                          {session.taskText || 'Sessione Focus'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {session.durationMinutes} min
                      </div>

                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        title="Elimina record"
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p>Nessuna sessione di focus registrata per questo filtro.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: STRATEGY & ENERGY BREAKDOWN */}
      {viewMode === 'strategy' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['important', 'quick', 'unblocker'] as DecisionMode[]).map((modeKey) => {
            const item = strategyStats[modeKey];
            const Icon = item.icon;
            const percentOfTotal = totalMinutesAllTime > 0
              ? Math.round((item.totalMins / totalMinutesAllTime) * 100)
              : 0;

            return (
              <div
                key={modeKey}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl border ${item.colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatMinutesToHoursMinutes(item.totalMins)}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.label}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>{item.count} {item.count === 1 ? 'sessione' : 'sessioni'}</span>
                    <span className="font-mono">{percentOfTotal}% del tempo</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-blue-600"
                    style={{ width: `${percentOfTotal}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import type { TimerSession, Role } from '../types';
import { formatMinutesToHoursMinutes } from '../utils/timeUtils';
import {
  CalendarDays,
  TrendingUp,
  Award,
  Flame,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Sparkles,
  BarChart3,
  Layers,
} from 'lucide-react';

interface DailyStatsSectionProps {
  sessions: TimerSession[];
  roles: Role[];
}

type DateRangeOption = '7' | '14' | '30' | 'all';

interface DayRoleBreakdown {
  roleId: string;
  roleName: string;
  roleColor: string;
  minutes: number;
  percent: number;
}

interface DayTaskBreakdown {
  key: string;
  taskText: string;
  roleName: string;
  roleColor: string;
  minutes: number;
  sessionsCount: number;
}

interface DaySummary {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  label: string; // e.g. "Oggi, 14 Ottobre"
  shortDay: string; // e.g. "Mer 14"
  weekdayShort: string; // e.g. "Mer"
  dayNumber: number; // 14
  isToday: boolean;
  isYesterday: boolean;
  totalMinutes: number;
  sessionCount: number;
  roles: DayRoleBreakdown[];
  tasks: DayTaskBreakdown[];
}

// Format local date key YYYY-MM-DD
function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DailyStatsSection: React.FC<DailyStatsSectionProps> = ({ sessions, roles }) => {
  const [range, setRange] = useState<DateRangeOption>('7');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // 1. Group all available sessions by local calendar day (YYYY-MM-DD)
  const sessionsByDayKey = useMemo(() => {
    const map = new Map<string, TimerSession[]>();
    for (const s of sessions) {
      if (!s.startedAt) continue;
      const d = new Date(s.startedAt);
      const key = getLocalDateKey(d);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  // Helper to compile a DaySummary from a date and its sessions
  const compileDaySummary = (d: Date, daySessions: TimerSession[], todayKey: string, yesterdayKey: string): DaySummary => {
    const dateKey = getLocalDateKey(d);
    const isToday = dateKey === todayKey;
    const isYesterday = dateKey === yesterdayKey;

    const weekdayShort = d.toLocaleDateString('it-IT', { weekday: 'short' });
    const capitalizedWeekday = weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1);
    const dayNumber = d.getDate();
    const monthShort = d.toLocaleDateString('it-IT', { month: 'short' });
    const fullDateStr = d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const capitalizedFullDate = fullDateStr.charAt(0).toUpperCase() + fullDateStr.slice(1);

    let prefix = '';
    if (isToday) prefix = 'Oggi, ';
    else if (isYesterday) prefix = 'Ieri, ';

    const label = `${prefix}${capitalizedFullDate}`;
    const shortDay = `${capitalizedWeekday} ${dayNumber}`;

    const totalMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const sessionCount = daySessions.length;

    // Roles breakdown
    const roleMinutesMap = new Map<string, { roleName: string; roleColor: string; minutes: number }>();
    for (const s of daySessions) {
      const rId = s.roleId || 'unknown';
      const existing = roleMinutesMap.get(rId);
      const matchedRole = roles.find((r) => r.id === rId);
      const roleName = s.roleName || matchedRole?.name || 'Senza ruolo';
      const roleColor = s.roleColor || matchedRole?.color || '#3b82f6';
      const mins = s.durationMinutes || 0;

      if (existing) {
        existing.minutes += mins;
      } else {
        roleMinutesMap.set(rId, { roleName, roleColor, minutes: mins });
      }
    }

    const rolesBreakdown: DayRoleBreakdown[] = Array.from(roleMinutesMap.entries())
      .map(([rId, data]) => ({
        roleId: rId,
        roleName: data.roleName,
        roleColor: data.roleColor,
        minutes: data.minutes,
        percent: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    // Tasks breakdown
    const taskMap = new Map<string, DayTaskBreakdown>();
    for (const s of daySessions) {
      const key = `${s.roleId}-${(s.taskText || 'Sessione Focus').trim().toLowerCase()}`;
      const existing = taskMap.get(key);
      const matchedRole = roles.find((r) => r.id === s.roleId);
      const roleName = s.roleName || matchedRole?.name || 'Senza ruolo';
      const roleColor = s.roleColor || matchedRole?.color || '#3b82f6';

      if (existing) {
        existing.minutes += s.durationMinutes || 0;
        existing.sessionsCount += 1;
      } else {
        taskMap.set(key, {
          key,
          taskText: s.taskText || 'Sessione Focus',
          roleName,
          roleColor,
          minutes: s.durationMinutes || 0,
          sessionsCount: 1,
        });
      }
    }

    const tasks: DayTaskBreakdown[] = Array.from(taskMap.values()).sort(
      (a, b) => b.minutes - a.minutes
    );

    return {
      dateKey,
      date: d,
      label,
      shortDay,
      weekdayShort: capitalizedWeekday,
      dayNumber,
      isToday,
      isYesterday,
      totalMinutes,
      sessionCount,
      roles: rolesBreakdown,
      tasks,
    };
  };

  // 2. Generate the daily list based on range
  const dailyData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateKey(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday);

    if (range === 'all') {
      // Collect all days present in sessions
      const keys = Array.from(sessionsByDayKey.keys()).sort().reverse();
      if (keys.length === 0) {
        // Return at least today
        return [compileDaySummary(today, [], todayKey, yesterdayKey)];
      }
      return keys.map((key) => {
        const [year, month, day] = key.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        const daySessions = sessionsByDayKey.get(key) || [];
        return compileDaySummary(d, daySessions, todayKey, yesterdayKey);
      });
    }

    const daysCount = parseInt(range, 10) || 7;
    const list: DaySummary[] = [];

    // Generate days chronologically from (today - (daysCount - 1)) up to today
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const daySessions = sessionsByDayKey.get(key) || [];
      list.push(compileDaySummary(d, daySessions, todayKey, yesterdayKey));
    }

    return list;
  }, [range, sessionsByDayKey, roles]);

  // High-level metrics for the selected window
  const summaryMetrics = useMemo(() => {
    const activeDays = dailyData.filter((d) => d.totalMinutes > 0);
    const totalMinutesWindow = dailyData.reduce((sum, d) => sum + d.totalMinutes, 0);
    const totalSessionsWindow = dailyData.reduce((sum, d) => sum + d.sessionCount, 0);

    const avgMinutesPerActiveDay =
      activeDays.length > 0 ? Math.round(totalMinutesWindow / activeDays.length) : 0;
    const avgMinutesPerDay =
      dailyData.length > 0 ? Math.round(totalMinutesWindow / dailyData.length) : 0;

    // Best day
    let bestDay: DaySummary | null = null;
    for (const d of dailyData) {
      if (!bestDay || d.totalMinutes > bestDay.totalMinutes) {
        if (d.totalMinutes > 0) {
          bestDay = d;
        }
      }
    }

    // Today vs Yesterday
    const todaySummary = dailyData.find((d) => d.isToday);
    const yesterdaySummary = dailyData.find((d) => d.isYesterday);

    const todayMinutes = todaySummary ? todaySummary.totalMinutes : 0;
    const yesterdayMinutes = yesterdaySummary ? yesterdaySummary.totalMinutes : 0;
    const diffWithYesterday = todayMinutes - yesterdayMinutes;

    // Current Streak (consecutive days with > 0 minutes ending today or yesterday)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const key = getLocalDateKey(checkDate);
      const daySessions = sessionsByDayKey.get(key) || [];
      const mins = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      if (mins > 0) {
        streak++;
      } else {
        // If today is 0 mins so far, check if streak from yesterday holds
        if (i === 0) continue;
        break;
      }
    }

    return {
      activeDaysCount: activeDays.length,
      totalDaysCount: dailyData.length,
      totalMinutesWindow,
      totalSessionsWindow,
      avgMinutesPerActiveDay,
      avgMinutesPerDay,
      bestDay,
      todayMinutes,
      yesterdayMinutes,
      diffWithYesterday,
      streak,
    };
  }, [dailyData, sessionsByDayKey]);

  // Overall role breakdown for the selected window
  const windowRolesBreakdown = useMemo(() => {
    const map = new Map<string, { roleName: string; roleColor: string; minutes: number }>();
    let totalMins = 0;

    for (const d of dailyData) {
      for (const r of d.roles) {
        totalMins += r.minutes;
        const existing = map.get(r.roleId);
        if (existing) {
          existing.minutes += r.minutes;
        } else {
          map.set(r.roleId, {
            roleName: r.roleName,
            roleColor: r.roleColor,
            minutes: r.minutes,
          });
        }
      }
    }

    return Array.from(map.entries())
      .map(([roleId, data]) => ({
        roleId,
        roleName: data.roleName,
        roleColor: data.roleColor,
        minutes: data.minutes,
        percent: totalMins > 0 ? Math.round((data.minutes / totalMins) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [dailyData]);

  // Max daily minutes for bar chart scale (at least 60 to have a sensible scale)
  const maxDailyMinutes = Math.max(60, ...dailyData.map((d) => d.totalMinutes));

  const toggleDayExpansion = (dateKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Panoramica Giornaliera
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analisi giorno per giorno del tempo dedicato al focus e ai ruoli.
            </p>
          </div>
        </div>

        {/* Time Window Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setRange('7')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              range === '7'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            7 Giorni
          </button>
          <button
            onClick={() => setRange('14')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              range === '14'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            14 Giorni
          </button>
          <button
            onClick={() => setRange('30')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              range === '30'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            30 Giorni
          </button>
          <button
            onClick={() => setRange('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              range === 'all'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tutto
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Oggi vs Ieri */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Focus di Oggi</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {formatMinutesToHoursMinutes(summaryMetrics.todayMinutes)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            {summaryMetrics.diffWithYesterday > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                +{formatMinutesToHoursMinutes(summaryMetrics.diffWithYesterday)} vs ieri
              </span>
            ) : summaryMetrics.diffWithYesterday < 0 ? (
              <span className="text-slate-500 dark:text-slate-400">
                -{formatMinutesToHoursMinutes(Math.abs(summaryMetrics.diffWithYesterday))} vs ieri
              </span>
            ) : (
              <span>Come ieri</span>
            )}
          </div>
        </div>

        {/* KPI 2: Media Giornaliera */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Media Giornaliera</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {formatMinutesToHoursMinutes(summaryMetrics.avgMinutesPerActiveDay)}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Nei giorni attivi ({formatMinutesToHoursMinutes(summaryMetrics.avgMinutesPerDay)}/giorno)
          </div>
        </div>

        {/* KPI 3: Giorno Record */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Giorno Record</span>
            <Award className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {summaryMetrics.bestDay
              ? formatMinutesToHoursMinutes(summaryMetrics.bestDay.totalMinutes)
              : '0m'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {summaryMetrics.bestDay ? summaryMetrics.bestDay.shortDay : 'Nessun record'}
          </div>
        </div>

        {/* KPI 4: Costanza / Frequenza */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Giorni Attivi</span>
            <Flame className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {summaryMetrics.activeDaysCount} / {summaryMetrics.totalDaysCount}
          </div>
          <div className="text-[11px] text-slate-400">
            {summaryMetrics.streak > 0
              ? `Streak: ${summaryMetrics.streak} ${summaryMetrics.streak === 1 ? 'giorno consecutivo' : 'giorni consecutivi'}`
              : 'Nessun focus continuo'}
          </div>
        </div>

      </div>

      {/* Visual Daily Bar Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Grafico Focus Giornaliero ({dailyData.length} giorni)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ogni colonna mostra il tempo totale e la divisione per ruoli. Clicca su un giorno per evidenziarlo.
            </p>
          </div>

          <div className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Totale periodo: {formatMinutesToHoursMinutes(summaryMetrics.totalMinutesWindow)} ({summaryMetrics.totalSessionsWindow} sessioni)
          </div>
        </div>

        {/* Bar chart container */}
        <div className="pt-8 pb-2 overflow-x-auto">
          <div
            className="flex items-end gap-2 sm:gap-3 min-w-[340px] h-48 sm:h-56 px-2 border-b border-slate-200 dark:border-slate-700/60 pb-2"
          >
            {dailyData.map((day) => {
              const heightPercent =
                day.totalMinutes > 0
                  ? Math.max(8, Math.round((day.totalMinutes / maxDailyMinutes) * 100))
                  : 4;

              const isSelected = selectedDayKey === day.dateKey;

              return (
                <div
                  key={day.dateKey}
                  onClick={() => setSelectedDayKey(isSelected ? null : day.dateKey)}
                  className={`flex-1 flex flex-col items-center justify-end h-full cursor-pointer group transition-all relative ${
                    isSelected ? 'opacity-100' : selectedDayKey ? 'opacity-40 hover:opacity-80' : 'opacity-100'
                  }`}
                  title={`${day.label}: ${formatMinutesToHoursMinutes(day.totalMinutes)} (${day.sessionCount} sessioni)`}
                >
                  {/* Top value tooltip / badge */}
                  <div
                    className={`text-[10px] font-mono font-bold whitespace-nowrap mb-1 transition-transform ${
                      day.totalMinutes > 0
                        ? day.isToday
                          ? 'text-blue-600 dark:text-blue-400 scale-105'
                          : 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {day.totalMinutes > 0 ? formatMinutesToHoursMinutes(day.totalMinutes) : '0m'}
                  </div>

                  {/* The bar element */}
                  <div
                    className={`w-full max-w-[42px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 ${
                      day.totalMinutes === 0
                        ? 'bg-slate-100 dark:bg-slate-800/60 border-t border-dashed border-slate-300 dark:border-slate-700'
                        : isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md'
                        : 'hover:brightness-110 shadow-xs'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {/* Role color segments inside the bar */}
                    {day.roles.map((r) => (
                      <div
                        key={r.roleId}
                        style={{
                          height: `${r.percent}%`,
                          backgroundColor: r.roleColor,
                        }}
                        className="w-full transition-all"
                        title={`${r.roleName}: ${formatMinutesToHoursMinutes(r.minutes)}`}
                      />
                    ))}
                  </div>

                  {/* Day label below line */}
                  <div className="mt-2 text-center">
                    <span
                      className={`text-[11px] block font-medium leading-none ${
                        day.isToday
                          ? 'text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {day.weekdayShort}
                    </span>
                    <span
                      className={`text-[10px] font-mono block mt-0.5 leading-none ${
                        day.isToday
                          ? 'text-blue-700 dark:text-blue-300 font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {day.isToday && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Window Role Legend */}
        {windowRolesBreakdown.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Ripartizione Ruoli nel Periodo</span>
              </span>
              <span className="text-[11px] font-mono">
                {windowRolesBreakdown.length} {windowRolesBreakdown.length === 1 ? 'ruolo attivo' : 'ruoli attivi'}
              </span>
            </div>

            {/* Continuous horizontal stacked distribution bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              {windowRolesBreakdown.map((r) => (
                <div
                  key={r.roleId}
                  style={{
                    width: `${r.percent}%`,
                    backgroundColor: r.roleColor,
                  }}
                  className="h-full transition-all"
                  title={`${r.roleName}: ${formatMinutesToHoursMinutes(r.minutes)} (${r.percent}%)`}
                />
              ))}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {windowRolesBreakdown.map((r) => (
                <div
                  key={r.roleId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: r.roleColor }}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {r.roleName}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    {formatMinutesToHoursMinutes(r.minutes)} ({r.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Day by Day Detailed Accordion / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Dettaglio Giorno per Giorno</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Ordinato dal più recente
          </span>
        </div>

        <div className="space-y-2.5">
          {dailyData
            .slice()
            .reverse()
            .map((day) => {
              const isSelected = selectedDayKey === day.dateKey;
              const isExpanded = expandedDays[day.dateKey] || isSelected;

              return (
                <div
                  key={day.dateKey}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-xs overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
                      : day.isToday
                      ? 'border-blue-300 dark:border-blue-900/60'
                      : 'border-slate-200/90 dark:border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleDayExpansion(day.dateKey)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          day.isToday
                            ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                            : day.totalMinutes > 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                        }`}
                      >
                        {day.dayNumber}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {day.label}
                          </h4>
                          {day.isToday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono">
                              Oggi
                            </span>
                          )}
                          {day.isYesterday && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              Ieri
                            </span>
                          )}
                        </div>

                        {/* Mini role pills */}
                        {day.roles.length > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1 overflow-x-auto pb-0.5">
                            {day.roles.map((r) => (
                              <span
                                key={r.roleId}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: r.roleColor }}
                                />
                                <span className="font-medium">{r.roleName}:</span>
                                <span className="font-mono text-slate-400">
                                  {formatMinutesToHoursMinutes(r.minutes)}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Nessun focus registrato</p>
                        )}
                      </div>
                    </div>

                    {/* Right side summary & toggle */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-mono text-sm font-bold ${
                            day.totalMinutes > 0
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          {formatMinutesToHoursMinutes(day.totalMinutes)}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {day.sessionCount} {day.sessionCount === 1 ? 'sessione' : 'sessioni'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={isExpanded ? 'Comprimi' : 'Espandi'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Task List for this Day */}
                  {isExpanded && day.tasks.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 p-4 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                        Attività svolte in questa giornata ({day.tasks.length})
                      </div>

                      <div className="space-y-1.5">
                        {day.tasks.map((task) => (
                          <div
                            key={task.key}
                            className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: task.roleColor }}
                              />
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 dark:text-white truncate block">
                                  {task.taskText}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {task.roleName}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0 font-mono">
                              <span className="font-bold text-blue-600 dark:text-blue-400 block">
                                {formatMinutesToHoursMinutes(task.minutes)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {task.sessionsCount} {task.sessionsCount === 1 ? 'sessione' : 'sessioni'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && day.tasks.length === 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 p-4 text-center text-xs text-slate-400">
                      Nessuna attività registrata per questo giorno.
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../db/db';
import { RoleIcon } from '../utils/icons';
import {
  History,
  CheckCircle2,
  Trash2,
  Clock,
  Filter,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { timerSessions, roles } = useApp();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const filteredSessions = timerSessions.filter((s) => {
    if (selectedRoleFilter === 'all') return true;
    return s.roleId === selectedRoleFilter;
  });

  const totalMinutesAllTime = filteredSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalHours = (totalMinutesAllTime / 60).toFixed(1);

  // Today's focus sessions
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaySessions = filteredSessions.filter((s) => s.startedAt >= startOfToday.getTime());
  const todayMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const handleDeleteSession = async (sessionId: string) => {
    await db.timerSessions.delete(sessionId);
  };

  const handleClearAllHistory = async () => {
    if (confirm('Vuoi davvero cancellare tutto lo storico delle sessioni di focus?')) {
      await db.timerSessions.clear();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>Registro Sessioni</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 font-['Syne',sans-serif]">
            Storico Focus & Pomodoro
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tutte le sessioni di concentrazione completate, salvate in locale sul tuo browser.
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Focus di Oggi</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {todayMinutes} <span className="text-xs font-normal text-slate-500">minuti</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {todaySessions.length} sessioni completate oggi
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Totale Ore Registrate</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {totalHours} <span className="text-xs font-normal text-slate-500">ore</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredSessions.length} sessioni complessive
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Ruolo Più Attivo</span>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
            {roles[0]?.name || 'Nessun ruolo'}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Focalizzazione continua
          </span>
        </div>

      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setSelectedRoleFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            selectedRoleFilter === 'all'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Tutti i Ruoli ({timerSessions.length})
        </button>

        {roles.map((r) => {
          const count = timerSessions.filter((s) => s.roleId === r.id).length;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRoleFilter(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedRoleFilter === r.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              <span>{r.name}</span>
              <span className="text-[10px] text-slate-400">({count})</span>
            </button>
          );
        })}
      </div>

      {/* SESSIONS LIST */}
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

    </div>
  );
};

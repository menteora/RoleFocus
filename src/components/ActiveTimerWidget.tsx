import React from 'react';
import { useApp } from '../context/AppContext';
import { formatSecondsToTimer } from '../utils/timeUtils';
import { RoleIcon } from '../utils/icons';
import {
  Play,
  Pause,
  Square,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const ActiveTimerWidget: React.FC = () => {
  const {
    activeTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    extendTimerMinutes,
    settings,
    updateSettings,
  } = useApp();

  if (!activeTimer || activeTimer.status === 'idle') {
    return null;
  }

  const isRunning = activeTimer.status === 'running';
  const isPaused = activeTimer.status === 'paused';
  const isCompleted = activeTimer.status === 'completed';

  const progressPercent = activeTimer.totalDurationSeconds > 0
    ? Math.max(0, Math.min(100, (1 - activeTimer.remainingSeconds / activeTimer.totalDurationSeconds) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-900/5 dark:shadow-none transition-all">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left info: Role & Task */}
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: activeTimer.roleColor || '#3b82f6' }}
          >
            <RoleIcon name="Target" className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {activeTimer.roleName || 'Focus'}
              </span>
              {activeTimer.category && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {activeTimer.category === 'important' && '⚡ Più importante'}
                    {activeTimer.category === 'quick' && '🔋 Più veloce'}
                    {activeTimer.category === 'unblocker' && '🔓 Sblocca le altre'}
                  </span>
                </>
              )}
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isRunning
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    : isPaused
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                }`}
              >
                {isRunning ? 'In esecuzione' : isPaused ? 'In pausa' : 'Completato!'}
              </span>
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
              {activeTimer.taskText || 'Obiettivo prioritario in corso'}
            </h3>
          </div>
        </div>

        {/* Center/Right: Timer display and controls */}
        <div className="flex items-center flex-wrap md:flex-nowrap gap-3.5 w-full md:w-auto justify-between md:justify-end">
          
          {/* Time digits */}
          <div className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatSecondsToTimer(activeTimer.remainingSeconds)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Quick adjust */}
            <button
              onClick={() => extendTimerMinutes(-5)}
              disabled={activeTimer.remainingSeconds <= 300}
              title="Sottrai 5 minuti"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => extendTimerMinutes(5)}
              title="Aggiungi 5 minuti"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Play/Pause */}
            {isRunning && (
              <button
                onClick={pauseTimer}
                title="Metti in pausa"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pausa</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={resumeTimer}
                title="Riprendi timer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Riprendi</span>
              </button>
            )}

            {isCompleted && (
              <button
                onClick={() => stopTimer(false)}
                title="Chiudi timer"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fine Sessione</span>
              </button>
            )}

            {/* Stop / Reset button */}
            {!isCompleted && (
              <button
                onClick={() => stopTimer(true)}
                title="Termina e salva nello storico"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            {/* Sound toggle */}
            <button
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              title={settings.soundEnabled ? 'Suono attivo (chime a fine timer)' : 'Suono disattivato'}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-blue-500" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: activeTimer.roleColor || '#3b82f6',
          }}
        />
      </div>
    </div>
  );
};

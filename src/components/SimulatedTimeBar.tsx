import React from 'react';
import { useApp } from '../context/AppContext';
import { minutesToTimeString } from '../utils/timeUtils';
import { RotateCcw, Clock, AlertCircle } from 'lucide-react';

export const SimulatedTimeBar: React.FC = () => {
  const {
    currentTime,
    isSimulatingTime,
    effectiveMinutes,
    setSimulatedTime,
    resetToRealTime,
  } = useApp();

  const presets = [
    { label: '08:45', mins: 8 * 60 + 45 },
    { label: '12:00', mins: 12 * 60 },
    { label: '15:30', mins: 15 * 60 + 30 },
    { label: '18:15', mins: 18 * 60 + 15 },
    { label: '20:30', mins: 20 * 60 + 30 },
    { label: '22:00', mins: 22 * 60 },
  ];

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-slate-800 dark:text-slate-200 px-4 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        
        <div className="flex items-center gap-2 font-medium">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            {isSimulatingTime ? (
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                Simulazione attiva: <span className="font-mono tabular-nums text-sm bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">{minutesToTimeString(effectiveMinutes)}</span>
              </span>
            ) : (
              <span>
                Ora reale: <span className="font-mono tabular-nums text-sm font-semibold">{minutesToTimeString(currentTime.getHours() * 60 + currentTime.getMinutes())}</span>
              </span>
            )}
          </span>
          <span className="text-slate-400 dark:text-slate-500 hidden lg:inline">
            (Trascina lo slider per verificare quali ruoli si attivano nei vari orari)
          </span>
        </div>

        <div className="w-full md:w-auto flex flex-1 max-w-xl items-center gap-3">
          <span className="font-mono text-[11px] text-slate-500 shrink-0">00:00</span>
          <input
            type="range"
            min={0}
            max={1439}
            step={5}
            value={effectiveMinutes}
            onChange={(e) => setSimulatedTime(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="font-mono text-[11px] text-slate-500 shrink-0">23:59</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Preset:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setSimulatedTime(p.mins)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                effectiveMinutes === p.mins
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}

          {isSimulatingTime && (
            <button
              onClick={resetToRealTime}
              className="ml-2 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ora Reale</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

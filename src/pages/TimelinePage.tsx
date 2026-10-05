import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  DAYS_OF_WEEK_NAMES,
  DAYS_OF_WEEK_SHORT,
  minutesToTimeString,
  timeStringToMinutes,
  getSlotDurationMinutes,
} from '../utils/timeUtils';
import { RoleIcon } from '../utils/icons';
import { Calendar, Clock, Sparkles } from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const {
    roles,
    timeSlots,
    effectiveMinutes,
    effectiveDayOfWeek,
    setSimulatedTime,
  } = useApp();

  const [selectedDay, setSelectedDay] = useState<number>(effectiveDayOfWeek);

  // 24-hour hour marks [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
  const hourMarkers = Array.from({ length: 25 }, (_, i) => i);

  // Calculate current indicator position (0% - 100%)
  const currentIndicatorPercent = (effectiveMinutes / 1440) * 100;

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Mappa delle Sovrapposizioni</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 font-['Syne',sans-serif]">
            Panoramica Oraria 24h
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visualizza come si articolano e si sovrappongono i tuoi molteplici ruoli nel corso della giornata.
          </p>
        </div>

        {/* Day Selector Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto self-start sm:self-auto max-w-full">
          {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
            const isToday = dayNum === effectiveDayOfWeek;
            const isSelected = selectedDay === dayNum;
            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{DAYS_OF_WEEK_SHORT[dayNum]}</span>
                {isToday && <span className="ml-1 text-[10px] text-blue-500">●</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 24-HOUR INTERACTIVE VISUAL TIMELINE CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs overflow-hidden">
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Programma di {DAYS_OF_WEEK_NAMES[selectedDay]}</span>
            {selectedDay === effectiveDayOfWeek && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                Oggi (Ora attuale: {minutesToTimeString(effectiveMinutes)})
              </span>
            )}
          </h2>
          <span className="text-xs text-slate-400">
            Trascina o clicca sulla barra oraria per testare la fascia
          </span>
        </div>

        {/* Timeline Container (horizontal scrollable on mobile if needed) */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[700px] relative select-none">
            
            {/* Top Hour Numbers Header */}
            <div
              className="relative h-7 border-b border-slate-200 dark:border-slate-800 mb-3 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, clickX / rect.width));
                const targetMins = Math.round((percent * 1440) / 5) * 5;
                setSimulatedTime(targetMins);
              }}
            >
              {hourMarkers.map((hour) => {
                if (hour % 2 !== 0 && hour !== 24) return null; // Show every 2 hours to prevent crowding
                const leftPercent = (hour / 24) * 100;
                return (
                  <div
                    key={hour}
                    className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <span className="text-[10px] font-mono text-slate-400 font-medium">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="h-1.5 w-px bg-slate-200 dark:bg-slate-700 mt-1" />
                  </div>
                );
              })}
            </div>

            {/* Vertical grid lines for the background */}
            <div className="absolute top-7 bottom-0 left-0 right-0 pointer-events-none flex">
              {Array.from({ length: 25 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-dashed border-slate-100 dark:border-slate-800/60 last:border-none"
                />
              ))}
            </div>

            {/* Roles Rows */}
            <div className="space-y-3 relative z-10 py-2">
              {roles.map((role) => {
                const isRoleActiveOnDay = !role.daysOfWeek || role.daysOfWeek.length === 0 || role.daysOfWeek.includes(selectedDay);
                // Find slots for this role matching selectedDay
                const roleSlots = isRoleActiveOnDay
                  ? timeSlots.filter((slot) => {
                      if (slot.roleId !== role.id) return false;
                      if (!slot.daysOfWeek || slot.daysOfWeek.length === 0) return true;
                      return slot.daysOfWeek.includes(selectedDay);
                    })
                  : [];

                return (
                  <div key={role.id} className="flex items-center gap-3">
                    {/* Role Label */}
                    <div className="w-36 shrink-0 flex items-center gap-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {role.name}
                      </span>
                    </div>

                    {/* Role Track (24h width) */}
                    <div className="flex-1 h-9 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl relative border border-slate-100 dark:border-slate-800/70 overflow-hidden">
                      {roleSlots.map((slot) => {
                        const startMin = timeStringToMinutes(slot.startTime);
                        const endMin = timeStringToMinutes(slot.endTime);
                        
                        let leftPct = (startMin / 1440) * 100;
                        let widthPct = 0;

                        if (endMin >= startMin) {
                          widthPct = ((endMin - startMin) / 1440) * 100;
                        } else {
                          // Spans overnight
                          widthPct = ((1440 - startMin + endMin) / 1440) * 100;
                        }

                        return (
                          <div
                            key={slot.id}
                            className="absolute top-1 bottom-1 rounded-lg px-2 flex items-center text-white text-[11px] font-medium shadow-xs truncate cursor-pointer hover:brightness-110 transition-all"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              backgroundColor: role.color,
                            }}
                            title={`${role.name}: ${slot.startTime} - ${slot.endTime} ${slot.label ? `(${slot.label})` : ''}`}
                            onClick={() => setSimulatedTime(startMin + 5)}
                          >
                            <span className="font-mono text-[10px] font-bold drop-shadow-xs truncate">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                        );
                      })}

                      {roleSlots.length === 0 && (
                        <div className="h-full flex items-center px-3 text-[10px] text-slate-400 italic">
                          {!isRoleActiveOnDay ? 'Ruolo non attivo in questo giorno' : 'Nessuna fascia oraria programmata'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Time Red/Blue Indicator Vertical Line */}
            {selectedDay === effectiveDayOfWeek && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-20 transition-all duration-300"
                style={{ left: `calc(9rem + (100% - 9rem) * ${effectiveMinutes / 1440})` }}
              >
                <div className="h-full w-0.5 bg-blue-500 dark:bg-blue-400 shadow-md relative">
                  <div className="absolute -top-1 -translate-x-1/2 bg-blue-600 text-white font-mono text-[9px] font-bold px-1 rounded-full whitespace-nowrap">
                    ORA {minutesToTimeString(effectiveMinutes)}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* DAILY TIME ALLOCATION STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => {
          const isRoleActiveOnDay = !role.daysOfWeek || role.daysOfWeek.length === 0 || role.daysOfWeek.includes(selectedDay);
          const roleSlots = isRoleActiveOnDay
            ? timeSlots.filter((slot) => {
                if (slot.roleId !== role.id) return false;
                if (!slot.daysOfWeek || slot.daysOfWeek.length === 0) return true;
                return slot.daysOfWeek.includes(selectedDay);
              })
            : [];

          const totalMins = roleSlots.reduce((sum, s) => sum + getSlotDurationMinutes(s), 0);
          const hours = (totalMins / 60).toFixed(1);
          const percentOfDay = Math.round((totalMins / 1440) * 100);

          return (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {role.name}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {hours}h
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentOfDay}%`,
                    backgroundColor: role.color,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{roleSlots.length} {roleSlots.length === 1 ? 'fascia' : 'fasce'}</span>
                <span>{percentOfDay}% della giornata</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

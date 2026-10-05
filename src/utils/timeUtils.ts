import type { TimeSlot, Role } from '../types';

export const DAYS_OF_WEEK_NAMES = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
];

export const DAYS_OF_WEEK_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

/**
 * Converts "HH:mm" string to minutes from midnight (0 - 1439)
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
}

/**
 * Converts minutes from midnight to "HH:mm" format
 */
export function minutesToTimeString(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Formats seconds to MM:SS or HH:MM:SS
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats minutes into human friendly string (e.g. 25m, 1h 15m, 2h)
 */
export function formatMinutesToHoursMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  }
  if (h > 0) {
    return `${h}h`;
  }
  return `${m}m`;
}

/**
 * Checks if a time slot is active at a given time and day
 */
export function isSlotActiveAtTime(
  slot: TimeSlot,
  currentTimeMinutes: number,
  dayOfWeek: number
): boolean {
  // Check day of week filter if set
  if (slot.daysOfWeek && slot.daysOfWeek.length > 0) {
    if (!slot.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
  }

  const start = timeStringToMinutes(slot.startTime);
  const end = timeStringToMinutes(slot.endTime);

  if (start <= end) {
    // Normal same-day slot, e.g. 08:30 to 17:30
    return currentTimeMinutes >= start && currentTimeMinutes < end;
  } else {
    // Overnight slot, e.g. 22:00 to 06:00
    return currentTimeMinutes >= start || currentTimeMinutes < end;
  }
}

/**
 * Calculates duration in minutes of a time slot
 */
export function getSlotDurationMinutes(slot: TimeSlot): number {
  const start = timeStringToMinutes(slot.startTime);
  const end = timeStringToMinutes(slot.endTime);
  if (end >= start) {
    return end - start;
  }
  return 1440 - start + end;
}

/**
 * Returns formatted string representing days of the week for a slot
 */
export function formatSlotDays(daysOfWeek?: number[]): string {
  if (!daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.length === 7) {
    return 'Tutti i giorni';
  }
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  // Check weekdays (Lun-Ven: 1,2,3,4,5)
  if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) {
    return 'Lun - Ven';
  }
  // Check weekend (Sab-Dom: 0,6)
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) {
    return 'Sab - Dom';
  }
  return sorted.map((d) => DAYS_OF_WEEK_SHORT[d]).join(', ');
}

/**
 * Finds next upcoming slot for a role after currentTimeMinutes today
 */
export function getNextUpcomingSlot(
  slots: TimeSlot[],
  currentTimeMinutes: number,
  dayOfWeek: number
): { slot: TimeSlot; startMinutes: number } | null {
  const matchingSlots = slots.filter((slot) => {
    if (slot.daysOfWeek && slot.daysOfWeek.length > 0) {
      return slot.daysOfWeek.includes(dayOfWeek);
    }
    return true;
  });

  const upcoming = matchingSlots
    .map((slot) => ({
      slot,
      startMinutes: timeStringToMinutes(slot.startTime),
    }))
    .filter((item) => item.startMinutes > currentTimeMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  return upcoming[0] || null;
}

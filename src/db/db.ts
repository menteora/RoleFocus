import Dexie, { type Table } from 'dexie';
import type { Role, TimeSlot, RoleTask, TimerSession, ActiveTimerData, AppSettings, ExportDataPayload, DecisionMode } from '../types';

export class RoleFocusDatabase extends Dexie {
  roles!: Table<Role, string>;
  timeSlots!: Table<TimeSlot, string>;
  tasks!: Table<RoleTask, string>;
  timerSessions!: Table<TimerSession, string>;
  activeTimer!: Table<ActiveTimerData, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('RoleFocusDB');

    this.version(1).stores({
      roles: 'id, name, priority, isArchived, createdAt',
      timeSlots: 'id, roleId, startTime, endTime, createdAt',
      tasks: 'id, roleId, category, completed, isCurrentPriority, createdAt',
      timerSessions: 'id, roleId, category, startedAt, endedAt, completed',
      activeTimer: 'id',
      settings: 'id'
    });
  }
}

export const db = new RoleFocusDatabase();

// Initialize basic settings and active timer structures without injecting hardcoded roles
export async function seedInitialDataIfNeeded(): Promise<void> {
  const existingSettings = await db.settings.get('current_settings');
  const existingTimer = await db.activeTimer.get('current_timer');

  const defaultSettings: AppSettings = {
    id: 'current_settings',
    theme: 'system',
    soundEnabled: true,
    notificationEnabled: true,
    defaultTimerMinutes: 25,
    timeSimulationEnabled: false,
    simulatedTimeMinutes: null,
  };

  const initialActiveTimer: ActiveTimerData = {
    id: 'current_timer',
    roleId: null,
    roleName: '',
    roleColor: '#2563eb',
    taskText: '',
    category: 'important',
    totalDurationSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    status: 'idle',
    startedAt: null,
    targetEndTimestamp: null,
    pausedAtTimestamp: null,
  };

  await db.transaction('rw', [db.settings, db.activeTimer], async () => {
    if (!existingSettings) {
      await db.settings.put(defaultSettings);
    }
    if (!existingTimer) {
      await db.activeTimer.put(initialActiveTimer);
    }
  });
}

// Full Export function
export async function exportAllData(): Promise<ExportDataPayload> {
  const roles = await db.roles.toArray();
  const timeSlots = await db.timeSlots.toArray();
  const tasks = await db.tasks.toArray();
  const timerSessions = await db.timerSessions.toArray();
  const settings = (await db.settings.get('current_settings')) || {
    id: 'current_settings',
    theme: 'system',
    soundEnabled: true,
    notificationEnabled: true,
    defaultTimerMinutes: 25,
    timeSimulationEnabled: false,
    simulatedTimeMinutes: null,
  };

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    roles,
    timeSlots,
    tasks,
    timerSessions,
    settings,
  };
}

// Full Import function
export async function importAllData(payload: ExportDataPayload, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
  if (!payload || !Array.isArray(payload.roles)) {
    throw new Error('Formato file JSON non valido.');
  }

  await db.transaction('rw', [db.roles, db.timeSlots, db.tasks, db.timerSessions, db.settings], async () => {
    if (mode === 'replace') {
      await db.roles.clear();
      await db.timeSlots.clear();
      await db.tasks.clear();
      await db.timerSessions.clear();
    }

    if (payload.roles?.length) {
      await db.roles.bulkPut(payload.roles);
    }
    if (payload.timeSlots?.length) {
      await db.timeSlots.bulkPut(payload.timeSlots);
    }
    if (payload.tasks?.length) {
      // Ensure backwards compatibility with category
      const sanitizedTasks = payload.tasks.map((t) => ({
        ...t,
        category: t.category || ('important' as DecisionMode),
      }));
      await db.tasks.bulkPut(sanitizedTasks);
    }
    if (payload.timerSessions?.length) {
      await db.timerSessions.bulkPut(payload.timerSessions);
    }
    if (payload.settings) {
      await db.settings.put({ ...payload.settings, id: 'current_settings' });
    }
  });
}

// Reset database to clean state
export async function resetDatabaseToDefault(): Promise<void> {
  await db.transaction('rw', [db.roles, db.timeSlots, db.tasks, db.timerSessions, db.activeTimer, db.settings], async () => {
    await db.roles.clear();
    await db.timeSlots.clear();
    await db.tasks.clear();
    await db.timerSessions.clear();
    await db.activeTimer.clear();
    await db.settings.clear();
  });
  await seedInitialDataIfNeeded();
}

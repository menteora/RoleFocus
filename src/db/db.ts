import PouchDBBrowser from 'pouchdb-browser';
import type {
  Role,
  TimeSlot,
  RoleTask,
  TimerSession,
  ActiveTimerData,
  AppSettings,
  ExportDataPayload,
  DecisionMode,
} from '../types';

// Safely resolve PouchDB constructor for browser environments
const PouchDB: typeof PouchDBBrowser =
  (PouchDBBrowser as unknown as { default?: typeof PouchDBBrowser }).default || PouchDBBrowser;

type Listener = () => void;

interface PouchDoc<T> {
  _id: string;
  _rev?: string;
  data: T;
}

class PouchCollection<T extends { id: string }> {
  private pdb: PouchDB.Database<PouchDoc<T>>;
  private listeners: Set<Listener> = new Set();

  constructor(name: string) {
    this.pdb = new PouchDB<PouchDoc<T>>(name);
    this.pdb
      .changes({ since: 'now', live: true, include_docs: false })
      .on('change', () => {
        this.notifyListeners();
      })
      .on('error', (err) => {
        console.error(`PouchDB error on collection ${name}:`, err);
      });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in PouchDB subscriber:', err);
      }
    }
  }

  async toArray(): Promise<T[]> {
    try {
      const res = await this.pdb.allDocs({ include_docs: true });
      return res.rows
        .filter((row) => row.doc && row.doc.data)
        .map((row) => row.doc!.data);
    } catch (err) {
      console.error('PouchDB toArray error:', err);
      return [];
    }
  }

  async get(id: string): Promise<T | null> {
    try {
      const doc = await this.pdb.get(id);
      return doc.data || null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) {
        return null;
      }
      console.error(`PouchDB get(${id}) error:`, err);
      return null;
    }
  }

  async put(item: T): Promise<void> {
    try {
      let existingRev: string | undefined;
      try {
        const existing = await this.pdb.get(item.id);
        existingRev = existing._rev;
      } catch {
        // Not found, new doc
      }

      await this.pdb.put({
        _id: item.id,
        _rev: existingRev,
        data: item,
      });
      this.notifyListeners();
    } catch (err) {
      console.error(`PouchDB put error for id ${item.id}:`, err);
      throw err;
    }
  }

  async add(item: T): Promise<void> {
    await this.put(item);
  }

  async bulkPut(items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    try {
      const existingAll = await this.pdb.allDocs({ keys: items.map((i) => i.id) });
      const revMap = new Map<string, string>();
      for (const row of existingAll.rows) {
        if ('value' in row && row.value && row.value.rev) {
          revMap.set(row.key, row.value.rev);
        }
      }

      const docs: PouchDoc<T>[] = items.map((item) => ({
        _id: item.id,
        _rev: revMap.get(item.id),
        data: item,
      }));

      await this.pdb.bulkDocs(docs);
      this.notifyListeners();
    } catch (err) {
      console.error('PouchDB bulkPut error:', err);
      throw err;
    }
  }

  async update(id: string, partial: Partial<T>): Promise<void> {
    try {
      const existing = await this.pdb.get(id);
      const updatedData: T = {
        ...existing.data,
        ...partial,
        id,
      };

      await this.pdb.put({
        _id: id,
        _rev: existing._rev,
        data: updatedData,
      });
      this.notifyListeners();
    } catch (err) {
      console.error(`PouchDB update error for id ${id}:`, err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.pdb.get(id);
      await this.pdb.remove(existing);
      this.notifyListeners();
    } catch (err: unknown) {
      if ((err as { status?: number }).status !== 404) {
        console.error(`PouchDB delete error for id ${id}:`, err);
      }
    }
  }

  async clear(): Promise<void> {
    try {
      const all = await this.pdb.allDocs({ include_docs: false });
      if (all.rows.length === 0) return;

      const deleteDocs: any[] = all.rows
        .filter((row) => 'value' in row && row.value?.rev)
        .map((row) => ({
          _id: row.id,
          _rev: ('value' in row ? row.value.rev : undefined),
          _deleted: true,
        }));

      await this.pdb.bulkDocs(deleteDocs);
      this.notifyListeners();
    } catch (err) {
      console.error('PouchDB clear error:', err);
    }
  }

  async count(): Promise<number> {
    try {
      const res = await this.pdb.allDocs({ limit: 0 });
      return res.total_rows;
    } catch {
      return 0;
    }
  }
}

export class RoleFocusPouchDB {
  roles = new PouchCollection<Role>('rolefocus_pouch_roles');
  timeSlots = new PouchCollection<TimeSlot>('rolefocus_pouch_slots');
  tasks = new PouchCollection<RoleTask>('rolefocus_pouch_tasks');
  timerSessions = new PouchCollection<TimerSession>('rolefocus_pouch_sessions');
  activeTimer = new PouchCollection<ActiveTimerData>('rolefocus_pouch_active_timer');
  settings = new PouchCollection<AppSettings>('rolefocus_pouch_settings');
}

export const db = new RoleFocusPouchDB();

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
    taskId: null,
    taskText: '',
    category: 'important',
    totalDurationSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    status: 'idle',
    startedAt: null,
    targetEndTimestamp: null,
    pausedAtTimestamp: null,
  };

  if (!existingSettings) {
    await db.settings.put(defaultSettings);
  }
  if (!existingTimer) {
    await db.activeTimer.put(initialActiveTimer);
  }
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
}

// Reset database to clean state
export async function resetDatabaseToDefault(): Promise<void> {
  await db.roles.clear();
  await db.timeSlots.clear();
  await db.tasks.clear();
  await db.timerSessions.clear();
  await db.activeTimer.clear();
  await db.settings.clear();
  await seedInitialDataIfNeeded();
}

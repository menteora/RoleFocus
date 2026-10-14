import PouchDBBrowser from 'pouchdb-browser';
import type {
  Role,
  TimeSlot,
  RoleTask,
  TimerSession,
  ActiveTimerData,
  BrainDumpItem,
  AppSettings,
  CouchDBSettings,
  CouchDBSyncState,
  ExportDataPayload,
  DecisionMode,
  SyncProgressInfo,
  SyncCollectionStatus,
  SyncLogEntry,
} from '../types';

// Safely resolve PouchDB constructor for browser environments
const PouchDB: typeof PouchDBBrowser =
  (PouchDBBrowser as unknown as { default?: typeof PouchDBBrowser }).default || PouchDBBrowser;

type Listener = () => void;
let globalMutationNotifier: (() => void) | null = null;

export function registerGlobalMutationNotifier(fn: () => void) {
  globalMutationNotifier = fn;
}

interface PouchDoc<T> {
  _id: string;
  _rev?: string;
  data: T;
}

export class PouchCollection<T extends { id: string }> {
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

  public getRawDB(): PouchDB.Database<PouchDoc<T>> {
    return this.pdb;
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
    if (globalMutationNotifier) {
      try {
        globalMutationNotifier();
      } catch {
        // ignore
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
  brainDump = new PouchCollection<BrainDumpItem>('rolefocus_pouch_braindump');
  settings = new PouchCollection<AppSettings>('rolefocus_pouch_settings');
}

export const db = new RoleFocusPouchDB();

// -------------------------------------------------------------
// CouchDB Helpers & Live Replication Manager
// -------------------------------------------------------------

function buildRemoteUrl(endpoint: string, dbName: string): string {
  const cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
  return `${cleanEndpoint}/${dbName}`;
}

const verifiedRemoteDatabases = new Set<string>();

export interface RemoteDatabaseInfo {
  key: string;
  name: string;
  label: string;
  exists: boolean;
  statusText: string;
}

async function ensureRemoteDatabaseExists(
  endpoint: string,
  dbName: string,
  auth?: { username?: string; password?: string }
): Promise<boolean> {
  const cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
  const url = `${cleanEndpoint}/${dbName}`;

  if (verifiedRemoteDatabases.has(url)) {
    return true;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (auth && auth.username) {
    headers['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password || ''}`)}`;
  }

  try {
    const headRes = await fetch(url, { method: 'HEAD', headers });
    if (headRes.ok) {
      verifiedRemoteDatabases.add(url);
      return true;
    }
    if (headRes.status === 404) {
      // Database does not exist yet on server; attempt creation with credentials
      const putRes = await fetch(url, { method: 'PUT', headers });
      if (putRes.ok || putRes.status === 201 || putRes.status === 412) {
        verifiedRemoteDatabases.add(url);
        return true;
      }
      return false;
    }
    return false;
  } catch {
    // Network or CORS errors
    return false;
  }
}

export async function checkRemoteDatabases(
  config: CouchDBSettings
): Promise<RemoteDatabaseInfo[]> {
  if (!config.endpoint || !config.endpoint.trim()) return [];

  const cleanEndpoint = config.endpoint.trim().replace(/\/+$/, '');
  const prefix = config.databasePrefix?.trim() || 'rolefocus_';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (config.username) {
    headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password || ''}`)}`;
  }

  return await Promise.all(
    SYNC_COLLECTIONS_DEF.map(async (def) => {
      const dbName = `${prefix}${def.suffix}`;
      const url = `${cleanEndpoint}/${dbName}`;
      try {
        const headRes = await fetch(url, { method: 'HEAD', headers });
        if (headRes.ok) {
          verifiedRemoteDatabases.add(url);
          return {
            key: def.key,
            name: dbName,
            label: def.label,
            exists: true,
            statusText: 'Presente su CouchDB ✓',
          };
        } else if (headRes.status === 404) {
          return {
            key: def.key,
            name: dbName,
            label: def.label,
            exists: false,
            statusText: 'Non esiste sul server (da creare)',
          };
        } else {
          return {
            key: def.key,
            name: dbName,
            label: def.label,
            exists: false,
            statusText: `Stato HTTP ${headRes.status}`,
          };
        }
      } catch {
        return {
          key: def.key,
          name: dbName,
          label: def.label,
          exists: false,
          statusText: 'Non raggiungibile (CORS o rete)',
        };
      }
    })
  );
}

export async function initializeRemoteDatabases(
  config: CouchDBSettings
): Promise<{
  success: boolean;
  message: string;
  databases: RemoteDatabaseInfo[];
  createdCount: number;
  existingCount: number;
  failedCount: number;
}> {
  if (!config.endpoint || !config.endpoint.trim()) {
    return {
      success: false,
      message: 'Endpoint CouchDB mancante',
      databases: [],
      createdCount: 0,
      existingCount: 0,
      failedCount: 0,
    };
  }

  const cleanEndpoint = config.endpoint.trim().replace(/\/+$/, '');
  const prefix = config.databasePrefix?.trim() || 'rolefocus_';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (config.username) {
    headers['Authorization'] = `Basic ${btoa(`${config.username}:${config.password || ''}`)}`;
  }

  let createdCount = 0;
  let existingCount = 0;
  let failedCount = 0;
  const results: RemoteDatabaseInfo[] = [];

  for (const def of SYNC_COLLECTIONS_DEF) {
    const dbName = `${prefix}${def.suffix}`;
    const url = `${cleanEndpoint}/${dbName}`;

    try {
      const headRes = await fetch(url, { method: 'HEAD', headers });
      if (headRes.ok) {
        existingCount++;
        verifiedRemoteDatabases.add(url);
        results.push({
          key: def.key,
          name: dbName,
          label: def.label,
          exists: true,
          statusText: 'Già presente sul server ✓',
        });
        continue;
      }

      if (headRes.status === 404) {
        const putRes = await fetch(url, { method: 'PUT', headers });
        if (putRes.ok || putRes.status === 201 || putRes.status === 412) {
          createdCount++;
          verifiedRemoteDatabases.add(url);
          results.push({
            key: def.key,
            name: dbName,
            label: def.label,
            exists: true,
            statusText: 'Creato ora con successo! ✓',
          });
        } else {
          failedCount++;
          const errJson = await putRes.json().catch(() => ({}));
          const reason =
            putRes.status === 401 || putRes.status === 403
              ? 'Permesso negato: solo un utente amministratore CouchDB (_admin) può creare database via API'
              : errJson.reason || `HTTP ${putRes.status}`;
          results.push({
            key: def.key,
            name: dbName,
            label: def.label,
            exists: false,
            statusText: `Creazione fallita (${reason})`,
          });
        }
      } else {
        failedCount++;
        results.push({
          key: def.key,
          name: dbName,
          label: def.label,
          exists: false,
          statusText: `Errore verifica: HTTP ${headRes.status}`,
        });
      }
    } catch {
      failedCount++;
      results.push({
        key: def.key,
        name: dbName,
        label: def.label,
        exists: false,
        statusText: 'Errore di rete o CORS',
      });
    }
  }

  const allReady = failedCount === 0;
  let message = '';
  if (allReady) {
    message =
      createdCount > 0
        ? `Operazione completata! Creati ${createdCount} database su CouchDB (${existingCount} già presenti). Tutti i 7 database sono pronti.`
        : `Tutti i 7 database esistono già su CouchDB e sono pronti!`;
  } else {
    message = `Creazione automatica completata parzialmente: ${createdCount} creati, ${existingCount} esistenti, ${failedCount} non creati (permesso negato su CouchDB o CORS). Vanno creati manualmente su Fauxton o via curl.`;
  }

  return {
    success: allReady,
    message,
    databases: results,
    createdCount,
    existingCount,
    failedCount,
  };
}

function createRemoteDb<T extends {} = {}>(
  endpoint: string,
  dbName: string,
  auth?: { username?: string; password?: string }
) {
  const url = buildRemoteUrl(endpoint, dbName);
  const basicAuthHeader =
    auth && auth.username
      ? `Basic ${btoa(`${auth.username}:${auth.password || ''}`)}`
      : undefined;

  const authHeaders: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (basicAuthHeader) {
    authHeaders['Authorization'] = basicAuthHeader;
  }

  const options: any = {
    skip_setup: true, // Crucial: prevents PouchDB from making unauthenticated automatic PUT requests that trigger browser login popup
    ajax: {
      headers: authHeaders,
      timeout: 30000,
    },
    fetch: (input: string | Request, init: any = {}) => {
      const headers = new Headers(init.headers || {});
      if (basicAuthHeader) {
        headers.set('Authorization', basicAuthHeader);
      }
      headers.set('X-Requested-With', 'XMLHttpRequest');
      headers.set('Accept', 'application/json');
      init.headers = headers;
      return fetch(input, init);
    },
  };

  if (auth && auth.username) {
    options.auth = {
      username: auth.username,
      password: auth.password || '',
    };
  }

  return new PouchDB<T>(url, options);
}

export async function testCouchDBConnection(
  config: CouchDBSettings
): Promise<{
  success: boolean;
  message: string;
  version?: string;
  databases?: RemoteDatabaseInfo[];
  missingDatabasesCount?: number;
}> {
  if (!config.endpoint || !config.endpoint.trim()) {
    return { success: false, message: 'Endpoint URL obbligatorio (es. http://localhost:5984)' };
  }

  const cleanEndpoint = config.endpoint.trim().replace(/\/+$/, '');

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (config.username) {
      const authStr = btoa(`${config.username}:${config.password || ''}`);
      headers['Authorization'] = `Basic ${authStr}`;
    }

    const res = await fetch(cleanEndpoint, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: 'Credenziali errate (401/403: Accesso Negato)' };
      }
      return { success: false, message: `Errore server CouchDB: HTTP ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    
    // Check database statuses on CouchDB
    const dbStatuses = await checkRemoteDatabases(config);
    const missingDbs = dbStatuses.filter((d) => !d.exists);

    let message = '';
    if (config.username) {
      message = `Autenticato come "${config.username}". Server CouchDB v${data.version || 'OK'} pronto.`;
    } else {
      message = `Connessione riuscita a CouchDB! Versione: ${data.version || 'OK'}.`;
    }

    if (missingDbs.length > 0) {
      message += ` ⚠ Attenzione: ${missingDbs.length} database su 7 non esistono ancora sul server (${missingDbs.map((d) => d.name).join(', ')}). Clicca su "Inizializza Database" per crearli o creali su Fauxton.`;
    } else {
      message += ` Tutti i 7 database esistono e sono pronti per la sincronizzazione! ✓`;
    }

    return {
      success: true,
      message,
      version: data.version,
      databases: dbStatuses,
      missingDatabasesCount: missingDbs.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Impossibile raggiungere il server CouchDB: ${err.message || 'Errore di rete o CORS'}. Assicurati che il CORS sia abilitato su CouchDB.`,
    };
  }
}

export const SYNC_COLLECTIONS_DEF = [
  { key: 'roles', suffix: 'roles', label: 'Ruoli' },
  { key: 'slots', suffix: 'slots', label: 'Fasce Orarie' },
  { key: 'tasks', suffix: 'tasks', label: 'Attività' },
  { key: 'sessions', suffix: 'sessions', label: 'Sessioni Timer' },
  { key: 'timer', suffix: 'timer', label: 'Timer Attivo' },
  { key: 'braindump', suffix: 'braindump', label: 'Brain Dump' },
  { key: 'settings', suffix: 'settings', label: 'Impostazioni' },
] as const;

function getPouchCollectionByKey(key: typeof SYNC_COLLECTIONS_DEF[number]['key']) {
  switch (key) {
    case 'roles': return db.roles;
    case 'slots': return db.timeSlots;
    case 'tasks': return db.tasks;
    case 'sessions': return db.timerSessions;
    case 'timer': return db.activeTimer;
    case 'braindump': return db.brainDump;
    case 'settings': return db.settings;
  }
}

export class CouchDBSyncManager {
  private activeSyncs: any[] = [];
  private syncState: CouchDBSyncState = 'disconnected';
  private lastError?: string;
  private stateListeners: Set<(state: CouchDBSyncState, err?: string) => void> = new Set();
  private progressListeners: Set<(progress: SyncProgressInfo) => void> = new Set();
  private currentConfig?: CouchDBSettings;
  private isSyncing = false;
  private smartSyncTimer: any = null;
  private periodicInterval: any = null;
  private visibilityListener?: () => void;
  private progress: SyncProgressInfo;

  constructor() {
    this.progress = {
      state: 'disconnected',
      detailedMessage: 'Sincronizzazione non attiva',
      currentStep: 0,
      totalSteps: SYNC_COLLECTIONS_DEF.length,
      percent: 0,
      collections: this.buildInitialCollectionStatuses('rolefocus_'),
      logs: [
        {
          id: 'init',
          timestamp: Date.now(),
          type: 'info',
          message: 'Motore di sincronizzazione pronto',
        },
      ],
    };
  }

  private buildInitialCollectionStatuses(prefix: string): Record<string, SyncCollectionStatus> {
    const res: Record<string, SyncCollectionStatus> = {};
    for (const def of SYNC_COLLECTIONS_DEF) {
      res[def.key] = {
        key: def.key,
        name: `${prefix}${def.suffix}`,
        label: def.label,
        status: 'idle',
        docsRead: 0,
        docsWritten: 0,
      };
    }
    return res;
  }

  private addLog(type: SyncLogEntry['type'], message: string) {
    const entry: SyncLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type,
      message,
    };
    this.progress.logs = [entry, ...this.progress.logs].slice(0, 30);
  }

  private notifyProgress() {
    for (const l of this.progressListeners) {
      try {
        l({
          ...this.progress,
          collections: { ...this.progress.collections },
          logs: [...this.progress.logs],
        });
      } catch (err) {
        console.error('Progress listener error:', err);
      }
    }
  }

  public subscribeState(listener: (state: CouchDBSyncState, err?: string) => void) {
    this.stateListeners.add(listener);
    listener(this.syncState, this.lastError);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeProgress(listener: (progress: SyncProgressInfo) => void): () => void {
    this.progressListeners.add(listener);
    listener({
      ...this.progress,
      collections: { ...this.progress.collections },
      logs: [...this.progress.logs],
    });
    return () => this.progressListeners.delete(listener);
  }

  private notifyState(state: CouchDBSyncState, err?: string) {
    this.syncState = state;
    this.lastError = err;
    this.progress.state = state;
    if (err) this.progress.detailedMessage = err;
    for (const l of this.stateListeners) {
      try {
        l(state, err);
      } catch (e) {
        console.error('Sync listener error:', e);
      }
    }
    this.notifyProgress();
  }

  public getState() {
    return { state: this.syncState, error: this.lastError };
  }

  public getProgress(): SyncProgressInfo {
    return {
      ...this.progress,
      collections: { ...this.progress.collections },
      logs: [...this.progress.logs],
    };
  }

  public clearLogs() {
    this.progress.logs = [];
    this.notifyProgress();
  }

  public stopLiveSync() {
    if (this.smartSyncTimer) {
      clearTimeout(this.smartSyncTimer);
      this.smartSyncTimer = null;
    }
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = undefined;
    }
    for (const s of this.activeSyncs) {
      try {
        s.cancel();
      } catch {
        // ignore
      }
    }
    this.activeSyncs = [];
    this.isSyncing = false;
    this.notifyState('disconnected');
    this.progress.detailedMessage = 'Sincronizzazione disconnessa';
    this.notifyProgress();
  }

  public async syncOnce(config: CouchDBSettings): Promise<{ success: boolean; message: string }> {
    if (!config.enabled || !config.endpoint) {
      return { success: false, message: 'CouchDB non configurato o disabilitato' };
    }

    if (this.isSyncing) {
      return { success: true, message: 'Sincronizzazione già in corso...' };
    }

    this.isSyncing = true;
    const startTime = performance.now();
    const prefix = config.databasePrefix?.trim() || 'rolefocus_';
    const auth = config.username ? { username: config.username, password: config.password } : undefined;

    this.notifyState('syncing');
    this.progress.detailedMessage = 'Verifica connessione e database CouchDB...';
    this.progress.currentStep = 0;
    this.progress.totalSteps = SYNC_COLLECTIONS_DEF.length;
    this.progress.percent = 5;
    this.addLog('info', `Avvio sincronizzazione con server ${config.endpoint}`);
    this.notifyProgress();

    // Prepare collection statuses
    for (const def of SYNC_COLLECTIONS_DEF) {
      this.progress.collections[def.key] = {
        key: def.key,
        name: `${prefix}${def.suffix}`,
        label: def.label,
        status: 'syncing',
        docsRead: 0,
        docsWritten: 0,
      };
    }
    this.notifyProgress();

    try {
      // 1. Parallel verification of remote databases (cached)
      await Promise.all(
        SYNC_COLLECTIONS_DEF.map((def) =>
          ensureRemoteDatabaseExists(config.endpoint, `${prefix}${def.suffix}`, auth)
        )
      );

      let totalRead = 0;
      let totalWritten = 0;

      // 2. Sequential execution of collections with granular real-time feedback
      for (let i = 0; i < SYNC_COLLECTIONS_DEF.length; i++) {
        const def = SYNC_COLLECTIONS_DEF[i];
        const dbName = `${prefix}${def.suffix}`;
        const col = getPouchCollectionByKey(def.key);

        this.progress.currentStep = i + 1;
        this.progress.percent = Math.round(((i + 1) / (SYNC_COLLECTIONS_DEF.length + 1)) * 100);
        this.progress.detailedMessage = `Sincronizzazione ${def.label} (${i + 1}/${SYNC_COLLECTIONS_DEF.length})...`;
        this.notifyProgress();

        try {
          const remoteDb = createRemoteDb(config.endpoint, dbName, auth);
          const rawDb = col.getRawDB();

          // Execute bidirectional sync (PULL from remote, PUSH from local)
          const syncResult: any = await rawDb.sync(remoteDb);

          const docsRead = (syncResult?.pull?.docs_written ?? 0) + (syncResult?.pull?.docs_read ?? 0);
          const docsWritten = (syncResult?.push?.docs_written ?? 0);

          totalRead += docsRead;
          totalWritten += docsWritten;

          this.progress.collections[def.key] = {
            ...this.progress.collections[def.key],
            status: 'ok',
            docsRead,
            docsWritten,
            lastUpdated: Date.now(),
          };

          if (docsRead > 0 || docsWritten > 0) {
            this.addLog('success', `${def.label}: scaricati ${docsRead}, caricati ${docsWritten}`);
          }
        } catch (itemErr: any) {
          const rawMsg = itemErr.message || itemErr.reason || 'Errore sincronizzazione';
          let errMsg = rawMsg;
          if (rawMsg.includes('Database does not exist') || rawMsg.includes('not_found') || itemErr.status === 404) {
            errMsg = `Il database "${dbName}" non esiste sul server CouchDB. Va creato lato server su CouchDB (Fauxton/curl) o cliccando "Inizializza Database".`;
          }
          this.progress.collections[def.key] = {
            ...this.progress.collections[def.key],
            status: 'error',
            lastError: errMsg,
          };
          this.addLog('warn', `${def.label}: ${errMsg}`);
          // Don't abort completely; allow other collections to continue
        }
        this.notifyProgress();
      }

      const durationMs = Math.round(performance.now() - startTime);
      this.progress.lastSyncDurationMs = durationMs;
      this.progress.percent = 100;
      this.progress.detailedMessage = `Sincronizzato in ${durationMs}ms (Scaricati: ${totalRead}, Caricati: ${totalWritten})`;
      this.addLog(
        'success',
        `Sincronizzazione completata con successo in ${durationMs}ms ✓ (Scaricati: ${totalRead}, Caricati: ${totalWritten})`
      );

      this.notifyState('connected');
      this.progress.state = 'connected';
      this.notifyProgress();

      return {
        success: true,
        message: `Sincronizzazione completata in ${durationMs}ms (${totalRead} scaricati, ${totalWritten} caricati).`,
      };
    } catch (err: any) {
      const errMsg = err.message || 'Errore durante la sincronizzazione';
      this.notifyState('error', errMsg);
      this.progress.state = 'error';
      this.progress.detailedMessage = `Errore: ${errMsg}`;
      this.addLog('error', `Errore sync: ${errMsg}`);
      this.notifyProgress();
      return { success: false, message: errMsg };
    } finally {
      this.isSyncing = false;
    }
  }

  public async startLiveSync(config: CouchDBSettings): Promise<() => void> {
    this.stopLiveSync();
    this.currentConfig = config;

    if (!config.enabled || !config.endpoint || !config.autoSync) {
      return () => {
        this.stopLiveSync();
      };
    }

    const mode = config.syncMode || 'smart';

    if (mode === 'smart') {
      // SMART MODE (Recommended):
      // 1. Initial fast sync
      this.addLog('info', 'Attivata modalità Sincronizzazione Intelligente (su modifica & all\'avvio)');
      this.syncOnce(config).catch(() => {});

      // 2. Periodic gentle sync every 45 seconds (checks remote changes if app is idle)
      this.periodicInterval = setInterval(() => {
        if (!this.isSyncing && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.syncOnce(config).catch(() => {});
        }
      }, 45000);

      // 3. Tab visibility listener: when tab becomes active, sync immediately
      if (typeof document !== 'undefined') {
        this.visibilityListener = () => {
          if (document.visibilityState === 'visible' && !this.isSyncing) {
            this.addLog('info', 'Scheda riattivata: sincronizzazione rapida...');
            this.syncOnce(config).catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', this.visibilityListener);
      }

      return () => {
        this.stopLiveSync();
      };
    }

    // LIVE MODE (Continuous WebSocket/Long-polling Replications):
    this.notifyState('connecting');
    this.progress.state = 'connecting';
    this.progress.detailedMessage = 'Avvio replicazione live continua CouchDB...';
    this.addLog('info', 'Avvio replicazione live continua CouchDB...');
    this.notifyProgress();

    const prefix = config.databasePrefix?.trim() || 'rolefocus_';
    const auth = config.username ? { username: config.username, password: config.password } : undefined;

    try {
      await Promise.all(
        SYNC_COLLECTIONS_DEF.map((def) =>
          ensureRemoteDatabaseExists(config.endpoint, `${prefix}${def.suffix}`, auth)
        )
      );

      for (const def of SYNC_COLLECTIONS_DEF) {
        const dbName = `${prefix}${def.suffix}`;
        const col = getPouchCollectionByKey(def.key);
        const remoteDb = createRemoteDb(config.endpoint, dbName, auth);

        const sync = col.getRawDB().sync(remoteDb, {
          live: true,
          retry: true,
          batch_size: 20,
          batches_limit: 2,
        });

        sync
          .on('change', (info: any) => {
            const docsCount = info?.change?.docs?.length || 0;
            if (docsCount > 0) {
              this.notifyState('syncing');
              this.progress.state = 'syncing';
              this.progress.detailedMessage = `Ricevute ${docsCount} modifiche (${def.label})`;
              this.addLog('info', `Modifica live rilevata su ${def.label} (${docsCount} doc)`);
              this.notifyProgress();
              setTimeout(() => {
                this.notifyState('connected');
                this.progress.state = 'connected';
                this.progress.detailedMessage = 'Connesso & Sincronizzato (Live)';
                this.notifyProgress();
              }, 1200);
            }
          })
          .on('paused', (info: any) => {
            if (info) {
              this.notifyState('connected');
              this.progress.state = 'connected';
              this.progress.detailedMessage = 'Connesso & Sincronizzato (Live)';
              this.notifyProgress();
            }
          })
          .on('active', () => {
            // Heartbeat/active: don't flash "syncing" unless docs are transferring
          })
          .on('error', (err: any) => {
            console.error(`Sync error on ${def.label}:`, err);
            const rawMsg = err.message || err.reason || 'Errore live sync';
            let msg = rawMsg;
            if (rawMsg.includes('Database does not exist') || rawMsg.includes('not_found') || err.status === 404) {
              msg = `Il database "${dbName}" non esiste sul server CouchDB. Va creato lato server (Fauxton/curl) o cliccando "Inizializza Database".`;
            }
            this.addLog('error', `${def.label}: ${msg}`);
            this.notifyState('error', msg);
            this.progress.state = 'error';
            this.progress.detailedMessage = `Errore su ${def.label}: ${msg}`;
            this.notifyProgress();
          });

        this.activeSyncs.push(sync);
      }

      this.notifyState('connected');
      this.progress.state = 'connected';
      this.progress.detailedMessage = 'Connesso & Sincronizzato (Live)';
      this.addLog('success', 'Tutte le 7 replicazioni live collegate con successo ✓');
      this.notifyProgress();
    } catch (err: any) {
      const msg = err.message || 'Errore di avvio sincronizzazione';
      this.notifyState('error', msg);
      this.progress.state = 'error';
      this.progress.detailedMessage = msg;
      this.addLog('error', `Errore avvio live sync: ${msg}`);
      this.notifyProgress();
    }

    return () => {
      this.stopLiveSync();
    };
  }

  public triggerSmartSync() {
    if (!this.currentConfig || !this.currentConfig.enabled || !this.currentConfig.autoSync) return;
    if (this.currentConfig.syncMode === 'live') return; // live mode handles replication continuously
    if (this.smartSyncTimer) clearTimeout(this.smartSyncTimer);
    this.smartSyncTimer = setTimeout(() => {
      this.syncOnce(this.currentConfig!).catch(() => {});
    }, 1200);
  }
}

export const syncManager = new CouchDBSyncManager();

// Automatically trigger debounced smart sync whenever local documents mutate
registerGlobalMutationNotifier(() => {
  syncManager.triggerSmartSync();
});

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
    couchdb: {
      enabled: false,
      endpoint: '',
      username: '',
      password: '',
      databasePrefix: 'rolefocus_',
      autoSync: true,
    },
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
  const brainDump = await db.brainDump.toArray();
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
    brainDump,
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
    await db.brainDump.clear();
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
  if (payload.brainDump?.length) {
    await db.brainDump.bulkPut(payload.brainDump);
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
  await db.brainDump.clear();
  await db.activeTimer.clear();
  await db.settings.clear();
  await seedInitialDataIfNeeded();
}

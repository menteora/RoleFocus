export type ActiveTab = 'now' | 'tasks' | 'timeline' | 'inbox' | 'config' | 'history' | 'settings';

export type DecisionMode = 'important' | 'quick' | 'unblocker';

export type BrainDumpStatus = 'inbox' | 'converted' | 'discarded';

export interface BrainDumpItem {
  id: string;               // e.g. "bd-1742081234567"
  text: string;             // Quick thought / note
  notes?: string;           // Optional extra details
  createdAt: number;        // Timestamp
  status: BrainDumpStatus;  // 'inbox' | 'converted' | 'discarded'
  assignedRoleId?: string;  // Role id if converted
  assignedCategory?: DecisionMode; // Category if converted
  convertedTaskId?: string; // Created task id
  processedAt?: number;     // When converted or discarded
}

export type TaskCleanupUnit = 'hours' | 'days' | 'weeks';

export interface TaskCleanupFilter {
  amount: number;
  unit: TaskCleanupUnit;
}

export interface DecisionModeConfig {
  key: DecisionMode;
  conditionLabel: string;
  actionLabel: string;
  subtitle: string;
  iconName: string;
  defaultMinutes: number;
  badgeColorClass: string;
  borderColorClass: string;
}

export const DECISION_MODES: DecisionModeConfig[] = [
  {
    key: 'important',
    conditionLabel: 'Hai energia',
    actionLabel: 'Più importante',
    subtitle: 'Focus profondo su attività ad alto impatto e valore cognitivo',
    iconName: 'Zap',
    defaultMinutes: 45,
    badgeColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    borderColorClass: 'border-amber-400 dark:border-amber-500',
  },
  {
    key: 'quick',
    conditionLabel: 'Hai poca energia',
    actionLabel: 'Più veloce',
    subtitle: 'Vittoria rapida a basso attrito mentale per mantenere il ritmo',
    iconName: 'BatteryLow',
    defaultMinutes: 15,
    badgeColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    borderColorClass: 'border-emerald-400 dark:border-emerald-500',
  },
  {
    key: 'unblocker',
    conditionLabel: 'Hai molte dipendenze',
    actionLabel: 'Sblocca le altre',
    subtitle: 'Invia risposte, approva o delega per far avanzare gli altri',
    iconName: 'Unlock',
    defaultMinutes: 20,
    badgeColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    borderColorClass: 'border-blue-400 dark:border-blue-500',
  },
];

export interface Role {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex color (e.g. '#2563eb')
  iconName?: string;
  daysOfWeek?: number[]; // Active days for this role (0-6, empty or undefined means every day)
  defaultDurationMinutes: number; // default 25
  priority: number; // lower number = higher priority
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TimeSlot {
  id: string;
  roleId: string;
  startTime: string; // Format "HH:mm", e.g. "08:30"
  endTime: string;   // Format "HH:mm", e.g. "17:30"
  daysOfWeek?: number[]; // empty or undefined means every day [0,1,2,3,4,5,6]
  label?: string; // Optional descriptive label, e.g. "Turno Mattina"
  createdAt: number;
}

export interface RoleTask {
  id: string;
  roleId: string;
  category: DecisionMode; // 'important' | 'quick' | 'unblocker'
  text: string;
  completed: boolean;
  isCurrentPriority: boolean;
  isUrgent?: boolean; // Pinned as urgent with flame icon 🔥
  estimatedMinutes?: number;
  totalMinutesSpent?: number; // Accumulated minutes spent in focus sessions
  sessionCount?: number;      // Number of sessions completed on this task
  createdAt: number;
  completedAt?: number;
}

export interface TimerSession {
  id: string;
  roleId: string;
  roleName: string;
  roleColor?: string;
  taskId?: string; // Linked task ID if session was for a specific task
  taskText: string;
  category?: DecisionMode;
  durationMinutes: number;
  startedAt: number;
  endedAt: number;
  completed: boolean;
  isManual?: boolean; // True if manually added or attributed upon completion
  notes?: string;
}

export interface ActiveTimerData {
  id: string; // 'current_timer'
  roleId: string | null;
  roleName: string;
  roleColor: string;
  taskId?: string | null;
  taskText: string;
  category?: DecisionMode;
  totalDurationSeconds: number;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  startedAt: number | null;
  targetEndTimestamp: number | null;
  pausedAtTimestamp: number | null;
}

export type CouchDBSyncState = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

export interface SyncLogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface SyncCollectionStatus {
  key: string;
  name: string;
  label: string;
  status: 'idle' | 'syncing' | 'ok' | 'error';
  docsRead: number;
  docsWritten: number;
  lastUpdated?: number;
  lastError?: string;
}

export interface SyncProgressInfo {
  state: CouchDBSyncState;
  detailedMessage: string;
  currentStep: number;
  totalSteps: number;
  percent: number;
  lastSyncDurationMs?: number;
  collections: Record<string, SyncCollectionStatus>;
  logs: SyncLogEntry[];
}

export interface CouchDBSettings {
  enabled: boolean;
  endpoint: string; // e.g. "http://localhost:5984" or "https://couchdb.example.com"
  username?: string;
  password?: string;
  databasePrefix?: string; // e.g. "rolefocus_"
  autoSync: boolean;
  syncMode?: 'smart' | 'live'; // 'smart' = on-change + on-start (fast, solid, avoids browser 6-socket block); 'live' = continuous long-polling
  lastSyncTimestamp?: number;
  lastError?: string;
}

export interface AppSettings {
  id: string; // 'current_settings'
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  notificationEnabled: boolean;
  defaultTimerMinutes: number;
  timeSimulationEnabled: boolean;
  simulatedTimeMinutes: number | null; // Minutes from 00:00 (0 to 1439)
  couchdb?: CouchDBSettings;
}

export interface ExportDataPayload {
  version: number;
  exportedAt: string;
  roles: Role[];
  timeSlots: TimeSlot[];
  tasks: RoleTask[];
  timerSessions: TimerSession[];
  brainDump?: BrainDumpItem[];
  settings?: AppSettings;
}

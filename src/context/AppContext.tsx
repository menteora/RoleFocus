import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db, seedInitialDataIfNeeded, exportAllData, importAllData, resetDatabaseToDefault } from '../db/db';
import type {
  Role,
  TimeSlot,
  RoleTask,
  TimerSession,
  ActiveTimerData,
  AppSettings,
  ActiveTab,
  ExportDataPayload,
  DecisionMode,
} from '../types';
import { isSlotActiveAtTime } from '../utils/timeUtils';
import { playCompletionChime, playButtonTick, sendTimerNotification } from '../utils/soundUtils';

export interface ActiveRoleInfo {
  role: Role;
  activeSlots: TimeSlot[];
  tasksByCategory: Record<DecisionMode, RoleTask[]>;
  activeDecisionMode: DecisionMode;
  activeTask: RoleTask | null;
}

interface AppContextType {
  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Clock & Simulation
  currentTime: Date;
  isSimulatingTime: boolean;
  simulatedMinutes: number | null;
  effectiveMinutes: number;
  effectiveDayOfWeek: number;
  setSimulatedTime: (minutes: number | null) => void;
  resetToRealTime: () => void;

  // Data
  roles: Role[];
  timeSlots: TimeSlot[];
  tasks: RoleTask[];
  timerSessions: TimerSession[];
  settings: AppSettings;
  activeRolesInfo: ActiveRoleInfo[];
  selectedFocusRoleId: string | null;
  setSelectedFocusRoleId: (roleId: string | null) => void;

  // Active Timer
  activeTimer: ActiveTimerData | null;
  startTimerForRole: (
    role: Role,
    taskText?: string,
    customMinutes?: number,
    category?: DecisionMode,
    taskId?: string
  ) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: (recordCompleted?: boolean) => Promise<void>;
  extendTimerMinutes: (deltaMinutes: number) => Promise<void>;

  // Role Operations
  createOrUpdateRole: (role: Omit<Role, 'createdAt' | 'updatedAt' | 'id'> & { id?: string }) => Promise<string>;
  deleteRole: (roleId: string) => Promise<void>;
  updateRoleOrder: (roleIdsInOrder: string[]) => Promise<void>;

  // Slot Operations
  createOrUpdateSlot: (slot: Omit<TimeSlot, 'createdAt' | 'id'> & { id?: string }) => Promise<string>;
  deleteSlot: (slotId: string) => Promise<void>;

  // Task Operations (3 Decision Modes: Important, Quick, Unblocker)
  addOrUpdateTask: (taskData: {
    id?: string;
    roleId: string;
    category: DecisionMode;
    text: string;
    estimatedMinutes?: number;
    isCurrentPriority?: boolean;
  }) => Promise<string>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskStatus: (taskId: string) => Promise<void>;
  setRoleActiveDecision: (roleId: string, category: DecisionMode, taskId?: string) => Promise<void>;

  // Role Decisions state mapping (local per role)
  selectedDecisions: Record<string, DecisionMode>;
  setRoleDecisionMode: (roleId: string, mode: DecisionMode) => void;

  // Settings & Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  toggleTheme: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;

  // Import / Export
  exportBackup: () => Promise<ExportDataPayload>;
  importBackup: (data: ExportDataPayload, mode?: 'replace' | 'merge') => Promise<void>;
  resetToFactoryDefaults: () => Promise<void>;

  // Loading state
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('now');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [selectedFocusRoleId, setSelectedFocusRoleId] = useState<string | null>(null);
  const [selectedDecisions, setSelectedDecisions] = useState<Record<string, DecisionMode>>({});

  // Initialize DB on mount
  useEffect(() => {
    async function init() {
      try {
        await seedInitialDataIfNeeded();
      } catch (err) {
        console.error('Error initializing database:', err);
      } finally {
        setIsInitialized(true);
      }
    }
    init();
  }, []);

  // Live queries from Dexie IndexedDB
  const roles = useLiveQuery(() => db.roles.toArray(), [], []) || [];
  const timeSlots = useLiveQuery(() => db.timeSlots.toArray(), [], []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []) || [];
  const timerSessions = useLiveQuery(() => db.timerSessions.orderBy('startedAt').reverse().toArray(), [], []) || [];
  const activeTimerRecord = useLiveQuery(() => db.activeTimer.get('current_timer'), []);
  const settingsRecord = useLiveQuery(() => db.settings.get('current_settings'), []);

  const settings: AppSettings = useMemo(() => {
    return (
      settingsRecord || {
        id: 'current_settings',
        theme: 'system',
        soundEnabled: true,
        notificationEnabled: true,
        defaultTimerMinutes: 25,
        timeSimulationEnabled: false,
        simulatedTimeMinutes: null,
      }
    );
  }, [settingsRecord]);

  // Real-time clock update (every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate effective time (real or simulated)
  const isSimulatingTime = Boolean(settings.timeSimulationEnabled && settings.simulatedTimeMinutes !== null);
  const simulatedMinutes = settings.simulatedTimeMinutes;

  const realMinutesFromMidnight = currentTime.getHours() * 60 + currentTime.getMinutes();
  const effectiveMinutes = isSimulatingTime && simulatedMinutes !== null ? simulatedMinutes : realMinutesFromMidnight;
  const effectiveDayOfWeek = currentTime.getDay(); // 0 is Sunday, 1 is Monday...

  // Theme synchronization with DOM and localStorage
  const theme = settings.theme || 'system';

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Sorted non-archived roles
  const sortedRoles = useMemo(() => {
    return [...roles]
      .filter((r) => !r.isArchived)
      .sort((a, b) => a.priority - b.priority);
  }, [roles]);

  // Active roles calculation for the current effective time with 3 decision categories
  const activeRolesInfo: ActiveRoleInfo[] = useMemo(() => {
    return sortedRoles
      .map((role) => {
        // If role has day of week restriction, check if active today
        if (role.daysOfWeek && role.daysOfWeek.length > 0 && !role.daysOfWeek.includes(effectiveDayOfWeek)) {
          return {
            role,
            activeSlots: [],
            tasksByCategory: { important: [], quick: [], unblocker: [] },
            activeDecisionMode: 'important' as DecisionMode,
            activeTask: null,
          };
        }

        const roleSlots = timeSlots.filter((slot) => slot.roleId === role.id);
        const matchingSlots = roleSlots.filter((slot) =>
          isSlotActiveAtTime(slot, effectiveMinutes, effectiveDayOfWeek)
        );

        const roleTasks = tasks.filter((t) => t.roleId === role.id);
        
        const tasksByCategory: Record<DecisionMode, RoleTask[]> = {
          important: roleTasks.filter((t) => (t.category || 'important') === 'important'),
          quick: roleTasks.filter((t) => t.category === 'quick'),
          unblocker: roleTasks.filter((t) => t.category === 'unblocker'),
        };

        // Decision mode preference (stored in state or priority task category)
        const chosenCategory = selectedDecisions[role.id] || 'important';
        const categoryTasks = tasksByCategory[chosenCategory] || [];
        const activeTask =
          categoryTasks.find((t) => t.isCurrentPriority && !t.completed) ||
          categoryTasks.find((t) => !t.completed) ||
          categoryTasks[0] ||
          null;

        return {
          role,
          activeSlots: matchingSlots,
          tasksByCategory,
          activeDecisionMode: chosenCategory,
          activeTask,
        };
      })
      .filter((info) => info.activeSlots.length > 0);
  }, [sortedRoles, timeSlots, tasks, effectiveMinutes, effectiveDayOfWeek, selectedDecisions]);

  // If no selected focus role, or if current focus role became inactive, pick the first active role
  useEffect(() => {
    if (activeRolesInfo.length > 0) {
      const exists = activeRolesInfo.some((info) => info.role.id === selectedFocusRoleId);
      if (!selectedFocusRoleId || !exists) {
        setSelectedFocusRoleId(activeRolesInfo[0].role.id);
      }
    } else if (sortedRoles.length > 0 && !selectedFocusRoleId) {
      setSelectedFocusRoleId(sortedRoles[0].id);
    }
  }, [activeRolesInfo, selectedFocusRoleId, sortedRoles]);

  // Set decision mode for a role
  const setRoleDecisionMode = useCallback((roleId: string, mode: DecisionMode) => {
    setSelectedDecisions((prev) => ({ ...prev, [roleId]: mode }));
  }, []);

  // Active Timer engine: survives reloads and accurately tracks time via targetEndTimestamp
  const activeTimer = activeTimerRecord || null;

  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    } catch {
      // ignore
    }
  }, []);

  // Helper to record a completed session and update task stats
  const recordSessionAndAccumulateTaskTime = async (
    roleId: string,
    roleName: string,
    roleColor: string,
    taskText: string,
    category: DecisionMode,
    durationMinutes: number,
    startedAt: number,
    taskId?: string | null
  ) => {
    const session: TimerSession = {
      id: `session-${Date.now()}`,
      roleId,
      roleName,
      roleColor,
      taskId: taskId || undefined,
      taskText: taskText || 'Sessione Focus',
      category: category || 'important',
      durationMinutes,
      startedAt,
      endedAt: Date.now(),
      completed: true,
    };

    await db.timerSessions.add(session);

    // Accumulate time on task
    if (taskId) {
      const task = await db.tasks.get(taskId);
      if (task) {
        await db.tasks.update(taskId, {
          totalMinutesSpent: (task.totalMinutesSpent || 0) + durationMinutes,
          sessionCount: (task.sessionCount || 0) + 1,
        });
      }
    } else if (taskText && roleId) {
      const matchedTask = await db.tasks
        .where('roleId')
        .equals(roleId)
        .filter((t) => t.text.trim().toLowerCase() === taskText.trim().toLowerCase())
        .first();

      if (matchedTask) {
        await db.tasks.update(matchedTask.id, {
          totalMinutesSpent: (matchedTask.totalMinutesSpent || 0) + durationMinutes,
          sessionCount: (matchedTask.sessionCount || 0) + 1,
        });
      }
    }
  };

  // Timer Tick Engine: updates remainingSeconds based on targetEndTimestamp
  useEffect(() => {
    if (!activeTimer || activeTimer.status !== 'running' || !activeTimer.targetEndTimestamp) {
      return;
    }

    const interval = setInterval(async () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((activeTimer.targetEndTimestamp! - now) / 1000));

      if (remaining <= 0) {
        // Timer completed!
        clearInterval(interval);

        if (settings.soundEnabled) {
          playCompletionChime();
        }
        triggerCelebration();

        if (settings.notificationEnabled) {
          sendTimerNotification(
            `Sessione completata: ${activeTimer.roleName}`,
            activeTimer.taskText
              ? `Hai completato: "${activeTimer.taskText}"`
              : `Hai terminato la sessione di ${Math.round(activeTimer.totalDurationSeconds / 60)} min.`
          );
        }

        const durationMinutes = Math.round(activeTimer.totalDurationSeconds / 60);
        const startedAt = activeTimer.startedAt || Date.now() - activeTimer.totalDurationSeconds * 1000;

        await recordSessionAndAccumulateTaskTime(
          activeTimer.roleId || 'unassigned',
          activeTimer.roleName,
          activeTimer.roleColor,
          activeTimer.taskText,
          activeTimer.category || 'important',
          durationMinutes,
          startedAt,
          activeTimer.taskId
        );

        // Update timer record
        await db.activeTimer.put({
          ...activeTimer,
          remainingSeconds: 0,
          status: 'completed',
          targetEndTimestamp: null,
        });
      } else {
        // Update remaining seconds in memory / DB periodically
        if (Math.abs(activeTimer.remainingSeconds - remaining) >= 1) {
          await db.activeTimer.update('current_timer', {
            remainingSeconds: remaining,
          });
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeTimer, settings.soundEnabled, settings.notificationEnabled, triggerCelebration]);

  // Timer Actions
  const startTimerForRole = async (
    role: Role,
    taskText?: string,
    customMinutes?: number,
    category: DecisionMode = 'important',
    taskId?: string
  ) => {
    playButtonTick();
    const durationMins = customMinutes || role.defaultDurationMinutes || settings.defaultTimerMinutes || 25;
    const durationSeconds = durationMins * 60;
    const now = Date.now();
    const targetEnd = now + durationSeconds * 1000;

    const timerData: ActiveTimerData = {
      id: 'current_timer',
      roleId: role.id,
      roleName: role.name,
      roleColor: role.color,
      taskId: taskId || null,
      taskText: taskText || '',
      category,
      totalDurationSeconds: durationSeconds,
      remainingSeconds: durationSeconds,
      status: 'running',
      startedAt: now,
      targetEndTimestamp: targetEnd,
      pausedAtTimestamp: null,
    };

    await db.activeTimer.put(timerData);
  };

  const pauseTimer = async () => {
    if (!activeTimer || activeTimer.status !== 'running') return;
    playButtonTick();
    const now = Date.now();
    const remaining = Math.max(0, Math.round((activeTimer.targetEndTimestamp! - now) / 1000));

    await db.activeTimer.put({
      ...activeTimer,
      status: 'paused',
      remainingSeconds: remaining,
      pausedAtTimestamp: now,
      targetEndTimestamp: null,
    });
  };

  const resumeTimer = async () => {
    if (!activeTimer || activeTimer.status !== 'paused') return;
    playButtonTick();
    const now = Date.now();
    const remaining = activeTimer.remainingSeconds > 0 ? activeTimer.remainingSeconds : activeTimer.totalDurationSeconds;
    const targetEnd = now + remaining * 1000;

    await db.activeTimer.put({
      ...activeTimer,
      status: 'running',
      remainingSeconds: remaining,
      targetEndTimestamp: targetEnd,
      pausedAtTimestamp: null,
    });
  };

  const stopTimer = async (recordCompleted = false) => {
    if (!activeTimer) return;
    playButtonTick();

    if (recordCompleted && activeTimer.startedAt && activeTimer.roleId) {
      const elapsedSeconds = activeTimer.totalDurationSeconds - activeTimer.remainingSeconds;
      const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

      await recordSessionAndAccumulateTaskTime(
        activeTimer.roleId,
        activeTimer.roleName,
        activeTimer.roleColor,
        activeTimer.taskText,
        activeTimer.category || 'important',
        elapsedMinutes,
        activeTimer.startedAt,
        activeTimer.taskId
      );
    }

    await db.activeTimer.put({
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
    });
  };

  const extendTimerMinutes = async (deltaMinutes: number) => {
    if (!activeTimer) return;
    playButtonTick();
    const deltaSeconds = deltaMinutes * 60;
    const newTotal = Math.max(60, activeTimer.totalDurationSeconds + deltaSeconds);
    const newRemaining = Math.max(0, activeTimer.remainingSeconds + deltaSeconds);
    const now = Date.now();

    const targetEnd =
      activeTimer.status === 'running'
        ? (activeTimer.targetEndTimestamp || now) + deltaSeconds * 1000
        : null;

    await db.activeTimer.put({
      ...activeTimer,
      totalDurationSeconds: newTotal,
      remainingSeconds: newRemaining,
      targetEndTimestamp: targetEnd,
    });
  };

  // Role Operations
  const createOrUpdateRole = async (roleData: Omit<Role, 'createdAt' | 'updatedAt' | 'id'> & { id?: string }) => {
    const now = Date.now();
    const id = roleData.id || `role-${now}`;
    const existing = roleData.id ? await db.roles.get(roleData.id) : null;

    const role: Role = {
      id,
      name: roleData.name.trim(),
      description: roleData.description?.trim() || '',
      color: roleData.color || '#2563eb',
      iconName: roleData.iconName || 'Briefcase',
      daysOfWeek: roleData.daysOfWeek && roleData.daysOfWeek.length > 0 ? roleData.daysOfWeek : undefined,
      defaultDurationMinutes: roleData.defaultDurationMinutes || 25,
      priority: roleData.priority ?? sortedRoles.length + 1,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    await db.roles.put(role);
    return id;
  };

  const deleteRole = async (roleId: string) => {
    await db.transaction('rw', [db.roles, db.timeSlots, db.tasks], async () => {
      await db.roles.delete(roleId);
      await db.timeSlots.where('roleId').equals(roleId).delete();
      await db.tasks.where('roleId').equals(roleId).delete();
    });
  };

  const updateRoleOrder = async (roleIdsInOrder: string[]) => {
    await db.transaction('rw', [db.roles], async () => {
      for (let i = 0; i < roleIdsInOrder.length; i++) {
        await db.roles.update(roleIdsInOrder[i], { priority: i + 1 });
      }
    });
  };

  // Slot Operations
  const createOrUpdateSlot = async (slotData: Omit<TimeSlot, 'createdAt' | 'id'> & { id?: string }) => {
    const now = Date.now();
    const id = slotData.id || `slot-${now}`;
    const existing = slotData.id ? await db.timeSlots.get(slotData.id) : null;

    const slot: TimeSlot = {
      id,
      roleId: slotData.roleId,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
      daysOfWeek: slotData.daysOfWeek && slotData.daysOfWeek.length > 0 ? slotData.daysOfWeek : undefined,
      label: slotData.label?.trim() || undefined,
      createdAt: existing ? existing.createdAt : now,
    };

    await db.timeSlots.put(slot);
    return id;
  };

  const deleteSlot = async (slotId: string) => {
    await db.timeSlots.delete(slotId);
  };

  // Task Operations with 3 Decision Modes
  const addOrUpdateTask = async (taskData: {
    id?: string;
    roleId: string;
    category: DecisionMode;
    text: string;
    estimatedMinutes?: number;
    isCurrentPriority?: boolean;
  }) => {
    const now = Date.now();
    const id = taskData.id || `task-${now}`;
    const existing = taskData.id ? await db.tasks.get(taskData.id) : null;

    const task: RoleTask = {
      id,
      roleId: taskData.roleId,
      category: taskData.category,
      text: taskData.text.trim(),
      completed: existing ? existing.completed : false,
      isCurrentPriority: taskData.isCurrentPriority ?? true,
      estimatedMinutes: taskData.estimatedMinutes,
      createdAt: existing ? existing.createdAt : now,
    };

    await db.tasks.put(task);
    return id;
  };

  const setRoleActiveDecision = async (roleId: string, category: DecisionMode, taskId?: string) => {
    setSelectedDecisions((prev) => ({ ...prev, [roleId]: category }));
    if (taskId) {
      await db.transaction('rw', [db.tasks], async () => {
        const roleTasks = await db.tasks.where('roleId').equals(roleId).toArray();
        for (const t of roleTasks) {
          if (t.isCurrentPriority && t.id !== taskId) {
            await db.tasks.update(t.id, { isCurrentPriority: false });
          }
        }
        await db.tasks.update(taskId, { isCurrentPriority: true });
      });
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    const task = await db.tasks.get(taskId);
    if (!task) return;
    playButtonTick();
    const now = Date.now();
    await db.tasks.update(taskId, {
      completed: !task.completed,
      completedAt: !task.completed ? now : undefined,
    });
  };

  const deleteTask = async (taskId: string) => {
    playButtonTick();
    await db.tasks.delete(taskId);
  };

  // Settings & Theme
  const setTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    await db.settings.put({
      ...settings,
      id: 'current_settings',
      theme: newTheme,
    });
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    await setTheme(next);
  };

  const updateSettings = async (partial: Partial<AppSettings>) => {
    await db.settings.put({
      ...settings,
      ...partial,
      id: 'current_settings',
    });
  };

  // Simulation controls
  const setSimulatedTime = async (minutes: number | null) => {
    await updateSettings({
      timeSimulationEnabled: minutes !== null,
      simulatedTimeMinutes: minutes,
    });
  };

  const resetToRealTime = async () => {
    await updateSettings({
      timeSimulationEnabled: false,
      simulatedTimeMinutes: null,
    });
  };

  // Import / Export
  const exportBackup = async () => {
    return await exportAllData();
  };

  const importBackup = async (data: ExportDataPayload, mode: 'replace' | 'merge' = 'replace') => {
    await importAllData(data, mode);
  };

  const resetToFactoryDefaults = async () => {
    await resetDatabaseToDefault();
  };

  const value: AppContextType = {
    activeTab,
    setActiveTab,
    currentTime,
    isSimulatingTime,
    simulatedMinutes,
    effectiveMinutes,
    effectiveDayOfWeek,
    setSimulatedTime,
    resetToRealTime,
    roles: sortedRoles,
    timeSlots,
    tasks,
    timerSessions,
    settings,
    activeRolesInfo,
    selectedFocusRoleId,
    setSelectedFocusRoleId,
    activeTimer,
    startTimerForRole,
    pauseTimer,
    resumeTimer,
    stopTimer,
    extendTimerMinutes,
    createOrUpdateRole,
    deleteRole,
    updateRoleOrder,
    createOrUpdateSlot,
    deleteSlot,
    addOrUpdateTask,
    deleteTask,
    toggleTaskStatus,
    setRoleActiveDecision,
    selectedDecisions,
    setRoleDecisionMode,
    theme,
    setTheme,
    toggleTheme,
    updateSettings,
    exportBackup,
    importBackup,
    resetToFactoryDefaults,
    isInitialized,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

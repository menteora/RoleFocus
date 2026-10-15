import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  Calendar,
  Sliders,
  History,
  Sun,
  Moon,
  Server,
  RefreshCw,
  AlertCircle,
  Inbox,
  Sparkles,
  Check,
  ListTodo,
  Flame,
} from 'lucide-react';
import type { ActiveTab } from '../types';

interface HeaderProps {
  onOpenImportExport: () => void;
  onToggleTimeSimulation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImportExport,
  onToggleTimeSimulation,
}) => {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    isSimulatingTime,
    activeTimer,
    activeRolesInfo,
    brainDumpItems,
    tasks,
    settings,
    couchDBSyncState,
    syncProgress,
  } = useApp();

  const unreadInboxCount = brainDumpItems.filter((i) => i.status === 'inbox').length;
  const urgentTasksCount = tasks.filter((t) => !t.completed && t.isUrgent).length;

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'now', label: 'Adesso', shortLabel: 'Adesso', icon: Clock },
    { id: 'tasks', label: 'Tutti i Task', shortLabel: 'Task', icon: ListTodo },
    { id: 'inbox', label: 'Inbox', shortLabel: 'Inbox', icon: Inbox },
    { id: 'timeline', label: 'Panoramica 24h', shortLabel: 'Panoramica', icon: Calendar },
    { id: 'config', label: 'Ruoli & Config', shortLabel: 'Ruoli', icon: Sliders },
    { id: 'history', label: 'Statistiche & Storico', shortLabel: 'Statistiche', icon: History },
  ];

  const hasRunningTimer = activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused');
  const isCouchEnabled = Boolean(settings.couchdb?.enabled && settings.couchdb?.endpoint);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 lg:gap-4">
          
          {/* Zone 1: Brand Wordmark (Stable width shrink-0) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('now')}
              className="group flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white font-['Syne',sans-serif]">
                RoleFocus
              </span>
            </button>
            {activeRolesInfo.length > 0 && (
              <span className="hidden xl:inline-flex text-xs font-medium text-slate-400 dark:text-slate-500">
                · {activeRolesInfo.length} {activeRolesInfo.length === 1 ? 'ruolo attivo' : 'ruoli attivi'}
              </span>
            )}
          </div>

          {/* Zone 2: Navigation Links (High contrast, clearly visible, responsive stable labels) */}
          <nav className="hidden md:flex items-center justify-center gap-1 xl:gap-1.5 flex-1 min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap select-none ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200/90 dark:border-blue-800/90 shadow-2xs font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="inline xl:hidden">{item.shortLabel}</span>

                  {item.id === 'tasks' && urgentTasksCount > 0 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-500 text-white font-mono flex items-center gap-0.5 shadow-2xs shrink-0"
                      title={`${urgentTasksCount} task ${urgentTasksCount === 1 ? 'urgente' : 'urgenti'} con risalto 🔥`}
                    >
                      <Flame className="w-2.5 h-2.5 fill-white text-white" />
                      <span>{urgentTasksCount}</span>
                    </span>
                  )}

                  {item.id === 'inbox' && unreadInboxCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono shadow-2xs shrink-0">
                      {unreadInboxCount}
                    </span>
                  )}

                  {item.id === 'now' && hasRunningTimer && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-400/40 shrink-0"
                      title="Timer focus in corso"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Action Buttons (Fixed & Stable widths to prevent layout shifts) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* CouchDB Sync Status Indicator & Config Launcher */}
            <button
              onClick={onOpenImportExport}
              title={
                isCouchEnabled
                  ? `CouchDB Sync: ${syncProgress?.detailedMessage || couchDBSyncState} (clicca per configurare & visualizzare i log)`
                  : 'Configura server CouchDB e Backup'
              }
              className={`h-9 px-2.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isCouchEnabled && couchDBSyncState === 'connected'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : isCouchEnabled && couchDBSyncState === 'syncing'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                  : isCouchEnabled && couchDBSyncState === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              {isCouchEnabled && couchDBSyncState === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
              ) : isCouchEnabled && couchDBSyncState === 'connected' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : isCouchEnabled && couchDBSyncState === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              ) : (
                <Server className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}

              {/* Stable Label: Fixed width / text so it NEVER shifts the navigation bar */}
              <span className="hidden xl:inline text-xs font-medium">
                {isCouchEnabled ? 'CouchDB' : 'Backup'}
              </span>

              {/* Live status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isCouchEnabled && couchDBSyncState === 'connected'
                    ? 'bg-emerald-500'
                    : isCouchEnabled && couchDBSyncState === 'syncing'
                    ? 'bg-blue-500 animate-pulse'
                    : isCouchEnabled && couchDBSyncState === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            </button>

            {/* Time Simulation toggle button */}
            <button
              onClick={onToggleTimeSimulation}
              title={isSimulatingTime ? 'Simulazione oraria attiva (clicca per impostare)' : 'Simula un orario diverso per testare fasce'}
              className={`h-9 px-2.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isSimulatingTime
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline text-xs font-medium">
                {isSimulatingTime ? 'Simulazione' : 'Simula'}
              </span>
              {isSimulatingTime && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Passa a tema ${theme === 'dark' ? 'Giorno' : 'Notte'}`}
              className="h-9 w-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 py-1 px-2 text-[11px] font-medium rounded-lg ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {item.id === 'tasks' && urgentTasksCount > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-black bg-orange-500 text-white flex items-center">
                      <Flame className="w-2 h-2 fill-white" />
                      <span>{urgentTasksCount}</span>
                    </span>
                  )}
                  {item.id === 'inbox' && unreadInboxCount > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                      {unreadInboxCount}
                    </span>
                  )}
                  {item.id === 'now' && hasRunningTimer && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

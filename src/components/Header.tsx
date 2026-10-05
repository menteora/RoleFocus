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
  Sparkles,
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
    settings,
    couchDBSyncState,
  } = useApp();

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'now', label: 'Adesso', icon: Clock },
    { id: 'timeline', label: 'Panoramica 24h', icon: Calendar },
    { id: 'config', label: 'Configurazione Ruoli', icon: Sliders },
    { id: 'history', label: 'Storico Focus', icon: History },
  ];

  const hasRunningTimer = activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused');
  const isCouchEnabled = Boolean(settings.couchdb?.enabled && settings.couchdb?.endpoint);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Zone 1: Brand Wordmark (Display font, clean single element) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('now')}
              className="group flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white font-['Syne',sans-serif]">
                RoleFocus
              </span>
            </button>
            {activeRolesInfo.length > 0 && (
              <span className="hidden sm:inline-flex text-xs text-slate-500 dark:text-slate-400">
                · {activeRolesInfo.length} {activeRolesInfo.length === 1 ? 'ruolo attivo' : 'ruoli attivi'}
              </span>
            )}
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                  <span>{item.label}</span>
                  {item.id === 'now' && hasRunningTimer && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* CouchDB Sync Status Indicator & Config Launcher */}
            <button
              onClick={onOpenImportExport}
              title={
                isCouchEnabled
                  ? `CouchDB Sync: ${couchDBSyncState} (clicca per configurare)`
                  : 'Configura server CouchDB e Backup'
              }
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                isCouchEnabled && couchDBSyncState === 'connected'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : isCouchEnabled && couchDBSyncState === 'syncing'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                  : isCouchEnabled && couchDBSyncState === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              {isCouchEnabled && couchDBSyncState === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              ) : isCouchEnabled && couchDBSyncState === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Server className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isCouchEnabled
                  ? couchDBSyncState === 'connected'
                    ? 'CouchDB'
                    : couchDBSyncState === 'syncing'
                    ? 'Sync...'
                    : couchDBSyncState === 'error'
                    ? 'Sync Error'
                    : 'CouchDB'
                  : 'CouchDB / Dati'}
              </span>
            </button>

            {/* Time Simulation toggle button */}
            <button
              onClick={onToggleTimeSimulation}
              title={isSimulatingTime ? 'Simulazione oraria attiva (clicca per impostare)' : 'Simula un orario diverso per testare fasce'}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                isSimulatingTime
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isSimulatingTime ? 'Simulazione' : 'Simula Ora'}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Passa a tema ${theme === 'dark' ? 'Giorno' : 'Notte'}`}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
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
                className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] rounded-lg ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {item.id === 'now' && hasRunningTimer && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

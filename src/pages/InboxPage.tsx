import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Inbox,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
  Plus,
  Zap,
  BatteryLow,
  Unlock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { DecisionMode, BrainDumpStatus } from '../types';

export const InboxPage: React.FC = () => {
  const {
    brainDumpItems,
    roles,
    addBrainDumpItem,
    convertBrainDumpToTask,
    discardBrainDumpItem,
    restoreBrainDumpItem,
    deleteBrainDumpItem,
    setActiveTab,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<BrainDumpStatus>('inbox');
  const [newThoughtText, setNewThoughtText] = useState('');
  const [selectedRoleByItem, setSelectedRoleByItem] = useState<Record<string, string>>({});
  const [selectedCategoryByItem, setSelectedCategoryByItem] = useState<Record<string, DecisionMode>>({});
  const [undoItem, setUndoItem] = useState<{ id: string; text: string } | null>(null);

  const activeRoles = roles.filter((r) => !r.isArchived);

  // Group counts
  const inboxList = brainDumpItems.filter((i) => i.status === 'inbox');
  const convertedList = brainDumpItems.filter((i) => i.status === 'converted');
  const discardedList = brainDumpItems.filter((i) => i.status === 'discarded');

  const currentList =
    filterStatus === 'inbox'
      ? inboxList
      : filterStatus === 'converted'
      ? convertedList
      : discardedList;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newThoughtText.trim();
    if (!trimmed) return;
    await addBrainDumpItem(trimmed);
    setNewThoughtText('');
  };

  const handleConvert = async (itemId: string) => {
    const roleId = selectedRoleByItem[itemId] || (activeRoles[0] ? activeRoles[0].id : '');
    const category = selectedCategoryByItem[itemId] || 'important';

    if (!roleId) return;
    await convertBrainDumpToTask(itemId, roleId, category);
  };

  const handleDiscard = async (itemId: string, text: string) => {
    await discardBrainDumpItem(itemId);
    setUndoItem({ id: itemId, text });
    setTimeout(() => {
      setUndoItem((prev) => (prev?.id === itemId ? null : prev));
    }, 6000);
  };

  const handleUndoDiscard = async (itemId: string) => {
    await restoreBrainDumpItem(itemId);
    setUndoItem(null);
  };

  const handleClearAllDiscarded = async () => {
    if (window.confirm('Vuoi eliminare definitivamente tutti i pensieri scartati?')) {
      for (const item of discardedList) {
        await deleteBrainDumpItem(item.id);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const diffSeconds = Math.round((Date.now() - timestamp) / 1000);
    if (diffSeconds < 60) return 'poco fa';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m fa`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h fa`;
    return new Date(timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto">
      {/* Top Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Inbox className="w-3.5 h-3.5 text-blue-500" />
            <span>Cattura & Triage Mentale</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 font-['Syne',sans-serif]">
            Inbox dei Pensieri
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Svuota la mente: trasforma i pensieri nei compiti dei tuoi ruoli o scartali in un clic.
          </p>
        </div>

        {activeRoles.length === 0 && (
          <button
            onClick={() => setActiveTab('config')}
            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            Configura ruoli prima di smistare
          </button>
        )}
      </div>

      {/* Quick In-Page Thought Capture Bar - Compact */}
      <form onSubmit={handleQuickAdd} className="relative">
        <input
          type="text"
          value={newThoughtText}
          onChange={(e) => setNewThoughtText(e.target.value)}
          placeholder="Aggiungi un pensiero al volo... (es. Pagare bolletta luce, Chiamare commercialista)"
          className="w-full pl-9 pr-20 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs"
        />
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <button
          type="submit"
          disabled={!newThoughtText.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
        >
          <Plus className="w-3 h-3" />
          <span>Salva</span>
        </button>
      </form>

      {/* Undo Banner */}
      {undoItem && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/80 rounded-xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <XCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              Pensiero scartato: <strong className="font-semibold">{undoItem.text}</strong>
            </span>
          </div>
          <button
            onClick={() => handleUndoDiscard(undoItem.id)}
            className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-md font-bold flex items-center gap-1 transition-colors text-[11px] shrink-0 shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Annulla</span>
          </button>
        </div>
      )}

      {/* Filter Tabs Bar - Compact */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium">
          <button
            onClick={() => setFilterStatus('inbox')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              filterStatus === 'inbox'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Da smistare</span>
            {inboxList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-bold">
                {inboxList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('converted')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              filterStatus === 'converted'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Convertiti in task</span>
            {convertedList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-semibold">
                {convertedList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('discarded')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              filterStatus === 'discarded'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Scartati</span>
            {discardedList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-semibold">
                {discardedList.length}
              </span>
            )}
          </button>
        </div>

        {filterStatus === 'discarded' && discardedList.length > 0 && (
          <button
            onClick={handleClearAllDiscarded}
            className="text-[11px] text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1 font-medium transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Svuota scartati</span>
          </button>
        )}
      </div>

      {/* ITEMS LIST - High Density & Compact */}
      <div className="space-y-2">
        {currentList.map((item) => {
          const selectedRoleId =
            selectedRoleByItem[item.id] || (activeRoles[0] ? activeRoles[0].id : '');
          const selectedCategory = selectedCategoryByItem[item.id] || 'important';
          const assignedRole = roles.find((r) => r.id === item.assignedRoleId);

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-3 shadow-2xs transition-all relative overflow-hidden ${
                item.status === 'inbox'
                  ? 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  : item.status === 'converted'
                  ? 'border-emerald-200/60 dark:border-emerald-950/50 bg-emerald-50/15 dark:bg-emerald-950/5'
                  : 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
              }`}
            >
              {/* Row 1: Thought Title, Metadata & Delete */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug break-words">
                      {item.text}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Right side delete / restore icon */}
                <div className="flex items-center gap-1 shrink-0 -mt-0.5 -mr-0.5">
                  {item.status === 'discarded' && (
                    <button
                      type="button"
                      onClick={() => restoreBrainDumpItem(item.id)}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      title="Ripristina nell'Inbox"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Ripristina</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteBrainDumpItem(item.id)}
                    title="Elimina definitivamente"
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: COMPACT INLINE TRIAGE STRIP (Only for Inbox items) */}
              {item.status === 'inbox' && (
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  {/* Selectors Group */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Role Chips */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5">
                        Ruolo:
                      </span>
                      {activeRoles.map((role) => {
                        const isSelected = selectedRoleId === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() =>
                              setSelectedRoleByItem((prev) => ({ ...prev, [item.id]: role.id }))
                            }
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all border ${
                              isSelected
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-bold shadow-2xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: role.color }}
                            />
                            <span className="truncate max-w-[100px]">{role.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-slate-200 dark:text-slate-800 hidden sm:inline">|</span>

                    {/* Triad Chips */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5">
                        Triade:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategoryByItem((prev) => ({ ...prev, [item.id]: 'important' }))
                        }
                        className={`px-2 py-0.5 rounded-lg text-[11px] transition-all border flex items-center gap-1 ${
                          selectedCategory === 'important'
                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium'
                        }`}
                      >
                        <Zap className="w-2.5 h-2.5 shrink-0" />
                        <span>Importante</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategoryByItem((prev) => ({ ...prev, [item.id]: 'quick' }))
                        }
                        className={`px-2 py-0.5 rounded-lg text-[11px] transition-all border flex items-center gap-1 ${
                          selectedCategory === 'quick'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-600 font-bold shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium'
                        }`}
                      >
                        <BatteryLow className="w-2.5 h-2.5 shrink-0" />
                        <span>Veloce</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategoryByItem((prev) => ({ ...prev, [item.id]: 'unblocker' }))
                        }
                        className={`px-2 py-0.5 rounded-lg text-[11px] transition-all border flex items-center gap-1 ${
                          selectedCategory === 'unblocker'
                            ? 'bg-blue-500 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium'
                        }`}
                      >
                        <Unlock className="w-2.5 h-2.5 shrink-0" />
                        <span>Sbloccante</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Actions: Discard & Convert */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleDiscard(item.id, item.text)}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1"
                      title="Scarta attività"
                    >
                      <XCircle className="w-3 h-3 text-slate-400 hover:text-red-500" />
                      <span>Scarta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConvert(item.id)}
                      disabled={!selectedRoleId}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <span>Converti in Task</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Info row for Converted items */}
              {item.status === 'converted' && assignedRole && (
                <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Convertito in task per <strong className="font-semibold text-slate-700 dark:text-slate-200">{assignedRole.name}</strong>
                  </span>
                  {item.assignedCategory && (
                    <span className="text-slate-400 font-mono text-[10px]">
                      ({item.assignedCategory === 'important' ? '⚡ Importante' : item.assignedCategory === 'quick' ? '🔋 Veloce' : '🔓 Sbloccante'})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty States - Compact */}
        {currentList.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-sm mx-auto space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-900/50">
              {filterStatus === 'inbox' ? (
                <Sparkles className="w-5 h-5" />
              ) : filterStatus === 'converted' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {filterStatus === 'inbox'
                  ? 'Inbox Svuotata! Mente Libera.'
                  : filterStatus === 'converted'
                  ? 'Nessun pensiero convertito'
                  : 'Nessun pensiero scartato'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {filterStatus === 'inbox'
                  ? 'Non hai pensieri in attesa. Premi "B" per aggiungerne uno in qualsiasi momento.'
                  : filterStatus === 'converted'
                  ? 'I pensieri convertiti in task compariranno qui.'
                  : 'I pensieri scartati finiscono qui.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

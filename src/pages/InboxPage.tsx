import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RoleIcon } from '../utils/icons';
import {
  Inbox,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
  Plus,
  Send,
  Zap,
  BatteryLow,
  Unlock,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import type { DecisionMode, BrainDumpStatus, Role } from '../types';

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

    if (!roleId) {
      return;
    }

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
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min fa`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} ore fa`;
    return new Date(timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Inbox className="w-3.5 h-3.5 text-blue-500" />
            <span>Cattura & Triage Mentale</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 font-['Syne',sans-serif]">
            Inbox dei Pensieri
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Svuota la mente: trasforma i pensieri catturati nei compiti dei tuoi ruoli o scartali in un clic.
          </p>
        </div>

        {activeRoles.length === 0 && (
          <button
            onClick={() => setActiveTab('config')}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Configura ruoli prima di smistare
          </button>
        )}
      </div>

      {/* Quick In-Page Thought Capture Bar */}
      <form onSubmit={handleQuickAdd} className="relative">
        <input
          type="text"
          value={newThoughtText}
          onChange={(e) => setNewThoughtText(e.target.value)}
          placeholder="Aggiungi un pensiero al volo... (es. Pagare bolletta luce, Chiamare commercialista)"
          className="w-full pl-11 pr-24 py-3.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs"
        />
        <Lightbulb className="w-4 h-4 text-amber-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <button
          type="submit"
          disabled={!newThoughtText.trim()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Salva</span>
        </button>
      </form>

      {/* Undo Banner */}
      {undoItem && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/80 rounded-2xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Pensiero scartato: <strong className="font-semibold">{undoItem.text}</strong>
            </span>
          </div>
          <button
            onClick={() => handleUndoDiscard(undoItem.id)}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg font-bold flex items-center gap-1 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Annulla</span>
          </button>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium">
          <button
            onClick={() => setFilterStatus('inbox')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              filterStatus === 'inbox'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Da smistare</span>
            {inboxList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-mono text-[11px]">
                {inboxList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('converted')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              filterStatus === 'converted'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Convertiti in task</span>
            {convertedList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                {convertedList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('discarded')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              filterStatus === 'discarded'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Scartati</span>
            {discardedList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                {discardedList.length}
              </span>
            )}
          </button>
        </div>

        {filterStatus === 'discarded' && discardedList.length > 0 && (
          <button
            onClick={handleClearAllDiscarded}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Svuota tutti gli scartati</span>
          </button>
        )}
      </div>

      {/* ITEMS LIST */}
      <div className="space-y-3.5">
        {currentList.map((item) => {
          const selectedRoleId =
            selectedRoleByItem[item.id] || (activeRoles[0] ? activeRoles[0].id : '');
          const selectedCategory = selectedCategoryByItem[item.id] || 'important';
          const assignedRole = roles.find((r) => r.id === item.assignedRoleId);

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all relative overflow-hidden space-y-3.5 ${
                item.status === 'inbox'
                  ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  : item.status === 'converted'
                  ? 'border-emerald-200/80 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
              }`}
            >
              {/* Item Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug break-words">
                    {item.text}
                  </h3>
                  {item.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                    <span>Catturato {formatDate(item.createdAt)}</span>
                    {item.status === 'converted' && assignedRole && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Assegnato a {assignedRole.name}</span>
                        </span>
                      </>
                    )}
                    {item.status === 'discarded' && (
                      <>
                        <span>·</span>
                        <span className="text-slate-400 font-medium">Scartato</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Permanent Delete Button */}
                <button
                  type="button"
                  onClick={() => deleteBrainDumpItem(item.id)}
                  title="Elimina definitivamente"
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* TRIAGE CONTROLS (Only for Inbox items) */}
              {item.status === 'inbox' && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    {/* Role Selector */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                        1. Scegli il Ruolo:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeRoles.map((role) => {
                          const isSelected = selectedRoleId === role.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() =>
                                setSelectedRoleByItem((prev) => ({ ...prev, [item.id]: role.id }))
                              }
                              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                                isSelected
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: role.color }}
                              />
                              <span className="truncate max-w-[120px]">{role.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Decision Category Selector */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                        2. Scegli la Triade:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCategoryByItem((prev) => ({ ...prev, [item.id]: 'important' }))
                          }
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
                            selectedCategory === 'important'
                              ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>Importante</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCategoryByItem((prev) => ({ ...prev, [item.id]: 'quick' }))
                          }
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
                            selectedCategory === 'quick'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-600 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                          }`}
                        >
                          <BatteryLow className="w-3 h-3" />
                          <span>Veloce</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCategoryByItem((prev) => ({ ...prev, [item.id]: 'unblocker' }))
                          }
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
                            selectedCategory === 'unblocker'
                              ? 'bg-blue-500 text-white border-blue-600 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                          }`}
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Sbloccante</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row: Convert vs Discard */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleDiscard(item.id, item.text)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Scarta attività</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConvert(item.id)}
                      disabled={!selectedRoleId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <span>Converti in Task</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* RESTORE CONTROLS (For Discarded items) */}
              {item.status === 'discarded' && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Questo pensiero è stato scartato</span>
                  <button
                    type="button"
                    onClick={() => restoreBrainDumpItem(item.id)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ripristina nell'Inbox</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty States */}
        {currentList.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-900/50">
              {filterStatus === 'inbox' ? (
                <Sparkles className="w-6 h-6" />
              ) : filterStatus === 'converted' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {filterStatus === 'inbox'
                  ? 'Inbox Svuotata! Mente Libera.'
                  : filterStatus === 'converted'
                  ? 'Nessun pensiero convertito finora'
                  : 'Nessun pensiero scartato'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {filterStatus === 'inbox'
                  ? 'Non hai pensieri in attesa di smistamento. Puoi usare il tasto rapido o premere "B" in qualsiasi momento per scaricare nuove idee.'
                  : filterStatus === 'converted'
                  ? 'I pensieri assegnati a un ruolo compariranno qui per consultazione.'
                  : 'I pensieri che decidi di non trasformare in compiti operativi finiscono qui.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lightbulb,
  X,
  Send,
  FileText,
  ListPlus,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Inbox,
  Sparkles,
  Zap,
} from 'lucide-react';

export const BrainDumpQuickModal: React.FC = () => {
  const {
    isBrainDumpModalOpen,
    openBrainDumpModal,
    closeBrainDumpModal,
    addBrainDumpItem,
    brainDumpItems,
    setActiveTab,
    discardBrainDumpItem,
  } = useApp();

  const [inputMode, setInputMode] = useState<'single' | 'multiline'>('single');
  const [singleText, setSingleText] = useState('');
  const [multilineText, setMultilineText] = useState('');
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isBrainDumpModalOpen) {
      setTimeout(() => {
        if (inputMode === 'single') {
          inputRef.current?.focus();
        } else {
          textareaRef.current?.focus();
        }
      }, 50);
    }
  }, [isBrainDumpModalOpen, inputMode]);

  const handleSingleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = singleText.trim();
    if (!trimmed) return;

    await addBrainDumpItem(trimmed);
    setSingleText('');
    setLastSavedMessage(`Salvato: "${trimmed.length > 28 ? trimmed.slice(0, 28) + '...' : trimmed}"`);
    setTimeout(() => setLastSavedMessage(null), 2500);
    inputRef.current?.focus();
  };

  const handleMultilineSubmit = async () => {
    const lines = multilineText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    for (const line of lines) {
      await addBrainDumpItem(line);
    }

    setMultilineText('');
    setLastSavedMessage(`Salvati ${lines.length} pensieri nell'Inbox!`);
    setTimeout(() => setLastSavedMessage(null), 3000);
  };

  const unreadCount = brainDumpItems.filter((i) => i.status === 'inbox').length;
  const recentItems = brainDumpItems.slice(0, 3);

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isBrainDumpModalOpen && (
        <button
          onClick={openBrainDumpModal}
          title="Brain Dump Rapido (Scorciatoia: tasto B)"
          aria-label="Apri Brain Dump"
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 px-3.5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-slate-700/50 dark:border-blue-400/30"
        >
          <div className="relative">
            <Lightbulb className="w-5 h-5 text-amber-300 transition-transform group-hover:rotate-12" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold tracking-tight hidden sm:inline">Brain Dump</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-800/90 dark:bg-blue-700/80 text-slate-300 dark:text-blue-100 rounded border border-slate-700/80 dark:border-blue-500/50">
            B
          </kbd>
        </button>
      )}

      {/* Modal Backdrop */}
      {isBrainDumpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/50 shadow-2xs">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Syne',sans-serif]">
                      Brain Dump Rapido
                    </h2>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-900">
                        {unreadCount} nell'Inbox
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Libera la mente all'istante: smisterai o scarterai più tardi.
                  </p>
                </div>
              </div>

              <button
                onClick={closeBrainDumpModal}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Chiudi (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-5 pt-3 flex items-center justify-between gap-2">
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setInputMode('single')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    inputMode === 'single'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Cattura Continua</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('multiline')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    inputMode === 'multiline'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Blocco Note Libero</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {inputMode === 'single' ? 'Premi Invio per salvare' : '1 riga = 1 pensiero'}
              </span>
            </div>

            {/* Body Form */}
            <div className="p-5 space-y-4">
              {inputMode === 'single' ? (
                <form onSubmit={handleSingleSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={singleText}
                      onChange={(e) => setSingleText(e.target.value)}
                      placeholder="Cosa ti passa per la testa adesso? Scrivi e premi Invio..."
                      className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-slate-900 dark:text-white pr-24 placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!singleText.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>Salva</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <textarea
                    ref={textareaRef}
                    rows={4}
                    value={multilineText}
                    onChange={(e) => setMultilineText(e.target.value)}
                    placeholder={`Incolla o scrivi il tuo flusso di coscienza...\nEs:\nComprare cavo HDMI\nRispondere alla mail del cliente\nRevisionare la presentazione per domani`}
                    className="w-full p-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 leading-relaxed font-sans"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {multilineText.split('\n').filter((l) => l.trim().length > 0).length} elementi rilevati
                    </span>
                    <button
                      type="button"
                      onClick={handleMultilineSubmit}
                      disabled={!multilineText.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>Salva tutte le righe nell'Inbox</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback Alert */}
              {lastSavedMessage && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{lastSavedMessage}</span>
                </div>
              )}

              {/* Recent Inbox Items Preview */}
              {recentItems.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Ultimi pensieri catturati</span>
                    <button
                      type="button"
                      onClick={() => {
                        closeBrainDumpModal();
                        setActiveTab('inbox');
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Vai al Desk di Triage</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {recentItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="line-clamp-1 text-slate-800 dark:text-slate-200 flex-1">
                          {item.text}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.status === 'inbox' && (
                            <button
                              type="button"
                              onClick={() => discardBrainDumpItem(item.id)}
                              className="text-[11px] px-2 py-0.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Scarta pensiero"
                            >
                              Scarta
                            </button>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              item.status === 'inbox'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : item.status === 'converted'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}
                          >
                            {item.status === 'inbox' ? 'In attesa' : item.status === 'converted' ? 'Task' : 'Scartato'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50/70 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Nessuna decisione richiesta adesso</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeBrainDumpModal();
                    setActiveTab('inbox');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Inbox className="w-3.5 h-3.5 text-blue-500" />
                  <span>Apri Inbox Completa</span>
                </button>
                <button
                  type="button"
                  onClick={closeBrainDumpModal}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white rounded-xl transition-colors"
                >
                  Fatto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

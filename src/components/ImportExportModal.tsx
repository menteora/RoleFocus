import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Download,
  Upload,
  RotateCcw,
  X,
  FileJson,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import type { ExportDataPayload } from '../types';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { exportBackup, importBackup, resetToFactoryDefaults, roles, timeSlots, tasks } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'reset'>('export');
  const [jsonString, setJsonString] = useState('');
  const [copied, setCopied] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportDataPayload | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleGenerateExport = async () => {
    try {
      const data = await exportBackup();
      const str = JSON.stringify(data, null, 2);
      setJsonString(str);
      return str;
    } catch (err) {
      setStatusMessage({ text: 'Errore durante la generazione dell\'export', isError: true });
      return null;
    }
  };

  const handleDownloadJson = async () => {
    const data = await exportBackup();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rolefocus_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ text: 'File di backup scaricato con successo!' });
  };

  const handleCopyToClipboard = async () => {
    let str = jsonString;
    if (!str) {
      const gen = await handleGenerateExport();
      if (gen) str = gen;
    }
    if (str) {
      await navigator.clipboard.writeText(str);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setStatusMessage({ text: 'Dati JSON copiati negli appunti!' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !Array.isArray(parsed.roles)) {
          throw new Error('Il file non contiene una struttura di ruoli valida.');
        }
        setImportPreview(parsed);
        setStatusMessage(null);
      } catch (err: unknown) {
        setStatusMessage({
          text: `Errore di lettura file JSON: ${err instanceof Error ? err.message : 'Formato non valido'}`,
          isError: true,
        });
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      await importBackup(importPreview, importMode);
      setStatusMessage({ text: 'Dati importati e ripristinati con successo!' });
      setImportPreview(null);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setStatusMessage({
        text: `Errore durante l'importazione: ${err instanceof Error ? err.message : 'Errore'}`,
        isError: true,
      });
    }
  };

  const handleReset = async () => {
    if (confirm('Sei sicuro di voler svuotare tutti i dati locali? Verranno eliminati tutti i ruoli, fasce orarie, task e sessioni registrate.')) {
      try {
        await resetToFactoryDefaults();
        setStatusMessage({ text: 'Database locale svuotato con successo!' });
        setTimeout(() => {
          onClose();
        }, 1000);
      } catch (err) {
        setStatusMessage({ text: 'Errore durante lo svuotamento', isError: true });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Gestione Dati & Backup (PouchDB)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3 gap-2">
          <button
            onClick={() => { setActiveSubTab('export'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'export'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta Backup</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('import'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'import'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importa JSON</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('reset'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'reset'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina Default</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              {statusMessage.isError ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Export View */}
          {activeSubTab === 'export' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1 border border-slate-200/60 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white">Riepilogo dati correnti:</div>
                <div>· {roles.length} Ruoli configurati</div>
                <div>· {timeSlots.length} Fasce orarie associate</div>
                <div>· {tasks.length} Task e note salvate</div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={handleDownloadJson}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica File JSON (.json)</span>
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="py-2.5 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiato!' : 'Copia Testo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Import View */}
          {activeSubTab === 'import' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!importPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50/20 transition-all"
                >
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Clicca qui per selezionare il file JSON di backup
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Supporta file esportati da RoleFocus
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-blue-900 dark:text-blue-300">File valido rilevato:</div>
                    <div className="text-blue-800 dark:text-blue-200">
                      · {importPreview.roles?.length || 0} Ruoli da importare<br />
                      · {importPreview.timeSlots?.length || 0} Fasce orarie<br />
                      · {importPreview.tasks?.length || 0} Task registrati
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-blue-600"
                      />
                      <span>Sostituisci tutto (consigliato)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-blue-600"
                      />
                      <span>Unisci a dati esistenti</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setImportPreview(null)}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs"
                    >
                      Annulla file
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Conferma e Applica Importazione</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset View */}
          {activeSubTab === 'reset' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                <div className="font-semibold mb-1">Attenzione:</div>
                Questa operazione svuoterà l'intero database locale IndexedDB, rimuovendo tutti i ruoli, fasce orarie, task e sessioni memorizzate. Usa questa opzione per ripartire da zero o prima di importare un nuovo file di backup.
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Svuota Database Locale</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

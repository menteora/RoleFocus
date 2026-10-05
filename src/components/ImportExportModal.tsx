import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CouchDBConfigSection } from './CouchDBConfigSection';
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
  Server,
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

  const [activeSubTab, setActiveSubTab] = useState<'couchdb' | 'export' | 'import' | 'reset'>('couchdb');
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
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as ExportDataPayload;
        if (!parsed || !Array.isArray(parsed.roles)) {
          throw new Error('Formato non valido: manca l\'array dei ruoli.');
        }
        setImportPreview(parsed);
        setStatusMessage({ text: `File "${file.name}" caricato correttamente. Verifica l'anteprima.` });
      } catch (err: any) {
        setStatusMessage({
          text: `Errore di lettura del file JSON: ${err.message || 'JSON non valido'}`,
          isError: true,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      await importBackup(importPreview, importMode);
      setStatusMessage({
        text: `Dati importati con successo (${importMode === 'replace' ? 'Sostituzione' : 'Unione'})!`,
      });
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setStatusMessage({
        text: `Errore durante l'importazione: ${err.message}`,
        isError: true,
      });
    }
  };

  const handleConfirmReset = async () => {
    if (confirm('Sei assolutamente sicuro di voler cancellare tutti i ruoli, orari e sessioni?')) {
      try {
        await resetToFactoryDefaults();
        setStatusMessage({ text: 'Applicazione ripristinata allo stato iniziale pulito.' });
      } catch (err: any) {
        setStatusMessage({ text: `Errore durante il ripristino: ${err.message}`, isError: true });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Database & Sincronizzazione (PouchDB / CouchDB)
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
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3 gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => { setActiveSubTab('couchdb'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeSubTab === 'couchdb'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Server CouchDB</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('export'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeSubTab === 'export'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta JSON</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('import'); setStatusMessage(null); }}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
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
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeSubTab === 'reset'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
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

          {/* CouchDB Server View */}
          {activeSubTab === 'couchdb' && <CouchDBConfigSection />}

          {/* Export View */}
          {activeSubTab === 'export' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1 border border-slate-200/60 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white">Riepilogo dati correnti:</div>
                <div>· {roles.length} Ruoli configurati</div>
                <div>· {timeSlots.length} Fasce orarie associate</div>
                <div>· {tasks.length} Task e note salvate</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDownloadJson}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica File JSON (.json)</span>
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiato!' : 'Copia negli Appunti'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Import View */}
          {activeSubTab === 'import' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <label className="cursor-pointer text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline block">
                  <span>Seleziona file di backup JSON</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Supporta i file esportati da questa app
                </span>
              </div>

              {importPreview && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Anteprima dati da importare:</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      v{importPreview.version} · {importPreview.exportedAt?.slice(0, 10)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                    <div>· {importPreview.roles?.length || 0} Ruoli</div>
                    <div>· {importPreview.timeSlots?.length || 0} Fasce orarie</div>
                    <div>· {importPreview.tasks?.length || 0} Task registrati</div>
                    <div>· {importPreview.timerSessions?.length || 0} Sessioni di storico</div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Modalità di importazione:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        importMode === 'replace'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-blue-600"
                        />
                        <span>Sostituisci tutto</span>
                      </label>

                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        importMode === 'merge'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="text-blue-600"
                        />
                        <span>Unisci ai correnti</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors mt-2"
                  >
                    Conferma e Applica Importazione
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reset View */}
          {activeSubTab === 'reset' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-2 text-red-700 dark:text-red-300">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Attenzione: Azione Irreversibile</span>
                </div>
                <p>
                  Il ripristino cancellerà permanentemente tutti i ruoli, orari, task personalizzati e storico sessioni dal database locale IndexedDB / PouchDB.
                </p>
              </div>

              <button
                onClick={handleConfirmReset}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ripristina Database a Stato Iniziale</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

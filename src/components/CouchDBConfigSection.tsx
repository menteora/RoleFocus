import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { CouchDBSettings } from '../types';
import {
  Server,
  Key,
  User,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Activity,
  ShieldCheck,
  Radio,
  Download,
  Upload,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Zap,
  Terminal,
  HelpCircle,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Database,
  Info,
} from 'lucide-react';
import type { RemoteDatabaseInfo } from '../db/db';

export const CouchDBConfigSection: React.FC = () => {
  const {
    settings,
    updateCouchDBSettings,
    testCouchDB,
    syncCouchDBNow,
    initCouchDBDatabases,
    checkCouchDBDatabases,
    couchDBSyncState,
    couchDBSyncError,
    syncProgress,
    clearSyncLogs,
  } = useApp();

  const currentConfig: CouchDBSettings = settings.couchdb || {
    enabled: false,
    endpoint: '',
    username: '',
    password: '',
    databasePrefix: 'rolefocus_',
    autoSync: true,
    syncMode: 'smart',
  };

  const [formState, setFormState] = useState<CouchDBSettings>(currentConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null);
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedContent, setPastedContent] = useState('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showDiagnosticExplainer, setShowDiagnosticExplainer] = useState(true);

  // CouchDB Server-side Databases Inspection & Init
  const [remoteDbs, setRemoteDbs] = useState<RemoteDatabaseInfo[] | null>(null);
  const [isCheckingDbs, setIsCheckingDbs] = useState(false);
  const [isInitializingDbs, setIsInitializingDbs] = useState(false);
  const [initResult, setInitResult] = useState<{
    success: boolean;
    message: string;
    createdCount: number;
    existingCount: number;
    failedCount: number;
  } | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);
  const [showManualServerGuide, setShowManualServerGuide] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings.couchdb) {
      setFormState({
        ...settings.couchdb,
        syncMode: settings.couchdb.syncMode || 'smart',
      });
    }
  }, [settings.couchdb]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updateCouchDBSettings(formState);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testCouchDB(formState);
      setTestResult(res);
      if (res.databases) {
        setRemoteDbs(res.databases);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Errore imprevisto durante il test di connessione.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCheckDatabases = async () => {
    if (!formState.endpoint) return;
    setIsCheckingDbs(true);
    try {
      const dbs = await checkCouchDBDatabases(formState);
      setRemoteDbs(dbs);
    } catch {
      // ignore
    } finally {
      setIsCheckingDbs(false);
    }
  };

  const handleInitDatabases = async () => {
    if (!formState.endpoint) return;
    setIsInitializingDbs(true);
    setInitResult(null);
    try {
      await updateCouchDBSettings(formState);
      const res = await initCouchDBDatabases(formState);
      setInitResult(res);
      if (res.databases) {
        setRemoteDbs(res.databases);
      }
    } catch (err: any) {
      setInitResult({
        success: false,
        message: err.message || 'Errore durante la creazione dei database.',
        createdCount: 0,
        existingCount: 0,
        failedCount: 7,
      });
    } finally {
      setIsInitializingDbs(false);
    }
  };

  const handleCopyCurl = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCurl(id);
      setTimeout(() => setCopiedCurl(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleManualSync = async () => {
    setIsSyncingManual(true);
    try {
      await updateCouchDBSettings(formState);
      const res = await syncCouchDBNow();
      setTestResult({
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Errore durante la sincronizzazione.',
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  // -------------------------------------------------------------
  // EXPORT CREDENTIALS & CONFIG
  // -------------------------------------------------------------
  const handleExportCredentialsFile = () => {
    const payload = {
      type: 'rolefocus_couchdb_config',
      exportedAt: new Date().toISOString(),
      couchdb: {
        endpoint: formState.endpoint,
        username: formState.username || '',
        password: formState.password || '',
        databasePrefix: formState.databasePrefix || 'rolefocus_',
        autoSync: formState.autoSync,
        syncMode: formState.syncMode || 'smart',
        enabled: formState.enabled,
      },
    };

    const str = JSON.stringify(payload, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `couchdb_credentials_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setImportStatus({
      success: true,
      message: 'File credenziali CouchDB scaricato con successo!',
    });
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleCopyCredentialsJson = async () => {
    const payload = {
      endpoint: formState.endpoint,
      username: formState.username || '',
      password: formState.password || '',
      databasePrefix: formState.databasePrefix || 'rolefocus_',
      syncMode: formState.syncMode || 'smart',
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2000);
      setImportStatus({
        success: true,
        message: 'Credenziali JSON copiate negli appunti!',
      });
      setTimeout(() => setImportStatus(null), 3000);
    } catch {
      // ignore
    }
  };

  // -------------------------------------------------------------
  // IMPORT CREDENTIALS & CONFIG
  // -------------------------------------------------------------
  const parseAndApplyCredentials = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    try {
      // 1. Try parsing JSON
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        const data = parsed.couchdb || parsed;

        if (!data.endpoint && !data.username && !data.password) {
          throw new Error('Nessun campo endpoint o credenziale valido trovato nel JSON.');
        }

        const newConfig: CouchDBSettings = {
          ...formState,
          enabled: true,
          endpoint: data.endpoint || formState.endpoint || '',
          username: data.username !== undefined ? data.username : formState.username,
          password: data.password !== undefined ? data.password : formState.password,
          databasePrefix: data.databasePrefix || formState.databasePrefix || 'rolefocus_',
          autoSync: data.autoSync !== undefined ? data.autoSync : true,
          syncMode: data.syncMode || formState.syncMode || 'smart',
        };

        setFormState(newConfig);
        updateCouchDBSettings(newConfig);
        setImportStatus({
          success: true,
          message: 'Credenziali CouchDB importate e applicate con successo!',
        });
        setShowPasteModal(false);
        setPastedContent('');
        return;
      }

      // 2. Try parsing URL format: http://username:password@hostname:5984
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const urlObj = new URL(trimmed);
        const user = decodeURIComponent(urlObj.username || '');
        const pass = decodeURIComponent(urlObj.password || '');
        urlObj.username = '';
        urlObj.password = '';
        const cleanEndpoint = urlObj.origin;

        const newConfig: CouchDBSettings = {
          ...formState,
          enabled: true,
          endpoint: cleanEndpoint,
          username: user || formState.username,
          password: pass || formState.password,
          syncMode: formState.syncMode || 'smart',
        };

        setFormState(newConfig);
        updateCouchDBSettings(newConfig);
        setImportStatus({
          success: true,
          message: 'URL e credenziali estratti e applicati con successo!',
        });
        setShowPasteModal(false);
        setPastedContent('');
        return;
      }

      throw new Error('Formato non riconosciuto. Inserisci un JSON o un URL valido.');
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Errore di importazione: ${err.message}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseAndApplyCredentials(text);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const getStatusBadge = () => {
    if (!formState.enabled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Disattivato (Solo Locale)
        </span>
      );
    }

    switch (couchDBSyncState) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Connesso & Sincronizzato
            {syncProgress?.lastSyncDurationMs ? (
              <span className="text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
                ({syncProgress.lastSyncDurationMs}ms)
              </span>
            ) : null}
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            Sincronizzazione in corso...
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-500" />
            Connessione in corso...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            Errore di sincronizzazione
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            In attesa
          </span>
        );
    }
  };

  const collectionsList = syncProgress?.collections
    ? Object.values(syncProgress.collections)
    : [];

  return (
    <div className="space-y-5">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              CouchDB Server Sync (Bidirezionale Solida)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sincronizza ruoli, fasce, task, timer e brain dump in tempo reale con il tuo server CouchDB.
            </p>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {/* Diagnostic & Architecture Explainer Box */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/40 border border-blue-200/80 dark:border-blue-900/50 rounded-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Come funziona la nuova Sincronizzazione Solida & Trasparente
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowDiagnosticExplainer(!showDiagnosticExplainer)}
            className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            {showDiagnosticExplainer ? 'Comprimi' : 'Mostra dettagli'}
          </button>
        </div>

        {showDiagnosticExplainer && (
          <div className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 space-y-1.5 border-t border-blue-100 dark:border-blue-950/80 pt-2">
            <p>
              <strong className="text-slate-800 dark:text-slate-100">Perché prima ci metteva tanto o sembrava bloccato?</strong>{' '}
              I browser web impongono un limite rigido di <strong>massimo 6 connessioni HTTP/1.1 contemporanee</strong> verso lo stesso dominio. Avendo 7 database (ruoli, fasce, task, sessioni, timer, braindump, impostazioni), aprendo 7 streaming continui il 7° rimaneva letteralmente accodato e bloccato in attesa, provocando timeout, continue riconnessioni e lo spinner perenne di <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded font-mono text-[10px]">Sync...</code>.
            </p>
            <p>
              <strong className="text-emerald-700 dark:text-emerald-400">La soluzione Solida & Reattiva (Smart Sync):</strong>{' '}
              Invece di saturare i socket di rete, l'app effettua la sincronizzazione all'avvio, raggruppa le modifiche locali con un breve buffer (debounce di 1.2s) ed esegue un push/pull rapido in parallelo che <strong>si completa in ~300ms</strong>, chiudendo i socket e mantenendo l'app scattante.
            </p>
          </div>
        )}
      </div>

      {/* Real-time Telemetry & Granular Database Matrix (Visible if CouchDB is configured) */}
      {formState.enabled && (
        <div className="space-y-3 p-3.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Telemetria & Monitoraggio 7 Database in Tempo Reale
              </h4>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>{syncProgress?.detailedMessage || 'In attesa'}</span>
              {couchDBSyncState === 'syncing' && (
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {syncProgress?.percent || 0}%
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar during sync */}
          {couchDBSyncState === 'syncing' && (
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, syncProgress?.percent || 0)}%` }}
              />
            </div>
          )}

          {/* 7 Collections Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
            {collectionsList.map((col) => {
              const isSyncing = col.status === 'syncing';
              const isOk = col.status === 'ok';
              const isErr = col.status === 'error';

              return (
                <div
                  key={col.key}
                  className={`p-2.5 rounded-xl border text-xs transition-colors flex flex-col justify-between gap-1.5 ${
                    isErr
                      ? 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
                      : isSyncing
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                      : isOk
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
                      : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold truncate text-[11px]">{col.label}</span>
                    {isSyncing ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                    ) : isOk ? (
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : isErr ? (
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                    ) : (
                      <Database className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span title="Documenti scaricati dal server CouchDB" className="flex items-center gap-0.5">
                      <ArrowDownLeft className="w-2.5 h-2.5 text-blue-500" />
                      {col.docsRead}
                    </span>
                    <span title="Documenti inviati al server CouchDB" className="flex items-center gap-0.5">
                      <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" />
                      {col.docsWritten}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Logs Console */}
          <div className="mt-3 bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] border border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[10px]">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Terminal className="w-3 h-3 text-blue-400" />
                Registro Attività Sincronizzazione (Live Log)
              </span>
              <button
                type="button"
                onClick={clearSyncLogs}
                className="hover:text-red-400 transition-colors flex items-center gap-1 text-[10px]"
                title="Pulisci log eventi"
              >
                <Trash2 className="w-3 h-3" />
                <span>Pulisci</span>
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {syncProgress?.logs && syncProgress.logs.length > 0 ? (
                syncProgress.logs.map((log) => {
                  const time = new Date(log.timestamp).toLocaleTimeString();
                  const color =
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : 'text-slate-300';

                  return (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-500 text-[10px] shrink-0 select-none">[{time}]</span>
                      <span className={`${color} break-all`}>{log.message}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 italic py-1">Nessun evento registrato finora.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Import / Export Credentials Bar */}
      <div className="p-3 bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <Key className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Dati di Autenticazione:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* File input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Import file button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Importa credenziali da file JSON"
          >
            <Upload className="w-3 h-3 text-blue-500" />
            <span>Importa File</span>
          </button>

          {/* Paste button */}
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Incolla URL o credenziali JSON"
          >
            <FileCode className="w-3 h-3 text-indigo-500" />
            <span>Incolla URL / JSON</span>
          </button>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopyCredentialsJson}
            disabled={!formState.endpoint}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Copia credenziali attuali come JSON"
          >
            {copiedCreds ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-slate-500" />
            )}
            <span>{copiedCreds ? 'Copiato!' : 'Copia JSON'}</span>
          </button>

          {/* Export file button */}
          <button
            type="button"
            onClick={handleExportCredentialsFile}
            disabled={!formState.endpoint}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Scarica file di configurazione con credenziali"
          >
            <Download className="w-3 h-3 text-emerald-500" />
            <span>Esporta File</span>
          </button>
        </div>
      </div>

      {/* Import Feedback Banner */}
      {importStatus && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
            importStatus.success
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {importStatus.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span className="font-medium">{importStatus.message}</span>
        </div>
      )}

      {/* Paste Credentials Modal */}
      {showPasteModal && (
        <div className="p-4 bg-white dark:bg-slate-800 border-2 border-blue-500/80 rounded-xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-blue-500" />
              <span>Incolla URL CouchDB o JSON Credenziali</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Supporta sia formato JSON completo, sia un URL comprensivo di credenziali (es.{' '}
            <code className="text-blue-500 font-mono">http://user:pass@192.168.1.100:5984</code>).
          </p>

          <textarea
            value={pastedContent}
            onChange={(e) => setPastedContent(e.target.value)}
            placeholder='Incolla qui il JSON o l&apos;URL...'
            rows={4}
            className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => parseAndApplyCredentials(pastedContent)}
              disabled={!pastedContent.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Applica Credenziali</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Enable / Disable Master Switch */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Abilita Sincronizzazione CouchDB
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Quando disabilitato, l&apos;applicazione lavora esclusivamente in locale su IndexedDB/PouchDB.
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formState.enabled}
              onChange={(e) => setFormState((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Sync Mode Selector (Smart Sync vs Live Replication) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Modalità di Sincronizzazione:</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Smart Sync Option (Recommended) */}
            <button
              type="button"
              onClick={() => setFormState((prev) => ({ ...prev, syncMode: 'smart' }))}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                (formState.syncMode || 'smart') === 'smart'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Sincronizzazione Intelligente
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Consigliata
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Ultra-veloce (~300ms). Sincronizza subito all&apos;avvio, su ogni salvataggio con debounce e al rientro nella scheda. <strong>Nessun socket bloccato</strong>.
              </p>
            </button>

            {/* Live Replication Option */}
            <button
              type="button"
              onClick={() => setFormState((prev) => ({ ...prev, syncMode: 'live' }))}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                formState.syncMode === 'live'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Replicazione Continua Live
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Mantiene aperti 7 canali di streaming HTTP <code className="font-mono text-[10px]">_changes</code>. Richiede HTTP/2 o server senza limiti di socket simultanei.
              </p>
            </button>
          </div>
        </div>

        {/* Server Endpoint URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Endpoint Server CouchDB (URL)</span>
          </label>
          <input
            type="url"
            value={formState.endpoint}
            onChange={(e) => setFormState((prev) => ({ ...prev, endpoint: e.target.value }))}
            placeholder="http://localhost:5984 o https://couchdb.tuodominio.it"
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
            required={formState.enabled}
          />
          <p className="text-[10px] text-slate-400">
            Assicurati che il <strong>CORS</strong> sia abilitato su CouchDB per l&apos;origine di questa applicazione.
          </p>
        </div>

        {/* Username & Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Username (Autenticazione)</span>
            </label>
            <input
              type="text"
              value={formState.username || ''}
              onChange={(e) => setFormState((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="es. admin o utente"
              autoComplete="username"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formState.password || ''}
                onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-3 pr-9 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Database Prefix & AutoSync Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Prefisso Database</span>
            </label>
            <input
              type="text"
              value={formState.databasePrefix || 'rolefocus_'}
              onChange={(e) => setFormState((prev) => ({ ...prev, databasePrefix: e.target.value }))}
              placeholder="rolefocus_"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-400">
              Crea database remoti come <code className="text-blue-500 font-mono">{formState.databasePrefix || 'rolefocus_'}roles</code>, <code className="text-blue-500 font-mono">{formState.databasePrefix || 'rolefocus_'}tasks</code>.
            </p>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formState.autoSync}
                onChange={(e) => setFormState((prev) => ({ ...prev, autoSync: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Sincronizzazione Automatica
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Sincronizza automaticamente in background
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* CouchDB Server-Side Databases & Initialization Box */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Database sul Server CouchDB (7 Collezioni)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  CouchDB richiede che ogni database esista fisicamente sul server prima della sincronizzazione.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCheckDatabases}
                disabled={isCheckingDbs || !formState.endpoint}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                <Activity className={`w-3 h-3 ${isCheckingDbs ? 'animate-spin' : ''}`} />
                <span>{isCheckingDbs ? 'Controllo...' : 'Verifica Database'}</span>
              </button>

              <button
                type="button"
                onClick={handleInitDatabases}
                disabled={isInitializingDbs || !formState.endpoint}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-[11px] font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40"
              >
                <Database className={`w-3 h-3 ${isInitializingDbs ? 'animate-spin' : ''}`} />
                <span>{isInitializingDbs ? 'Creazione in corso...' : 'Inizializza su CouchDB'}</span>
              </button>
            </div>
          </div>

          {/* Database Init Result Message */}
          {initResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                initResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              }`}
            >
              {initResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium leading-relaxed">{initResult.message}</p>
              </div>
            </div>
          )}

          {/* Databases Status Grid (if checked or initialized) */}
          {remoteDbs && remoteDbs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {remoteDbs.map((dbInfo) => (
                <div
                  key={dbInfo.key}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                    dbInfo.exists
                      ? 'bg-white dark:bg-slate-900/60 border-emerald-200/80 dark:border-emerald-900/60'
                      : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {dbInfo.label}
                      </span>
                      {dbInfo.key === 'braindump' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          Inbox
                        </span>
                      )}
                    </div>
                    <code className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                      {dbInfo.name}
                    </code>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                      dbInfo.exists
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {dbInfo.exists ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Pronto
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-2.5 h-2.5" />
                        Mancante
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Server-Side Guide: Fauxton & Curl */}
          <div className="border-t border-slate-200/70 dark:border-slate-700/70 pt-2.5">
            <button
              type="button"
              onClick={() => setShowManualServerGuide(!showManualServerGuide)}
              className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Guida: come creare i database a mano lato server (Fauxton o curl)
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                {showManualServerGuide ? 'Nascondi' : 'Mostra guida'}
              </span>
            </button>

            {showManualServerGuide && (
              <div className="mt-2.5 p-3 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 text-[11px] text-slate-600 dark:text-slate-300">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    Perché serve crearli lato server?
                  </h5>
                  <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
                    CouchDB non crea automaticamente database via browser se l'utente non ha ruolo{' '}
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">_admin</code>{' '}
                    o se il CORS del server CouchDB non abilita il metodo HTTP <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">PUT</code>.
                    Se hai creato in passato solo ruoli e task, il database per il Brain Dump (
                    <code className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-1 py-0.5 rounded font-mono text-[10px]">
                      {(formState.databasePrefix || 'rolefocus_')}braindump
                    </code>
                    ) va creato una volta sola sul server.
                  </p>
                </div>

                {/* Option 1: Fauxton Web GUI */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Metodo 1: Dall'interfaccia grafica Web Fauxton
                  </span>
                  <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-500 dark:text-slate-400 text-[10px]">
                    <li>
                      Apri nel browser:{' '}
                      <a
                        href={formState.endpoint ? `${formState.endpoint.replace(/\/+$/, '')}/_utils/` : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-mono underline"
                      >
                        {formState.endpoint ? `${formState.endpoint.replace(/\/+$/, '')}/_utils/` : 'http://tuo-couchdb:5984/_utils/'}
                      </a>
                    </li>
                    <li>Accedi con le tue credenziali di amministratore CouchDB.</li>
                    <li>Clicca sul pulsante arancione in alto a destra <strong>"Create Database"</strong>.</li>
                    <li>
                      Inserisci come nome:{' '}
                      <code className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">
                        {(formState.databasePrefix || 'rolefocus_')}braindump
                      </code>
                    </li>
                    <li>Seleziona "Non-partitioned" e clicca <strong>Create</strong>.</li>
                  </ol>
                </div>

                {/* Option 2: Curl Commands */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Metodo 2: Da Terminale con curl (Crea solo Brain Dump)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const ep = formState.endpoint ? formState.endpoint.trim().replace(/\/+$/, '') : 'http://localhost:5984';
                        const pfx = formState.databasePrefix?.trim() || 'rolefocus_';
                        const u = formState.username || 'admin';
                        const p = formState.password || 'password';
                        let hostWithAuth = ep;
                        try {
                          const uo = new URL(ep);
                          hostWithAuth = `${uo.protocol}//${u}:${p}@${uo.host}`;
                        } catch {
                          hostWithAuth = ep.replace('://', `://${u}:${p}@`);
                        }
                        handleCopyCurl(`curl -X PUT ${hostWithAuth}/${pfx}braindump`, 'curl-single');
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1"
                    >
                      {copiedCurl === 'curl-single' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copia comando</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[10px] font-mono overflow-x-auto select-all">
                    curl -X PUT {(formState.endpoint ? formState.endpoint.trim().replace(/\/+$/, '') : 'http://localhost:5984').replace('://', `://${formState.username || 'admin'}:${formState.password ? '••••' : 'password'}@`)}/{(formState.databasePrefix || 'rolefocus_')}braindump
                  </pre>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Comando per creare tutti e 7 i database in una volta sola:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const ep = formState.endpoint ? formState.endpoint.trim().replace(/\/+$/, '') : 'http://localhost:5984';
                        const pfx = formState.databasePrefix?.trim() || 'rolefocus_';
                        const u = formState.username || 'admin';
                        const p = formState.password || 'password';
                        let hostWithAuth = ep;
                        try {
                          const uo = new URL(ep);
                          hostWithAuth = `${uo.protocol}//${u}:${p}@${uo.host}`;
                        } catch {
                          hostWithAuth = ep.replace('://', `://${u}:${p}@`);
                        }
                        const cmd = `for db in roles slots tasks sessions timer braindump settings; do curl -X PUT ${hostWithAuth}/${pfx}$db; done`;
                        handleCopyCurl(cmd, 'curl-batch');
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1"
                    >
                      {copiedCurl === 'curl-batch' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copia comando batch</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[10px] font-mono overflow-x-auto select-all">
                    for db in roles slots tasks sessions timer braindump settings; do curl -X PUT {(formState.endpoint ? formState.endpoint.trim().replace(/\/+$/, '') : 'http://localhost:5984').replace('://', `://${formState.username || 'admin'}:${formState.password ? '••••' : 'password'}@`)}/{(formState.databasePrefix || 'rolefocus_')}$db; done
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Result Message Banner */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium leading-relaxed">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* CouchDB Live Error Banner */}
        {couchDBSyncState === 'error' && couchDBSyncError && !testResult && (
          <div className="p-3 rounded-xl border bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Errore Sincronizzazione:</span>
              <p className="text-[11px] leading-relaxed">{couchDBSyncError}</p>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !formState.endpoint}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {isTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5" />
              )}
              <span>{isTesting ? 'Verifica in corso...' : 'Test Connessione'}</span>
            </button>

            <button
              type="button"
              onClick={handleInitDatabases}
              disabled={isInitializingDbs || !formState.endpoint}
              className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 disabled:opacity-40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {isInitializingDbs ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              <span>{isInitializingDbs ? 'Inizializzo...' : 'Inizializza Database'}</span>
            </button>

            {formState.enabled && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncingManual || !formState.endpoint}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingManual ? 'animate-spin' : ''}`} />
                <span>{isSyncingManual ? 'Sincronizzo...' : 'Sincronizza Ora'}</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Impostazioni Salvate!</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Salva Configurazione</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

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
} from 'lucide-react';

export const CouchDBConfigSection: React.FC = () => {
  const {
    settings,
    updateCouchDBSettings,
    testCouchDB,
    syncCouchDBNow,
    couchDBSyncState,
    couchDBSyncError,
  } = useApp();

  const currentConfig: CouchDBSettings = settings.couchdb || {
    enabled: false,
    endpoint: '',
    username: '',
    password: '',
    databasePrefix: 'rolefocus_',
    autoSync: true,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings.couchdb) {
      setFormState(settings.couchdb);
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
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Errore imprevisto durante il test di connessione.',
      });
    } finally {
      setIsTesting(false);
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connesso & Sincronizzato
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
            Sincronizzazione in corso...
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Radio className="w-3 h-3 animate-pulse text-amber-500" />
            Connessione in corso...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-3 h-3 text-red-500" />
            Errore di connessione
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
              CouchDB Server Sync (Bidirezionale)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sincronizza ruoli, fasce, task e timer in tempo reale con il tuo server CouchDB remoto o locale.
            </p>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

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
            title="Incolla JSON o URL CouchDB"
          >
            <FileCode className="w-3 h-3 text-indigo-500" />
            <span>Incolla JSON / URL</span>
          </button>

          {/* Export file button */}
          <button
            type="button"
            onClick={handleExportCredentialsFile}
            disabled={!formState.endpoint}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Scarica file JSON con endpoint e credenziali"
          >
            <Download className="w-3 h-3 text-emerald-500" />
            <span>Esporta File</span>
          </button>

          {/* Copy credentials button */}
          <button
            type="button"
            onClick={handleCopyCredentialsJson}
            disabled={!formState.endpoint}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Copia configurazione JSON negli appunti"
          >
            {copiedCreds ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
            <span>{copiedCreds ? 'Copiato!' : 'Copia'}</span>
          </button>
        </div>
      </div>

      {/* Import / Export Notification Banner */}
      {importStatus && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs transition-all ${
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
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* Paste Credentials Flyout Modal */}
      {showPasteModal && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Incolla Stringa JSON o URL con Credenziali
            </span>
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Annulla
            </button>
          </div>

          <textarea
            value={pastedContent}
            onChange={(e) => setPastedContent(e.target.value)}
            rows={3}
            placeholder='Es. {"endpoint":"http://localhost:5984","username":"admin","password":"segreta"} oppure http://admin:password@server.com:5984'
            className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              Chiudi
            </button>
            <button
              type="button"
              onClick={() => parseAndApplyCredentials(pastedContent)}
              disabled={!pastedContent.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Applica Credenziali
            </button>
          </div>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Enable / Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block cursor-pointer">
              Abilita Sincronizzazione Remota CouchDB
            </label>
            <span className="text-[11px] text-slate-400 block">
              Se disabilitata, tutti i dati rimangono comunque salvati in locale su IndexedDB via PouchDB.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFormState((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              formState.enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                formState.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Server Endpoint */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>Endpoint URL del Server CouchDB</span>
            <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={formState.endpoint}
            onChange={(e) => setFormState((prev) => ({ ...prev, endpoint: e.target.value }))}
            placeholder="http://localhost:5984 oppure https://couchdb.tuodominio.it"
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
          />
          <p className="text-[10px] text-slate-400">
            Consiglio: assicurati che sul tuo CouchDB sia abilitato il <strong>CORS</strong> per consentire le chiamate dal browser (porta 5984 / 443).
          </p>
        </div>

        {/* Credentials (Username & Password) */}
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
                  Live Auto-Sync (Tempo Reale)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Replica istantanea continua bidirezionale
                </span>
              </div>
            </label>
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
              <span className="font-bold block">Errore Sincronizzazione Live:</span>
              <p className="text-[11px] leading-relaxed">{couchDBSyncError}</p>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
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

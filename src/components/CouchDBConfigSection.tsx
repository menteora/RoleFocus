import React, { useState, useEffect } from 'react';
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
  Zap,
  Activity,
  ShieldCheck,
  Radio,
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
      // First save configuration if modified
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

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { SimulatedTimeBar } from './components/SimulatedTimeBar';
import { ImportExportModal } from './components/ImportExportModal';
import { NowPage } from './pages/NowPage';
import { TimelinePage } from './pages/TimelinePage';
import { ConfigPage } from './pages/ConfigPage';
import { HistoryPage } from './pages/HistoryPage';

function MainAppShell() {
  const { activeTab, isInitialized } = useApp();
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [showTimeSimulator, setShowTimeSimulator] = useState(false);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>Inizializzazione database locale IndexedDB...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Header
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onToggleTimeSimulation={() => setShowTimeSimulator((prev) => !prev)}
      />

      {showTimeSimulator && <SimulatedTimeBar />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'now' && <NowPage />}
        {activeTab === 'timeline' && <TimelinePage />}
        {activeTab === 'config' && <ConfigPage />}
        {activeTab === 'history' && <HistoryPage />}
      </main>

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppShell />
    </AppProvider>
  );
}

# Brain Dump & Pulizia Amministrativa Task in RoleFocus

Questo piano integra due funzionalità essenziali per la gestione del carico mentale e il mantenimento di un database snello e performante:
1. **Brain Dump & Inbox Triage**: cattura rapida di pensieri e interruzioni senza spezzare il flusso di lavoro del timer, con triage per ruolo, triade e scarto immediato.
2. **Strumento Amministrativo di Pulizia Dati**: vista dedicata per l'eliminazione mirata in blocco dei **task chiusi/completati** più vecchi di una soglia temporale configurabile (in ore, giorni o settimane), con anteprima di sicurezza e conteggio in tempo reale.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisioni confermate ed evolute con il feedback utente:
> - **Brain Dump - Punti di Accesso**: Pulsante di cattura rapida sempre accessibile (scorciatoia + floating trigger) + Tab dedicata **"Inbox"** nella barra di navigazione con badge contatore.
> - **Brain Dump - Modalità di Inserimento**: Input continuo riga-per-riga (premendo `Invio`) + blocco note per testo libero.
> - **Brain Dump - Triage & Scarto**: 1 clic per convertire in task associato a Ruolo e Triade (`⚡ Più importante`, `🔋 Più veloce`, `🔓 Sblocca le altre`) oppure per **scartare l'attività** con possibilità di annullamento.
> - **Vista Amministrativa Pulizia Task Chiusi**:
>   - **Collocazione**: Nuova sezione ben visibile in **Configurazione** (sezione *Manutenzione & Pulizia Dati*).
>   - **Filtro di Selezione**: Parametro numerico $X$ + unità di misura selezionabile (*Ore*, *Giorni*, *Settimane*).
>   - **Filtro di Sicurezza**: Agisce **esclusivamente sui task completati** (`completed: true`), preservando intatti tutti i task aperti o prioritari.
>   - **Anteprima Trasparente**: Mostra prima di procedere l'esatto numero di task che verranno eliminati e l'elenco riepilogativo per ruolo.
>   - **Conferma Protetta**: Modal di conferma con riepilogo prima della rimozione effettiva.

---

## 1. Panoramica delle Funzionalità

### A. Brain Dump & Inbox Triage
- **Cattura istantanea**: Salva qualsiasi idea in 2 secondi senza doversi fermare a scegliere il ruolo o la fascia.
- **Triage senza attrito**: Nella Inbox, assegna l'idea a un ruolo con un clic o scartala definitivamente.

### B. Manutenzione Amministrativa Task Chiusi
- Nel tempo, i task completati possono accumularsi (decine o centinaia di record), appesantendo la visualizzazione e la sincronizzazione CouchDB.
- Questa console amministrativa permette di definire una regola di conservazione (es. *"Elimina tutti i task chiusi più vecchi di 30 giorni"* oppure *"Elimina task chiusi più vecchi di 48 ore"*).
- Calcola in tempo reale la data limite, isola i task completati con data antecedente, mostra quanti record sono interessati e li elimina in un colpo solo.

---

## 2. Esperienza Utente & Design Visivo

### A. Navigazione Generale

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  RoleFocus   [Oggi]  [Ruoli & Fasce]  [Statistiche]  [📥 Inbox (3)]  [⚙ Configurazione] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### B. Vista Amministrativa di Pulizia Task (in Configurazione)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🧹 Manutenzione & Pulizia Task Chiusi                                                  │
│ Elimina in blocco i compiti completati per mantenere il database leggero e veloce.     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Elimina i task completati più vecchi di:                                               │
│                                                                                        │
│   [   14   ]  ▼ [ Giorni     ]  (es. più vecchi del 29/09/2026 10:00)                  │
│               │ - Ore        │                                                         │
│               │ - Giorni     │                                                         │
│               │ - Settimane  │                                                         │
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ℹ️ Trovati 18 task completati da eliminare (3 Lavoro, 10 Casa, 5 Studio).          │ │
│ │ I task non completati e le sessioni di storico timer NON verranno toccati.         │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ [ Visualizza Anteprima Elenco (18) ]               [ 🗑 Elimina 18 Task Chiusi ]       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Controlli Intuitivi**:
   - Campo input numerico (minimo 1).
   - Selettore unità: `Ore` (per pulizie rapide frequenti), `Giorni`, `Settimane`.
2. **Badge di Anteprima Dinamico**:
   - Si aggiorna istantaneamente al cambio del valore o dell'unità.
   - Mostra quanti task chiusi corrispondono al criterio.
3. **Elenco Espandibile di Ispezione**:
   - Possibilità di aprire un cassetto/accordion per vedere esattamente quali task verranno eliminati prima di confermare.
4. **Conferma con Salvataggio Sincronizzato**:
   - L'eliminazione viene eseguita tramite `db.tasks.bulkDocs` con marcatura `_deleted` per propagarsi istantaneamente anche a CouchDB su tutti i dispositivi connessi.

---

## 3. Architettura Tecnica & Modello Dati

### A. Estensione Tipi (`src/types.ts`)

```typescript
export type BrainDumpStatus = 'inbox' | 'converted' | 'discarded';

export interface BrainDumpItem {
  id: string;
  text: string;
  notes?: string;
  createdAt: number;
  status: BrainDumpStatus;
  assignedRoleId?: string;
  assignedCategory?: DecisionMode;
  convertedTaskId?: string;
  processedAt?: number;
}

export type TaskCleanupUnit = 'hours' | 'days' | 'weeks';

export interface TaskCleanupFilter {
  amount: number;
  unit: TaskCleanupUnit;
}
```

### B. Funzione Atomica di Pulizia (`src/utils/cleanupUtils.ts` & `AppContext.tsx`)

```typescript
export function getThresholdTimestamp(amount: number, unit: TaskCleanupUnit): number {
  const now = Date.now();
  switch (unit) {
    case 'hours':
      return now - amount * 60 * 60 * 1000;
    case 'days':
      return now - amount * 24 * 60 * 60 * 1000;
    case 'weeks':
      return now - amount * 7 * 24 * 60 * 60 * 1000;
  }
}
```

- **Query di isolamento**:
  - `task.completed === true`
  - `(task.completedAt || task.createdAt) < thresholdTimestamp`
- **Operazione Atomica**:
  - Eliminazione massiva tramite `PouchCollection.delete` o bulk delete, seguita da aggiornamento di stato e notifica Toast dell'esito.

### C. Diagramma di Flusso delle Nuove Funzioni

```
                         ┌─────────────────────────────┐
                         │      RoleFocus Sistema      │
                         └──────────────┬──────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     ┌───────────────────────┐                     ┌───────────────────────┐
     │  Inbox & Brain Dump   │                     │ Vista Manutenzione    │
     ├───────────────────────┤                     ├───────────────────────┤
     │ - Cattura rapida      │                     │ - Filtro Ore/Gg/Sett. │
     │ - 1-click triage      │                     │ - Anteprima task chiusi│
     │ - Scarta attività     │                     │ - Bulk Delete sicuro  │
     └───────────┬───────────┘                     └───────────┬───────────┘
                 │                                             │
                 ▼                                             ▼
     PouchDB: db.brainDump                         PouchDB: db.tasks
                 │                                             │
                 └──────────────────────┬──────────────────────┘
                                        │
                                        ▼
                         Sincronizzazione CouchDB Live
                         (replicata su tutti i device)
```

---

## 4. Componenti da Introdurre e Modificare

1. **`src/types.ts`**:
   - Definizione `BrainDumpItem`, `BrainDumpStatus`, `TaskCleanupUnit`.
   - Aggiornamento `ExportDataPayload` per includere `brainDump`.
2. **`src/db/db.ts`**:
   - Aggiunta collezione `db.brainDump`.
   - Registrazione in CouchDB sync manager (`${prefix}braindump`).
   - Supporto export/import dei pensieri del brain dump.
3. **`src/context/AppContext.tsx`**:
   - Metodi Brain Dump: `addBrainDumpItem`, `convertBrainDumpToTask`, `discardBrainDumpItem`, `restoreBrainDumpItem`, `deleteBrainDumpItem`.
   - Metodi Amministrativi: `getCompletedTasksOlderThan(amount, unit)`, `deleteCompletedTasksOlderThan(amount, unit)`.
4. **`src/components/TaskCleanupSection.tsx`**:
   - Pannello amministrativo con selettore numerico, unità temporale, anteprima contatori per ruolo, lista espandibile e pulsante di eliminazione sicura.
5. **`src/pages/ConfigPage.tsx`**:
   - Inserimento del componente di manutenzione e pulizia task nella pagina di configurazione.
6. **`src/pages/InboxPage.tsx`** & **`src/components/BrainDumpQuickModal.tsx`**:
   - Schermata inbox con triage (assegnazione a ruolo + triade, o scarto immediato) e modal rapido ad accesso universale.
7. **`src/components/Header.tsx`**:
   - Nuova voce di menu "Inbox" con badge contatore dinamico.

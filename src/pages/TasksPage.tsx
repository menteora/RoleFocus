import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DECISION_MODES, type DecisionMode, type Role, type RoleTask } from '../types';
import { formatMinutesToHoursMinutes } from '../utils/timeUtils';
import { RoleIcon } from '../utils/icons';
import {
  ListTodo,
  Flame,
  Zap,
  BatteryLow,
  Unlock,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  Circle,
  X,
  Clock,
  Search,
  Layers,
} from 'lucide-react';

type FilterCategory = 'all' | DecisionMode;
type StatusFilter = 'open' | 'urgent' | 'completed';
type SortOrder = 'urgent_first' | 'newest' | 'oldest' | 'time_spent';

export const TasksPage: React.FC = () => {
  const {
    tasks,
    roles,
    addOrUpdateTask,
    deleteTask,
    toggleTaskStatus,
    toggleTaskUrgent,
    startTimerForRole,
    activeTimer,
    setActiveTab,
  } = useApp();

  // Filters state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('urgent_first');
  const [groupByRole, setGroupByRole] = useState(true);

  // Quick Add Modal / Inline state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskRoleId, setNewTaskRoleId] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<DecisionMode>('important');
  const [newTaskIsUrgent, setNewTaskIsUrgent] = useState(false);

  // Edit task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Active roles map for fast lookup
  const rolesMap = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  // Overall KPI counts
  const allOpenTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const allUrgentTasks = useMemo(() => allOpenTasks.filter((t) => t.isUrgent), [allOpenTasks]);
  const allImportantTasks = useMemo(() => allOpenTasks.filter((t) => (t.category || 'important') === 'important'), [allOpenTasks]);
  const allCompletedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);
  const totalMinutesSpent = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.totalMinutesSpent || 0), 0),
    [tasks]
  );

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      // Status filter
      if (statusFilter === 'open' && t.completed) return false;
      if (statusFilter === 'urgent' && (t.completed || !t.isUrgent)) return false;
      if (statusFilter === 'completed' && !t.completed) return false;

      // Role filter
      if (selectedRoleId !== 'all' && t.roleId !== selectedRoleId) return false;

      // Category filter
      if (selectedCategory !== 'all') {
        const cat = t.category || 'important';
        if (cat !== selectedCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roleName = rolesMap.get(t.roleId)?.name.toLowerCase() || '';
        const matchesText = t.text.toLowerCase().includes(q);
        const matchesRole = roleName.includes(q);
        if (!matchesText && !matchesRole) return false;
      }

      return true;
    });

    // Sort result
    result.sort((a, b) => {
      if (sortOrder === 'urgent_first') {
        // Urgent first
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        // Priority flag next
        if (a.isCurrentPriority && !b.isCurrentPriority) return -1;
        if (!a.isCurrentPriority && b.isCurrentPriority) return 1;
        // Then by creation date descending
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sortOrder === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sortOrder === 'oldest') {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (sortOrder === 'time_spent') {
        return (b.totalMinutesSpent || 0) - (a.totalMinutesSpent || 0);
      }
      return 0;
    });

    return result;
  }, [tasks, statusFilter, selectedRoleId, selectedCategory, searchQuery, sortOrder, rolesMap]);

  // Grouped by role if groupByRole is true
  const groupedTasks = useMemo(() => {
    if (!groupByRole) return null;
    const groups: { role: Role | null; roleId: string; tasks: RoleTask[] }[] = [];
    const roleIdOrder = roles.map((r) => r.id);

    // Group matching tasks
    const map = new Map<string, RoleTask[]>();
    for (const t of filteredTasks) {
      const list = map.get(t.roleId) || [];
      list.push(t);
      map.set(t.roleId, list);
    }

    // Add roles in order
    for (const r of roles) {
      const roleTasks = map.get(r.id);
      if (roleTasks && roleTasks.length > 0) {
        groups.push({
          role: r,
          roleId: r.id,
          tasks: roleTasks,
        });
      }
    }

    // Any orphans with unknown role
    for (const [rid, rTasks] of map.entries()) {
      if (!roleIdOrder.includes(rid)) {
        groups.push({
          role: null,
          roleId: rid,
          tasks: rTasks,
        });
      }
    }

    return groups;
  }, [groupByRole, filteredTasks, roles]);

  const handleOpenAddModal = (defaultRoleId?: string) => {
    setNewTaskText('');
    setNewTaskRoleId(defaultRoleId || (selectedRoleId !== 'all' ? selectedRoleId : roles[0]?.id || ''));
    setNewTaskCategory(selectedCategory !== 'all' ? selectedCategory : 'important');
    setNewTaskIsUrgent(statusFilter === 'urgent');
    setIsAddModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !newTaskRoleId) return;
    await addOrUpdateTask({
      roleId: newTaskRoleId,
      category: newTaskCategory,
      text: newTaskText.trim(),
      isCurrentPriority: true,
      isUrgent: newTaskIsUrgent,
    });
    setIsAddModalOpen(false);
    setNewTaskText('');
  };

  const handleStartEditing = (task: RoleTask) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
  };

  const handleSaveEdit = async (task: RoleTask) => {
    if (!editingText.trim()) return;
    await addOrUpdateTask({
      id: task.id,
      roleId: task.roleId,
      category: task.category,
      text: editingText.trim(),
      isCurrentPriority: task.isCurrentPriority,
      isUrgent: task.isUrgent,
      estimatedMinutes: task.estimatedMinutes,
    });
    setEditingTaskId(null);
    setEditingText('');
  };

  const handleLaunchTimer = async (task: RoleTask) => {
    const role = rolesMap.get(task.roleId);
    if (!role) return;
    const cat = task.category || 'important';
    const modeConfig = DECISION_MODES.find((m) => m.key === cat);
    const duration = modeConfig?.defaultMinutes || role.defaultDurationMinutes || 25;
    await startTimerForRole(role, task.text, duration, cat, task.id);
    setActiveTab('now');
  };

  const getCategoryDetails = (cat?: DecisionMode) => {
    const category = cat || 'important';
    switch (category) {
      case 'important':
        return {
          label: 'Più importante',
          icon: Zap,
          badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70',
        };
      case 'quick':
        return {
          label: 'Più veloce',
          icon: BatteryLow,
          badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70',
        };
      case 'unblocker':
        return {
          label: 'Sblocca le altre',
          icon: Unlock,
          badgeClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70',
        };
      default:
        return {
          label: 'Importante',
          icon: Zap,
          badgeClass: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <ListTodo className="w-4 h-4 text-blue-500" />
            <span>Gestione Globale Attività</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 font-['Syne',sans-serif]">
            Tutti i Task Aperti
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Panoramica centralizzata di tutte le attività. Pinna con la fiamma 🔥 i task urgenti per metterli in primo piano in tutte le viste.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Task</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Task Aperti Totali */}
        <button
          type="button"
          onClick={() => setStatusFilter('open')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'open'
              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 shadow-xs ring-1 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium">Task Aperti</span>
            <ListTodo className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {allOpenTasks.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            in {roles.length} ruoli
          </div>
        </button>

        {/* Card 2: Urgenti Pinned 🔥 */}
        <button
          type="button"
          onClick={() => setStatusFilter('urgent')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            statusFilter === 'urgent'
              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 dark:border-orange-600 shadow-xs ring-2 ring-orange-500/30'
              : allUrgentTasks.length > 0
              ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/70 hover:border-orange-300'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-orange-600 dark:text-orange-400 mb-1">
            <span className="font-bold flex items-center gap-1">
              <span>Urgenti (Pinned)</span>
            </span>
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-mono flex items-center gap-1.5">
            <span>{allUrgentTasks.length}</span>
            {allUrgentTasks.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300">
                Priorità Max
              </span>
            )}
          </div>
          <div className="text-[11px] text-orange-700/80 dark:text-orange-400/80 mt-0.5">
            {allUrgentTasks.length > 0 ? 'In risalto ovunque' : 'Nessuna urgenza'}
          </div>
        </button>

        {/* Card 3: Più Importanti ⚡ */}
        <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1">
            <span className="font-medium">Alto Impatto</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {allImportantTasks.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            attività ad alto valore
          </div>
        </div>

        {/* Card 4: Focus Accumulato */}
        <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="font-medium">Tempo Speso</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {formatMinutesToHoursMinutes(totalMinutesSpent)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {allCompletedTasks.length} completate finora
          </div>
        </div>
      </div>

      {/* TOOLBAR: SEARCH, FILTERS & CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        
        {/* Row 1: Status Filter Tabs + Search input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto shrink-0">
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Aperti</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700">
                {allOpenTasks.length}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('urgent')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'urgent'
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-orange-500'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${statusFilter === 'urgent' ? 'fill-white' : 'fill-orange-500 text-orange-500'}`} />
              <span>Solo Urgenti</span>
              {allUrgentTasks.length > 0 && (
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'urgent'
                    ? 'bg-orange-700 text-white'
                    : 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-bold'
                }`}>
                  {allUrgentTasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completati</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700">
                {allCompletedTasks.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per testo del task o ruolo..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Role filter, Category filter, Sort, Grouping) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Role */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 hidden sm:inline">Ruolo:</span>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tutti i ruoli ({roles.length})</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Category */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 hidden sm:inline">Strategia:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as FilterCategory)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tutte le strategie</option>
                <option value="important">⚡ Più importante</option>
                <option value="quick">🔋 Più veloce</option>
                <option value="unblocker">🔓 Sblocca le altre</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 hidden sm:inline">Ordina:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="urgent_first">🔥 Urgenti in cima</option>
                <option value="newest">Più recenti</option>
                <option value="oldest">Meno recenti</option>
                <option value="time_spent">Tempo focus accumulato</option>
              </select>
            </div>
          </div>

          {/* Group by Role toggle */}
          <button
            type="button"
            onClick={() => setGroupByRole(!groupByRole)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              groupByRole
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-medium'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            title="Raggruppa le attività per Ruolo"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Raggruppa per Ruolo</span>
          </button>
        </div>
      </div>

      {/* TASK LIST SECTION */}
      {filteredTasks.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            {statusFilter === 'urgent' ? (
              <Flame className="w-6 h-6 text-orange-500" />
            ) : (
              <ListTodo className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {statusFilter === 'urgent'
                ? 'Nessun task contrassegnato come urgente'
                : statusFilter === 'completed'
                ? 'Nessun task completato con i filtri correnti'
                : 'Nessun task aperto trovato'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {statusFilter === 'urgent'
                ? 'Puoi pinnare qualsiasi task aperto cliccando sull\'icona del fuoco 🔥 per metterlo in evidenza sia qui che nella vista Adesso.'
                : 'Crea una nuova attività usando il pulsante in alto oppure modifica i filtri di ricerca.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            {statusFilter === 'urgent' ? (
              <button
                onClick={() => setStatusFilter('open')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Vedi tutti i task aperti
              </button>
            ) : (
              <button
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + Crea nuovo task
              </button>
            )}
          </div>
        </div>
      ) : groupByRole && groupedTasks ? (
        /* GROUPED BY ROLE VIEW */
        <div className="space-y-6">
          {groupedTasks.map(({ role, roleId, tasks: rTasks }) => {
            const urgentInGroup = rTasks.filter((t) => t.isUrgent && !t.completed).length;

            return (
              <div
                key={roleId}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 relative overflow-hidden"
              >
                {/* Role Top Stripe */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: role?.color || '#3b82f6' }}
                />

                {/* Role Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: role?.color || '#3b82f6' }}
                    >
                      <RoleIcon name={role?.iconName} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          {role?.name || 'Ruolo non specificato'}
                        </h2>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {rTasks.length} {rTasks.length === 1 ? 'task' : 'task'}
                        </span>
                        {urgentInGroup > 0 && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/80 flex items-center gap-1 shadow-2xs animate-pulse">
                            <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                            <span>{urgentInGroup} urgente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAddModal(roleId)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi task a {role?.name}</span>
                  </button>
                </div>

                {/* Tasks in this group */}
                <div className="space-y-2">
                  {rTasks.map((task) => (
                    <TaskRowCard
                      key={task.id}
                      task={task}
                      role={role}
                      isEditing={editingTaskId === task.id}
                      editingText={editingText}
                      setEditingText={setEditingText}
                      onStartEditing={() => handleStartEditing(task)}
                      onSaveEdit={() => handleSaveEdit(task)}
                      onCancelEdit={() => setEditingTaskId(null)}
                      onToggleStatus={() => toggleTaskStatus(task.id)}
                      onToggleUrgent={() => toggleTaskUrgent(task.id)}
                      onLaunchTimer={() => handleLaunchTimer(task)}
                      onDelete={() => deleteTask(task.id)}
                      isTimerRunningOnTask={Boolean(activeTimer?.taskId === task.id && (activeTimer.status === 'running' || activeTimer.status === 'paused'))}
                      getCategoryDetails={getCategoryDetails}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT LIST VIEW */
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const role = rolesMap.get(task.roleId) || null;
            return (
              <TaskRowCard
                key={task.id}
                task={task}
                role={role}
                isEditing={editingTaskId === task.id}
                editingText={editingText}
                setEditingText={setEditingText}
                onStartEditing={() => handleStartEditing(task)}
                onSaveEdit={() => handleSaveEdit(task)}
                onCancelEdit={() => setEditingTaskId(null)}
                onToggleStatus={() => toggleTaskStatus(task.id)}
                onToggleUrgent={() => toggleTaskUrgent(task.id)}
                onLaunchTimer={() => handleLaunchTimer(task)}
                onDelete={() => deleteTask(task.id)}
                isTimerRunningOnTask={Boolean(activeTimer?.taskId === task.id && (activeTimer.status === 'running' || activeTimer.status === 'paused'))}
                getCategoryDetails={getCategoryDetails}
              />
            );
          })}
        </div>
      )}

      {/* QUICK ADD TASK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nuovo Task
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Crea un'attività e assegnala a un ruolo specifico
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              {/* Task Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descrizione Attività <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Es. Completare documentazione API o preparare report mensile..."
                  rows={3}
                  autoFocus
                  required
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                />
              </div>

              {/* Role selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assegna al Ruolo <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTaskRoleId}
                  onChange={(e) => setNewTaskRoleId(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category / Strategy selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Strategia Decisionale
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DECISION_MODES.map((dm) => {
                    const isSelected = newTaskCategory === dm.key;
                    return (
                      <button
                        key={dm.key}
                        type="button"
                        onClick={() => setNewTaskCategory(dm.key)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-1 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                          {dm.actionLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {dm.conditionLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgent Toggle Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setNewTaskIsUrgent(!newTaskIsUrgent)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    newTaskIsUrgent
                      ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-400 dark:border-orange-600 shadow-xs ring-1 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${newTaskIsUrgent ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <Flame className={`w-4 h-4 ${newTaskIsUrgent ? 'fill-white' : ''}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Contrassegna subito come Urgente 🔥
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Verrà posizionato in cima e risalterà nella vista "Adesso"
                      </div>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    newTaskIsUrgent
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {newTaskIsUrgent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!newTaskText.trim()}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Crea Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

interface TaskRowCardProps {
  task: RoleTask;
  role: Role | null;
  isEditing: boolean;
  editingText: string;
  setEditingText: (val: string) => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleStatus: () => void;
  onToggleUrgent: () => void;
  onLaunchTimer: () => void;
  onDelete: () => void;
  isTimerRunningOnTask: boolean;
  getCategoryDetails: (cat?: DecisionMode) => {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  };
}

const TaskRowCard: React.FC<TaskRowCardProps> = ({
  task,
  role,
  isEditing,
  editingText,
  setEditingText,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onToggleStatus,
  onToggleUrgent,
  onLaunchTimer,
  onDelete,
  isTimerRunningOnTask,
  getCategoryDetails,
}) => {
  const cat = getCategoryDetails(task.category);
  const CategoryIcon = cat.icon;
  const minutesSpent = task.totalMinutesSpent || 0;

  return (
    <div
      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        task.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-70'
          : task.isUrgent
          ? 'bg-orange-50/50 dark:bg-orange-950/25 border-orange-300/90 dark:border-orange-600/80 shadow-xs ring-1 ring-orange-400/25'
          : isTimerRunningOnTask
          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-400 dark:border-blue-600 ring-1 ring-blue-500/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Left: Checkbox, Flame Pin, Text, Badges */}
      <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
        {/* Complete Checkbox */}
        <button
          type="button"
          onClick={onToggleStatus}
          title={task.completed ? 'Riapri attività' : 'Segna come completato'}
          className={`mt-0.5 sm:mt-0 transition-colors shrink-0 cursor-pointer ${
            task.completed
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          {task.completed ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        {/* Flame Urgent Pin Button */}
        <button
          type="button"
          onClick={onToggleUrgent}
          title={task.isUrgent ? 'Rimuovi risalto urgente' : 'Contrassegna come urgente 🔥'}
          className={`mt-0.5 sm:mt-0 p-1 rounded-md transition-all cursor-pointer shrink-0 ${
            task.isUrgent
              ? 'text-orange-500 hover:text-orange-600 bg-orange-100/90 dark:bg-orange-950/80 shadow-2xs'
              : 'text-slate-300 dark:text-slate-600 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30'
          }`}
        >
          <Flame className={`w-4 h-4 ${task.isUrgent ? 'fill-orange-500 text-orange-500 animate-pulse' : ''}`} />
        </button>

        {/* Text / Inline Editor */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-blue-500 rounded-lg text-slate-900 dark:text-white"
                autoFocus
              />
              <button
                type="button"
                onClick={onSaveEdit}
                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-wrap">
              <span
                onClick={onStartEditing}
                className={`text-xs font-medium cursor-pointer truncate max-w-full ${
                  task.completed
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : task.isUrgent
                    ? 'text-orange-950 dark:text-orange-100 font-bold'
                    : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                title="Clicca per modificare il testo"
              >
                {task.text}
              </span>

              {/* Badges container */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Urgent Flame Badge */}
                {task.isUrgent && (
                  <span className="shrink-0 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/80 border border-orange-200 dark:border-orange-800/80 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shadow-2xs">
                    <Flame className="w-2.5 h-2.5 fill-orange-500 text-orange-500" />
                    <span>Urgente</span>
                  </span>
                )}

                {/* Role Pill */}
                {role && (
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border"
                    style={{
                      backgroundColor: `${role.color}15`,
                      borderColor: `${role.color}40`,
                      color: role.color,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <span>{role.name}</span>
                  </span>
                )}

                {/* Strategy Category Pill */}
                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${cat.badgeClass}`}>
                  <CategoryIcon className="w-2.5 h-2.5" />
                  <span>{cat.label}</span>
                </span>

                {/* Tracked Time Badge */}
                {minutesSpent > 0 && (
                  <span
                    className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1"
                    title={`Tempo focus accumulato: ${minutesSpent} min in ${task.sessionCount || 1} sessioni`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatMinutesToHoursMinutes(minutesSpent)}</span>
                  </span>
                )}

                {/* Focus In Corso indicator */}
                {isTimerRunningOnTask && (
                  <span className="shrink-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.2 rounded-md animate-pulse">
                    Timer attivo
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions (Avvia Focus, Edit, Delete) */}
      {!isEditing && (
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {!task.completed && (
            <button
              type="button"
              onClick={onLaunchTimer}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                task.isUrgent
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
              }`}
              title="Avvia timer focus su questo task"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Avvia Focus</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartEditing}
            title="Modifica"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            title="Elimina"
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

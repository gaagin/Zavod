import React, { useState, useMemo, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  EquipmentStatus, 
  EventSeverity, 
  EquipmentTask, 
  TaskPriority, 
  TaskStatus, 
  TaskType 
} from '../types';
import { getHierarchyPath } from '../utils/exportUtils';
import { 
  Search, 
  X, 
  Cpu, 
  Folder, 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  User, 
  ChevronRight, 
  Plus,
  ListTodo,
  CheckSquare,
  Square,
  Calendar,
  Wrench,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Link2,
  Share2,
  Check
} from 'lucide-react';
import { 
  copyTextToClipboard, 
  generateTaskUrl, 
  formatExternalUrl 
} from '../utils/linkUtils';

export interface EnrichedEquipmentTask extends EquipmentTask {
  equipmentId: string;
  equipmentName: string;
  equipmentTag: string;
  equipmentStatus: EquipmentStatus;
  equipmentParentId?: string | null;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; badgeClass: string; borderClass: string }> = {
  urgent: { 
    label: 'Срочно', 
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    borderClass: 'border-l-rose-500'
  },
  high: { 
    label: 'Высокий', 
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderClass: 'border-l-amber-500'
  },
  medium: { 
    label: 'Средний', 
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    borderClass: 'border-l-blue-500'
  },
  low: { 
    label: 'Низкий', 
    badgeClass: 'bg-white/5 text-slate-400 border-white/10',
    borderClass: 'border-l-slate-600'
  },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; badgeClass: string }> = {
  pending: { 
    label: 'К исполнению', 
    color: 'text-amber-400', 
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
  },
  in_progress: { 
    label: 'В работе', 
    color: 'text-blue-400', 
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
  },
  completed: { 
    label: 'Выполнено', 
    color: 'text-emerald-400', 
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
  },
  cancelled: { 
    label: 'Отменено', 
    color: 'text-slate-400', 
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20' 
  },
};

const TYPE_LABELS: Record<TaskType, { label: string; icon: string }> = {
  maintenance: { label: 'ТО', icon: '🔧' },
  repair: { label: 'Ремонт', icon: '🛠️' },
  inspection: { label: 'Осмотр', icon: '🔍' },
  setup: { label: 'Наладка', icon: '⚙️' },
  other: { label: 'Задача', icon: '📝' },
};

const QUICK_TASK_TEMPLATES = [
  { title: 'Плановое ТО и смазка узлов', type: 'maintenance' as TaskType, priority: 'medium' as TaskPriority },
  { title: 'Замена фильтра и очистка', type: 'maintenance' as TaskType, priority: 'medium' as TaskPriority },
  { title: 'Диагностика вибрации и люфтов', type: 'inspection' as TaskType, priority: 'high' as TaskPriority },
  { title: 'Аварийный ремонт привода', type: 'repair' as TaskType, priority: 'urgent' as TaskPriority },
];

export const SearchModal: React.FC = () => {
  const {
    state,
    isSearchOpen,
    setIsSearchOpen,
    searchDefaultTab,
    focusNode,
    openTaskModal,
    addEventLog,
    updateEquipment,
    showToast,
    currentUser,
  } = useFactory();

  const [activeTab, setActiveTab] = useState<'components' | 'tasks' | 'logs'>('components');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');

  // Manual Log Note State
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [manualSeverity, setManualSeverity] = useState<EventSeverity>('info');
  const [manualTargetId, setManualTargetId] = useState<string>('');

  // Manual Task Creation State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTargetEqId, setNewTaskTargetEqId] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskType, setNewTaskType] = useState<TaskType>('maintenance');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  // Sync default tab if opened specifically
  useEffect(() => {
    if (isSearchOpen && searchDefaultTab) {
      setActiveTab(searchDefaultTab);
    }
  }, [isSearchOpen, searchDefaultTab]);

  // Set default due date for new task
  useEffect(() => {
    if (isAddingTask) {
      if (!newTaskDueDate) {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setNewTaskDueDate(d.toISOString().split('T')[0]);
      }
      if (!newTaskAssignee) {
        setNewTaskAssignee(currentUser.name || '');
      }
      if (!newTaskTargetEqId && state.equipment.length > 0) {
        setNewTaskTargetEqId(state.equipment[0].id);
      }
    }
  }, [isAddingTask, newTaskDueDate, newTaskAssignee, newTaskTargetEqId, currentUser.name, state.equipment]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  // 1. Flatten all tasks across all plant equipment
  const allTasks: EnrichedEquipmentTask[] = useMemo(() => {
    return state.equipment.flatMap(eq => 
      (eq.tasks || []).map(task => ({
        ...task,
        equipmentId: eq.id,
        equipmentName: eq.name,
        equipmentTag: eq.tag,
        equipmentStatus: eq.status,
        equipmentParentId: eq.parentId,
      }))
    );
  }, [state.equipment]);

  // 2. Filtered Tasks
  const filteredTasks = useMemo(() => {
    const q = query.toLowerCase().trim();

    return allTasks.filter(task => {
      // Filter tab pill selection
      if (taskFilter === 'active') {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
      } else if (taskFilter === 'urgent') {
        if (task.priority !== 'urgent' && task.priority !== 'high') return false;
        if (task.status === 'completed') return false;
      } else if (taskFilter === 'maintenance') {
        if (task.type !== 'maintenance') return false;
      } else if (taskFilter === 'repair') {
        if (task.type !== 'repair') return false;
      } else if (taskFilter === 'inspection') {
        if (task.type !== 'inspection') return false;
      } else if (taskFilter === 'completed') {
        if (task.status !== 'completed') return false;
      }

      if (!q) return true;

      const typeLabel = task.type ? (TYPE_LABELS[task.type]?.label || task.type) : '';
      const statusLabel = STATUS_CONFIG[task.status]?.label || task.status;
      const priorityLabel = PRIORITY_CONFIG[task.priority]?.label || task.priority;

      return (
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.assignedTo && task.assignedTo.toLowerCase().includes(q)) ||
        (task.linkUrl && task.linkUrl.toLowerCase().includes(q)) ||
        (task.createdBy && task.createdBy.toLowerCase().includes(q)) ||
        (task.dueDate && task.dueDate.toLowerCase().includes(q)) ||
        typeLabel.toLowerCase().includes(q) ||
        statusLabel.toLowerCase().includes(q) ||
        priorityLabel.toLowerCase().includes(q) ||
        task.equipmentName.toLowerCase().includes(q) ||
        task.equipmentTag.toLowerCase().includes(q)
      );
    });
  }, [allTasks, query, taskFilter]);

  // 3. Filtered Components (Equipment & Containers) with task search linkage
  const filteredComponents = useMemo(() => {
    const q = query.toLowerCase().trim();

    const matchedEquipment = state.equipment.filter(eq => {
      if (statusFilter !== 'all' && eq.status !== statusFilter) return false;
      if (!q) return true;

      // Basic properties
      const matchBasic = 
        eq.name.toLowerCase().includes(q) ||
        eq.tag.toLowerCase().includes(q) ||
        (eq.model && eq.model.toLowerCase().includes(q)) ||
        (eq.serialNumber && eq.serialNumber.toLowerCase().includes(q)) ||
        (eq.manufacturer && eq.manufacturer.toLowerCase().includes(q)) ||
        ((eq.barcode || eq.barkod) && (eq.barcode || eq.barkod)!.toLowerCase().includes(q)) ||
        ((eq.stockCode || eq.stokKod) && (eq.stockCode || eq.stokKod)!.toLowerCase().includes(q)) ||
        (eq.notes && eq.notes.toLowerCase().includes(q));

      if (matchBasic) return true;

      // Custom properties
      const matchCustomProps = eq.properties.some(p => 
        p.name.toLowerCase().includes(q) || 
        String(p.value).toLowerCase().includes(q)
      );
      if (matchCustomProps) return true;

      // Tasks matching
      const matchTasks = (eq.tasks || []).some(t => 
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignedTo && t.assignedTo.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q))
      );

      return matchTasks;
    });

    const matchedContainers = state.containers.filter(c => {
      if (statusFilter !== 'all') return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.manager && c.manager.toLowerCase().includes(q))
      );
    });

    const seenEq = new Set<string>();
    const uniqueEquipment = matchedEquipment.filter(eq => {
      if (!eq || !eq.id || seenEq.has(eq.id)) return false;
      seenEq.add(eq.id);
      return true;
    });

    const seenCont = new Set<string>();
    const uniqueContainers = matchedContainers.filter(c => {
      if (!c || !c.id || seenCont.has(c.id)) return false;
      seenCont.add(c.id);
      return true;
    });

    return { equipment: uniqueEquipment, containers: uniqueContainers };
  }, [state.equipment, state.containers, query, statusFilter]);

  // 4. Filtered Logs
  const filteredLogs = useMemo(() => {
    const q = query.toLowerCase().trim();
    const seen = new Set<string>();
    const uniqueLogs = state.eventLogs.filter(log => {
      if (!log || !log.id || seen.has(log.id)) return false;
      seen.add(log.id);
      return true;
    });

    return uniqueLogs.filter(log => {
      if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        (log.description || '').toLowerCase().includes(q) ||
        (log.targetName || '').toLowerCase().includes(q) ||
        (log.userName || '').toLowerCase().includes(q)
      );
    });
  }, [state.eventLogs, query, severityFilter]);

  if (!isSearchOpen) return null;

  // Copy Task Deep Link
  const handleCopyTaskLink = async (task: EnrichedEquipmentTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateTaskUrl(task.equipmentId, task.id);
    const success = await copyTextToClipboard(url);
    if (success) {
      setCopiedTaskId(task.id);
      showToast('Ссылка на задачу скопирована 📋', 'Прямой адрес скопирован в буфер обмена', 'success');
      setTimeout(() => setCopiedTaskId(null), 2500);
    }
  };

  // Toggle Task Completion Directly From Search
  const handleToggleTask = (task: EnrichedEquipmentTask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role === 'viewer') {
      showToast('Ограничение доступа', 'Роль Наблюдатель не может менять статус задач', 'warning');
      return;
    }

    const eq = state.equipment.find(item => item.id === task.equipmentId);
    if (!eq || !eq.tasks) return;

    const isNowCompleted = task.status !== 'completed';
    const nextStatus: TaskStatus = isNowCompleted ? 'completed' : 'pending';

    const updatedTasks = eq.tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          status: nextStatus,
          completedAt: isNowCompleted ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    updateEquipment(
      task.equipmentId,
      { tasks: updatedTasks },
      `Статус задачи "${task.title}": ${STATUS_CONFIG[nextStatus].label}`
    );

    if (isNowCompleted) {
      addEventLog({
        targetId: eq.id,
        targetName: eq.name,
        targetType: 'equipment',
        eventType: 'maintenance',
        severity: 'success',
        description: `Выполнена задача для [${eq.tag}]: "${task.title}"`,
        userName: currentUser.name,
        userRole: currentUser.role,
      });
      showToast('Задача выполнена', `[${task.equipmentTag}] ${task.title}`, 'success');
    } else {
      showToast('Задача возвращена в работу', `[${task.equipmentTag}] ${task.title}`, 'info');
    }
  };

  // Open task modal when task is clicked
  const handleSelectTask = (task: EnrichedEquipmentTask) => {
    setIsSearchOpen(false);
    openTaskModal(task.equipmentId, task.id);
  };

  // Create Manual Log
  const handleCreateManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNote.trim()) return;

    const target = state.equipment.find(e => e.id === manualTargetId) || state.containers.find(c => c.id === manualTargetId);

    addEventLog({
      targetId: target?.id || 'manual_system',
      targetName: target?.name || 'Общая смена завода',
      targetType: target ? (state.equipment.some(e => e.id === target.id) ? 'equipment' : 'container') : 'system',
      eventType: 'alert',
      severity: manualSeverity,
      description: manualNote.trim(),
      userName: currentUser.name,
      userRole: currentUser.role
    });

    setManualNote('');
    setIsAddingLog(false);
    showToast('Запись добавлена', 'Событие успешно внесено в оперативный журнал', 'success');
  };

  // Create Manual Task directly in search
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskTargetEqId) return;

    const eq = state.equipment.find(e => e.id === newTaskTargetEqId);
    if (!eq) return;

    const newTask: EquipmentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      status: 'pending',
      priority: newTaskPriority,
      type: newTaskType,
      assignedTo: newTaskAssignee.trim() || undefined,
      dueDate: newTaskDueDate || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };

    const currentTasks = eq.tasks || [];
    const updatedTasks = [newTask, ...currentTasks];

    updateEquipment(
      eq.id,
      { tasks: updatedTasks },
      `Создана задача "${newTask.title}" для ${eq.tag}`
    );

    addEventLog({
      targetId: eq.id,
      targetName: eq.name,
      targetType: 'equipment',
      eventType: 'maintenance',
      severity: newTaskPriority === 'urgent' ? 'warning' : 'info',
      description: `Назначена новая задача для [${eq.tag}]: "${newTask.title}" (${PRIORITY_CONFIG[newTaskPriority].label})`,
      userName: currentUser.name,
      userRole: currentUser.role,
    });

    showToast('Задача создана', `Назначена для [${eq.tag}] ${eq.name}`, 'success');

    // Reset Form and open task modal
    setNewTaskTitle('');
    setNewTaskDesc('');
    setIsAddingTask(false);
    setIsSearchOpen(false);
    openTaskModal(eq.id, newTask.id);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-14 px-3 sm:px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSearchOpen(false);
      }}
    >
      <div 
        id="search-dialog"
        className="w-full max-w-3xl bg-[#0F0F12] text-slate-300 rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3 sm:p-3.5 border-b border-white/10 flex items-center gap-3 bg-[#131318]">
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Поиск оборудования, цехов, задач ТО, исполнителей или логов..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              title="Очистить поисковый запрос"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-3 sm:px-4 py-2 bg-[#121217] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              id="search-tab-components"
              type="button"
              onClick={() => setActiveTab('components')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'components'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Оборудование ({filteredComponents.equipment.length + filteredComponents.containers.length})</span>
            </button>

            <button
              id="search-tab-tasks"
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Задачи ТО ({filteredTasks.length})</span>
            </button>

            <button
              id="search-tab-logs"
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Журнал ({filteredLogs.length})</span>
            </button>
          </div>

          {/* Tab Context Filter Pills */}
          {activeTab === 'components' && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
              {[
                { id: 'all', label: 'Все' },
                { id: 'critical', label: 'Аварии', color: 'text-red-400' },
                { id: 'warning', label: 'Внимание', color: 'text-amber-400' },
                { id: 'maintenance', label: 'ТО', color: 'text-indigo-400' },
                { id: 'normal', label: 'В норме', color: 'text-emerald-400' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors border shrink-0 ${
                    statusFilter === f.id
                      ? 'bg-blue-600 text-white border-blue-500 font-bold'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full">
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'active', label: 'В работе' },
                  { id: 'urgent', label: 'Срочные' },
                  { id: 'maintenance', label: 'ТО' },
                  { id: 'repair', label: 'Ремонт' },
                  { id: 'inspection', label: 'Осмотр' },
                  { id: 'completed', label: 'Готово' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTaskFilter(f.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] transition-colors border shrink-0 ${
                      taskFilter === f.id
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {currentUser.role !== 'viewer' && (
                <button
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 font-semibold text-[11px] flex items-center gap-1 border border-blue-500/30 shrink-0 transition-colors"
                  title="Назначить новую задачу оборудованию"
                >
                  <Plus className="w-3 h-3" />
                  <span className="hidden xs:inline">Создать</span>
                  <span>задачу</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full">
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'Все логи' },
                  { id: 'critical', label: 'Критические' },
                  { id: 'warning', label: 'Предупреждения' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSeverityFilter(f.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] transition-colors border shrink-0 ${
                      severityFilter === f.id
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {currentUser.role !== 'viewer' && (
                <button
                  onClick={() => setIsAddingLog(!isAddingLog)}
                  className="px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 font-semibold text-[11px] flex items-center gap-1 border border-blue-500/30 shrink-0 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Запись в журнал</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Task Creation Inline Drawer */}
        {activeTab === 'tasks' && isAddingTask && (
          <form onSubmit={handleCreateTask} className="p-3.5 bg-blue-950/20 border-b border-blue-500/20 text-xs animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between font-bold text-blue-400 mb-2.5">
              <span className="flex items-center gap-1.5">
                <ListTodo className="w-4 h-4" />
                <span>Назначение задачи оборудованию</span>
              </span>
              <button 
                type="button" 
                onClick={() => setIsAddingTask(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Template Chips */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
              <span className="text-[10px] text-slate-400 shrink-0">Шаблоны:</span>
              {QUICK_TASK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewTaskTitle(tmpl.title);
                    setNewTaskType(tmpl.type);
                    setNewTaskPriority(tmpl.priority);
                  }}
                  className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-400/40 text-[10px] text-slate-300 transition-colors shrink-0"
                >
                  {tmpl.title}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mb-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-400 block mb-0.5">Оборудование *</label>
                <select
                  value={newTaskTargetEqId}
                  onChange={(e) => setNewTaskTargetEqId(e.target.value)}
                  required
                  className="w-full p-2 rounded-lg bg-[#17171C] border border-white/15 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  {state.equipment.map(eq => (
                    <option key={eq.id} value={eq.id} className="bg-[#0F0F12]">
                      [{eq.tag}] {eq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Тип задачи</label>
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value as TaskType)}
                  className="w-full p-2 rounded-lg bg-[#17171C] border border-white/15 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="maintenance">🔧 ТО (Техобслуживание)</option>
                  <option value="repair">🛠️ Ремонт узла</option>
                  <option value="inspection">🔍 Осмотр / Диагностика</option>
                  <option value="setup">⚙️ Наладка / Калибровка</option>
                  <option value="other">📝 Другое поручение</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Приоритет</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                  className="w-full p-2 rounded-lg bg-[#17171C] border border-white/15 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="urgent">🔴 Срочно (Аварийный)</option>
                  <option value="high">🟠 Высокий</option>
                  <option value="medium">🔵 Средний</option>
                  <option value="low">⚪ Низкий</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-400 block mb-0.5">Наименование задачи *</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Замена подшипника шпинделя или плановое ТО"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#17171C] border border-white/15 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Срок выполнения</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#17171C] border border-white/15 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Исполнитель</label>
                <input
                  type="text"
                  placeholder="ФИО ответственного мастера / инженера"
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#17171C] border border-white/15 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Описание / Инструкции</label>
                <input
                  type="text"
                  placeholder="Дополнительные примечания к работе (необязательно)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#17171C] border border-white/15 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm shadow-blue-500/30 transition-all"
              >
                Назначить задачу
              </button>
            </div>
          </form>
        )}

        {/* Manual Log Entry Drawer */}
        {activeTab === 'logs' && isAddingLog && (
          <form onSubmit={handleCreateManualLog} className="p-3 bg-white/5 border-b border-white/10 text-xs">
            <div className="font-bold text-blue-400 mb-2">Новая запись оперативного журнала</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Оборудование</label>
                <select
                  value={manualTargetId}
                  onChange={(e) => setManualTargetId(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="" className="bg-[#0F0F12]">Общее событие завода</option>
                  {state.equipment.map(eq => (
                    <option key={eq.id} value={eq.id} className="bg-[#0F0F12]">[{eq.tag}] {eq.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Важность</label>
                <select
                  value={manualSeverity}
                  onChange={(e) => setManualSeverity(e.target.value as EventSeverity)}
                  className="w-full p-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="info" className="bg-[#0F0F12]">Информация</option>
                  <option value="warning" className="bg-[#0F0F12]">Предупреждение</option>
                  <option value="critical" className="bg-[#0F0F12]">Аварийная тревога</option>
                  <option value="success" className="bg-[#0F0F12]">Успешная операция</option>
                </select>
              </div>
            </div>
            <textarea
              rows={2}
              required
              placeholder="Текст записи (напр. 'Произведена продувка магистрали сжатого воздуха')"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-xs mb-2 resize-none focus:outline-hidden focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingLog(false)}
                className="px-3 py-1 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Сохранить запись
              </button>
            </div>
          </form>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-white/5">
          {/* TAB 1: Components (Equipment & Containers) */}
          {activeTab === 'components' && (
            <>
              {filteredComponents.equipment.length === 0 && filteredComponents.containers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-3">
                  <div>Ничего не найдено по запросу "{query}" в оборудовании</div>
                  {filteredTasks.length > 0 && (
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold transition-colors"
                    >
                      <ListTodo className="w-3.5 h-3.5" />
                      <span>По этому запросу найдено {filteredTasks.length} задач — Перейти к задачам</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Containers */}
                  {filteredComponents.containers.map(cont => (
                    <div
                      key={cont.id}
                      onClick={() => {
                        focusNode(cont.id);
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 rounded-xl hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-xs"
                          style={{ backgroundColor: cont.color }}
                        >
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">
                              {cont.tag}
                            </span>
                            <span className="font-semibold text-xs text-slate-200 truncate">
                              {cont.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                              Контейнер
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {cont.manager ? `Ответственный: ${cont.manager}` : cont.description || 'Производственный сектор'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  ))}

                  {/* Equipment */}
                  {filteredComponents.equipment.map(eq => {
                    const location = eq.parentId ? getHierarchyPath(eq.parentId, state.containers) : 'Корень завода';
                    const matchingTasks = (eq.tasks || []).filter(t => {
                      if (!query.trim()) return false;
                      const q = query.toLowerCase().trim();
                      return (
                        t.title.toLowerCase().includes(q) ||
                        (t.description && t.description.toLowerCase().includes(q)) ||
                        (t.assignedTo && t.assignedTo.toLowerCase().includes(q))
                      );
                    });

                    return (
                      <div
                        key={eq.id}
                        onClick={() => {
                          focusNode(eq.id);
                          setIsSearchOpen(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            eq.status === 'critical' ? 'bg-red-500 text-white animate-pulse' :
                            eq.status === 'warning' ? 'bg-amber-500 text-white' :
                            eq.status === 'maintenance' ? 'bg-indigo-500 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            <Cpu className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-white">
                                {eq.tag}
                              </span>
                              <span className="font-semibold text-xs text-slate-200 truncate">
                                {eq.name}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                eq.status === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                eq.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                eq.status === 'maintenance' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {eq.status}
                              </span>

                              {eq.tasks && eq.tasks.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono">
                                  {eq.tasks.filter(t => t.status !== 'completed').length} акт. задач
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              📍 {location}  |  ⚡ {eq.powerKw ? `${eq.powerKw} кВт` : 'Питание штатно'} {eq.model ? `| ${eq.model}` : ''} {(eq.barcode || eq.barkod) ? `| Barkod: ${eq.barcode || eq.barkod}` : ''} {(eq.stockCode || eq.stokKod) ? `| Stok: ${eq.stockCode || eq.stokKod}` : ''}
                            </div>

                            {/* Show linked task hint if match was due to a task */}
                            {matchingTasks.length > 0 && (
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 max-w-fit">
                                <ListTodo className="w-3 h-3 text-blue-400 shrink-0" />
                                <span>Найдено совпадение в задаче: <strong>«{matchingTasks[0].title}»</strong></span>
                              </div>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* TAB 2: Tasks (Equipment Maintenance & Repairs) */}
          {activeTab === 'tasks' && (
            <>
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-3">
                  <div>
                    {allTasks.length === 0
                      ? 'В проекте пока нет созданных задач ТО. Нажмите «Создать задачу», чтобы назначить обслуживание.'
                      : `Ничего не найдено по запросу "${query}" среди задач ТО.`}
                  </div>
                  {currentUser.role !== 'viewer' && (
                    <button
                      onClick={() => setIsAddingTask(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Создать новую задачу ТО</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {filteredTasks.map(task => {
                    const isCompleted = task.status === 'completed';
                    const isOverdue = Boolean(
                      task.dueDate && 
                      task.dueDate < todayStr && 
                      !isCompleted && 
                      task.status !== 'cancelled'
                    );
                    const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                    const typeCfg = task.type ? TYPE_LABELS[task.type] : undefined;
                    const location = task.equipmentParentId 
                      ? getHierarchyPath(task.equipmentParentId, state.containers) 
                      : 'Корень завода';

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleSelectTask(task)}
                        className={`p-2.5 rounded-xl border bg-white/5 hover:bg-white/10 cursor-pointer transition-all flex items-start gap-2.5 group ${
                          isCompleted ? 'border-white/5 opacity-75' : 'border-white/10 hover:border-blue-500/40'
                        } border-l-4 ${priorityCfg.borderClass}`}
                        title={`Открыть карточку задачи: "${task.title}" [${task.equipmentTag}]`}
                      >
                        {/* Task Completion Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleTask(task, e)}
                          className={`mt-0.5 p-0.5 rounded transition-colors shrink-0 ${
                            isCompleted 
                              ? 'text-emerald-400 hover:text-emerald-300' 
                              : 'text-slate-400 hover:text-blue-400'
                          }`}
                          title={isCompleted ? 'Снять отметку о выполнении' : 'Отметить задачу выполненной'}
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                          )}
                        </button>

                        {/* Task Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              {/* Type badge */}
                              {typeCfg && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-medium">
                                  {typeCfg.icon} {typeCfg.label}
                                </span>
                              )}

                              {/* Priority badge */}
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${priorityCfg.badgeClass}`}>
                                {priorityCfg.label}
                              </span>

                              {/* Status badge */}
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${statusCfg.badgeClass}`}>
                                {statusCfg.label}
                              </span>

                              {/* Overdue alert */}
                              {isOverdue && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                                  Просрочено!
                                </span>
                              )}
                            </div>

                            {/* Equipment Association Link */}
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-mono text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                [{task.equipmentTag}]
                              </span>
                              <span className="text-slate-300 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                                {task.equipmentName}
                              </span>
                            </div>
                          </div>

                          {/* Task Title */}
                          <div className={`text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors ${
                            isCompleted ? 'line-through text-slate-400' : ''
                          }`}>
                            {task.title}
                          </div>

                          {/* Task Description */}
                          {task.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Task Metadata Footer */}
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap">
                            <span className="text-slate-500">
                              📍 {location}
                            </span>

                            {task.assignedTo && (
                              <span className="flex items-center gap-1 text-slate-300">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>{task.assignedTo}</span>
                              </span>
                            )}

                            {task.dueDate && (
                              <span className={`flex items-center gap-1 font-mono ${
                                isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                <span>Срок: {task.dueDate}</span>
                              </span>
                            )}

                            {task.createdAt && (
                              <span className="text-slate-500">
                                Создана: {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                              </span>
                            )}

                            {(task.linkUrl || task.url) && (
                              <a
                                href={formatExternalUrl(task.linkUrl || task.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 font-medium transition-colors"
                                title={`Внешняя ссылка: ${task.linkUrl || task.url}`}
                              >
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate max-w-[120px]">Внешняя ссылка</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 mt-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopyTaskLink(task, e)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              copiedTaskId === task.id
                                ? 'text-emerald-400 bg-emerald-500/20'
                                : 'text-slate-400 hover:text-purple-400 hover:bg-white/10'
                            }`}
                            title="Скопировать ссылку на задачу для отправки в мессенджеры и тикеты"
                          >
                            {copiedTaskId === task.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              focusNode(task.equipmentId);
                              setIsSearchOpen(false);
                              showToast(
                                `Оборудование: [${task.equipmentTag}] ${task.equipmentName}`,
                                `Задача: ${task.title}`,
                                'info'
                              );
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Показать оборудование на схеме"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 group-hover:text-blue-400 transition-all" title="Открыть окно задачи" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 3: Logs (Factory Event Log) */}
          {activeTab === 'logs' && (
            <>
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  В журнале нет записей, соответствующих запросу
                </div>
              ) : (
                filteredLogs.map(log => {
                  const time = new Date(log.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const date = new Date(log.timestamp).toLocaleDateString('ru-RU');

                  return (
                    <div
                      key={log.id}
                      onClick={() => {
                        if (log.targetId) {
                          focusNode(log.targetId);
                          setIsSearchOpen(false);
                        }
                      }}
                      className="p-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-xs flex items-start gap-3 transition-colors"
                    >
                      <div className="mt-0.5">
                        {log.severity === 'critical' && <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />}
                        {log.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                        {log.severity === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {log.severity === 'info' && <Activity className="w-4 h-4 text-blue-400 shrink-0" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="font-bold text-white">
                            {log.targetName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {date} {time}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          {log.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.userName}
                          </span>
                          <span>•</span>
                          <span className="uppercase text-[9px] font-semibold">{log.eventType}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#121217] border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <span>
            {activeTab === 'tasks' 
              ? 'Нажмите на задачу для перехода к оборудованию на схеме или флажок для смены статуса' 
              : 'Нажмите на результат для моментального перехода к элементу на холсте'}
          </span>
          <div className="flex items-center gap-2">
            <kbd className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-300 text-[10px]">
              Esc для закрытия
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

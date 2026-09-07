import React, { useState } from 'react';
import { EquipmentNode, EquipmentTask, TaskPriority, TaskStatus, TaskType } from '../types';
import { useFactory } from '../context/FactoryContext';
import { 
  ListTodo, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  Wrench,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface EquipmentTasksSectionProps {
  equipment: EquipmentNode;
  canEdit: boolean;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; badgeClass: string }> = {
  urgent: { 
    label: 'Срочно', 
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' 
  },
  high: { 
    label: 'Высокий', 
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
  },
  medium: { 
    label: 'Средний', 
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' 
  },
  low: { 
    label: 'Низкий', 
    badgeClass: 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10' 
  },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: 'К исполнению', color: 'text-amber-600 dark:text-amber-400' },
  in_progress: { label: 'В работе', color: 'text-blue-600 dark:text-blue-400' },
  completed: { label: 'Выполнено', color: 'text-emerald-600 dark:text-emerald-400' },
  cancelled: { label: 'Отменено', color: 'text-slate-400' },
};

const TYPE_LABELS: Record<TaskType, string> = {
  maintenance: 'ТО',
  repair: 'Ремонт',
  inspection: 'Осмотр',
  setup: 'Наладка',
  other: 'Другое',
};

const QUICK_TEMPLATES = [
  { title: 'Плановое ТО и смазка узлов', type: 'maintenance' as TaskType, priority: 'medium' as TaskPriority },
  { title: 'Замена фильтра и очистка', type: 'maintenance' as TaskType, priority: 'medium' as TaskPriority },
  { title: 'Диагностика вибрации и люфтов', type: 'inspection' as TaskType, priority: 'high' as TaskPriority },
  { title: 'Калибровка датчиков и упоров', type: 'setup' as TaskType, priority: 'medium' as TaskPriority },
  { title: 'Аварийный ремонт привода', type: 'repair' as TaskType, priority: 'urgent' as TaskPriority },
];

export const EquipmentTasksSection: React.FC<EquipmentTasksSectionProps> = ({
  equipment,
  canEdit,
}) => {
  const { updateEquipment, addEventLog, currentUser, openSearch, openTaskModal } = useFactory();

  const tasks = equipment.tasks || [];
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskType, setTaskType] = useState<TaskType>('maintenance');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const urgentCount = tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed').length;

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'active') {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
    } else if (filterStatus === 'completed') {
      if (task.status !== 'completed') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.assignedTo && task.assignedTo.toLowerCase().includes(q)) ||
        (TYPE_LABELS[task.type] && TYPE_LABELS[task.type].toLowerCase().includes(q)) ||
        (PRIORITY_CONFIG[task.priority]?.label && PRIORITY_CONFIG[task.priority].label.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const resetForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    setTaskType('maintenance');
    setTaskAssignee('');
    setTaskDueDate('');
    setIsCreating(false);
    setEditingTaskId(null);
  };

  const handleStartCreate = (template?: { title: string; type: TaskType; priority: TaskPriority }) => {
    if (!canEdit) return;
    if (template) {
      setTaskTitle(template.title);
      setTaskType(template.type);
      setTaskPriority(template.priority);
    } else {
      setTaskTitle('');
      setTaskType('maintenance');
      setTaskPriority('medium');
    }
    setTaskDesc('');
    setTaskAssignee(currentUser.name || '');
    // Default due date: tomorrow or in 3 days
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 3);
    setTaskDueDate(defaultDue.toISOString().split('T')[0]);
    setEditingTaskId(null);
    setIsCreating(true);
    setIsExpanded(true);
  };

  const handleStartEdit = (task: EquipmentTask) => {
    if (!canEdit) return;
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskPriority(task.priority);
    setTaskType(task.type || 'maintenance');
    setTaskAssignee(task.assignedTo || '');
    setTaskDueDate(task.dueDate || '');
    setIsCreating(false);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !canEdit) return;

    if (editingTaskId) {
      // Edit existing task
      const updatedTasks = tasks.map(t => {
        if (t.id === editingTaskId) {
          return {
            ...t,
            title: taskTitle.trim(),
            description: taskDesc.trim() || undefined,
            priority: taskPriority,
            type: taskType,
            assignedTo: taskAssignee.trim() || undefined,
            dueDate: taskDueDate || undefined,
          };
        }
        return t;
      });

      updateEquipment(
        equipment.id,
        { tasks: updatedTasks },
        `Обновлена задача "${taskTitle.trim()}" для ${equipment.tag}`
      );
      resetForm();
    } else {
      // Create new task
      const newTask: EquipmentTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        status: 'pending',
        priority: taskPriority,
        type: taskType,
        assignedTo: taskAssignee.trim() || undefined,
        dueDate: taskDueDate || undefined,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name || undefined,
      };

      const updatedTasks = [newTask, ...tasks];

      updateEquipment(
        equipment.id,
        { tasks: updatedTasks },
        `Добавлена задача "${newTask.title}" для ${equipment.tag}`
      );

      // Add to event logs
      addEventLog({
        targetId: equipment.id,
        targetName: equipment.name,
        targetType: 'equipment',
        eventType: 'maintenance',
        severity: taskPriority === 'urgent' ? 'warning' : 'info',
        description: `Назначена задача для [${equipment.tag}]: "${newTask.title}" (Приоритет: ${PRIORITY_CONFIG[taskPriority].label})`,
        userName: currentUser.name,
        userRole: currentUser.role,
      });

      resetForm();
    }
  };

  const handleToggleTaskStatus = (task: EquipmentTask) => {
    if (!canEdit) return;
    const isNowCompleted = task.status !== 'completed';
    const newStatus: TaskStatus = isNowCompleted ? 'completed' : 'pending';

    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          status: newStatus,
          completedAt: isNowCompleted ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    updateEquipment(
      equipment.id,
      { tasks: updatedTasks },
      `Статус задачи "${task.title}": ${STATUS_CONFIG[newStatus].label}`
    );

    if (isNowCompleted) {
      addEventLog({
        targetId: equipment.id,
        targetName: equipment.name,
        targetType: 'equipment',
        eventType: 'maintenance',
        severity: 'success',
        description: `Выполнена задача для [${equipment.tag}]: "${task.title}"`,
        userName: currentUser.name,
        userRole: currentUser.role,
      });
    }
  };

  const handleChangeTaskStatus = (task: EquipmentTask, newStatus: TaskStatus) => {
    if (!canEdit) return;
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          status: newStatus,
          completedAt: newStatus === 'completed' ? (t.completedAt || new Date().toISOString()) : undefined,
        };
      }
      return t;
    });

    updateEquipment(
      equipment.id,
      { tasks: updatedTasks },
      `Статус задачи "${task.title}" изменен на ${STATUS_CONFIG[newStatus].label}`
    );
  };

  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    if (!canEdit) return;
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    updateEquipment(
      equipment.id,
      { tasks: updatedTasks },
      `Удалена задача "${taskTitle}" из ${equipment.tag}`
    );
    if (editingTaskId === taskId) {
      resetForm();
    }
  };

  const isOverdue = (dueDate?: string, status?: TaskStatus) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  return (
    <div id="equipment-tasks-section" className="pt-3 border-t border-slate-200 dark:border-white/10 my-3">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-left group cursor-pointer focus:outline-hidden"
        >
          <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ListTodo className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
            Задачи оборудования
          </span>
          <div className="flex items-center gap-1 ml-1">
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono">
              {activeTasks.length > 0 ? `${activeTasks.length} акт.` : `${tasks.length}`}
            </span>
            {urgentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse" title="Срочные задачи">
                {urgentCount} срочн.
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          )}
        </button>

        {canEdit && (
          <button
            type="button"
            onClick={() => handleStartCreate()}
            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            title="Добавить новую задачу для оборудования"
          >
            <Plus className="w-3 h-3" />
            <span>Задача</span>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-2.5">
          {/* Quick Preset Templates */}
          {canEdit && !isCreating && editingTaskId === null && (
            <div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>Быстро назначить задачу:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleStartCreate(tmpl)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-300 dark:hover:border-blue-500/40 border border-slate-200 dark:border-white/10 text-[10.5px] text-slate-700 dark:text-slate-300 transition-colors text-left flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5 shrink-0 text-blue-500" />
                    <span className="truncate">{tmpl.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add / Edit Task Form */}
          {(isCreating || editingTaskId) && canEdit && (
            <form onSubmit={handleSaveTask} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-blue-500/30 dark:border-blue-500/40 shadow-sm space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/10">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-blue-500" />
                  <span>{editingTaskId ? 'Редактировать задачу' : 'Новая задача для оборудования'}</span>
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Название задачи <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Ревизия подшипникового узла"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Priority & Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Приоритет
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="urgent">🔴 Срочно (Аварийный)</option>
                    <option value="high">🟠 Высокий</option>
                    <option value="medium">🔵 Средний</option>
                    <option value="low">⚪ Низкий</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Категория
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="maintenance">ТО / Обслуживание</option>
                    <option value="repair">Ремонт / Замена</option>
                    <option value="inspection">Осмотр / Диагностика</option>
                    <option value="setup">Наладка / Калибровка</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    <span>Исполнитель</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ФИО / Бригада"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>Срок (дедлайн)</span>
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Описание работ / Инструкция
                </label>
                <textarea
                  rows={2}
                  placeholder="Регламент, требуемые запчасти, параметры..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-xs resize-none focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Form buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!taskTitle.trim()}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingTaskId ? 'Сохранить изменения' : 'Добавить задачу'}</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {/* Filter Bar (when tasks exist) */}
          {tasks.length > 0 && (
            <div className="space-y-1.5 pb-1 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between text-[11px] gap-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Все ({tasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('active')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      filterStatus === 'active'
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    В работе ({activeTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('completed')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      filterStatus === 'completed'
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Выполнено ({completedCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => openSearch('tasks')}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  title="Открыть глобальный поиск по всем задачам завода"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>Поиск по всем</span>
                </button>
              </div>

              {/* Quick search input within this equipment */}
              {tasks.length > 2 && (
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по задачам этого станка..."
                    className="w-full pl-6 pr-6 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-blue-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && !isCreating && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center">
              <ListTodo className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto mb-1.5 opacity-70" />
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Нет назначенных задач
              </div>
              <div className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                Добавьте регламентные работы, заявки на ремонт или ТО для этого оборудования
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleStartCreate()}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать первую задачу</span>
                </button>
              )}
            </div>
          )}

          {/* Tasks List */}
          {filteredTasks.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
              {filteredTasks.map(task => {
                const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                const overdue = isOverdue(task.dueDate, task.status);
                const isDone = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-slate-50/60 dark:bg-white/5 border-slate-200/60 dark:border-white/5 opacity-75'
                        : overdue
                        ? 'bg-rose-50/40 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/30'
                        : 'bg-white dark:bg-[#15151A] border-slate-200 dark:border-white/10 shadow-xs'
                    }`}
                  >
                    {/* Top row: Checkbox, Title, Priority, Actions */}
                    <div className="flex items-start gap-2 justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`mt-0.5 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 ${
                            !canEdit ? 'cursor-default' : 'cursor-pointer'
                          }`}
                          title={isDone ? 'Снять отметку о выполнении' : 'Отметить как выполненное'}
                        >
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 hover:text-blue-500" />
                          )}
                        </button>

                        <div 
                          className="min-w-0 flex-1 cursor-pointer group/task"
                          onClick={() => openTaskModal(equipment.id, task.id)}
                          title="Открыть карточку задачи"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs font-bold leading-tight group-hover/task:text-blue-600 dark:group-hover/task:text-blue-400 transition-colors ${
                                isDone
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          {/* Description if present */}
                          {task.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-0.5 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={() => openTaskModal(equipment.id, task.id)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                          title="Открыть карточку задачи"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(task)}
                              className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors"
                              title="Быстрое редактирование"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                              title="Удалить задачу"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Metadata Pill Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[10px]">
                      {/* Priority Badge */}
                      <span className={`px-1.5 py-0.2 rounded border font-semibold ${priorityInfo.badgeClass}`}>
                        {priorityInfo.label}
                      </span>

                      {/* Type Badge */}
                      {task.type && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                          {TYPE_LABELS[task.type] || task.type}
                        </span>
                      )}

                      {/* Status Selector / Badge */}
                      {canEdit ? (
                        <select
                          value={task.status}
                          onChange={(e) => handleChangeTaskStatus(task, e.target.value as TaskStatus)}
                          className="px-1.5 py-0.2 rounded bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                        >
                          <option value="pending">К исполнению</option>
                          <option value="in_progress">В работе</option>
                          <option value="completed">Выполнено</option>
                          <option value="cancelled">Отменено</option>
                        </select>
                      ) : (
                        <span className={`font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      )}

                      {/* Due Date & Overdue */}
                      {task.dueDate && (
                        <span
                          className={`flex items-center gap-0.5 font-mono ${
                            overdue
                              ? 'text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-1 rounded'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                          title={overdue ? 'Срок истек!' : `Срок выполнения: ${task.dueDate}`}
                        >
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{task.dueDate}</span>
                          {overdue && <span className="text-[9px]">⚠️</span>}
                        </span>
                      )}

                      {/* Assignee */}
                      {task.assignedTo && (
                        <span className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]" title={`Исполнитель: ${task.assignedTo}`}>
                          <User className="w-2.5 h-2.5 text-slate-400" />
                          <span className="truncate">{task.assignedTo}</span>
                        </span>
                      )}

                      {/* Completed date if done */}
                      {task.completedAt && (
                        <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-mono ml-auto">
                          ✓ {task.completedAt.split('T')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

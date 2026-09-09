import React, { useState, useEffect, useMemo } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  TaskPriority, 
  TaskStatus, 
  TaskType, 
  TaskChecklistItem 
} from '../types';
import { getHierarchyPath } from '../utils/exportUtils';
import { 
  X, 
  Cpu, 
  CheckSquare, 
  Square, 
  Calendar, 
  User, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  ExternalLink, 
  Plus, 
  CheckCircle2, 
  FileText, 
  Save, 
  Edit3, 
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Link2,
  Share2,
  Copy,
  Globe,
  Paperclip
} from 'lucide-react';
import { 
  copyTextToClipboard, 
  generateTaskUrl, 
  formatExternalUrl, 
  openExternalUrl 
} from '../utils/linkUtils';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; badgeClass: string; activeBtnClass: string }> = {
  urgent: { 
    label: 'Срочно (Аварийный)', 
    badgeClass: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30',
    activeBtnClass: 'bg-rose-600 text-white shadow-xs'
  },
  high: { 
    label: 'Высокий приоритет', 
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    activeBtnClass: 'bg-amber-600 text-white shadow-xs'
  },
  medium: { 
    label: 'Средний приоритет', 
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    activeBtnClass: 'bg-blue-600 text-white shadow-xs'
  },
  low: { 
    label: 'Низкий приоритет', 
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    activeBtnClass: 'bg-slate-600 text-white shadow-xs'
  },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: string; badgeClass: string; btnClass: string }> = {
  pending: { 
    label: 'К исполнению', 
    icon: '⏳', 
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    btnClass: 'hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
  },
  in_progress: { 
    label: 'В работе', 
    icon: '⚡', 
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    btnClass: 'hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700'
  },
  completed: { 
    label: 'Выполнено', 
    icon: '✅', 
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    btnClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
  },
  cancelled: { 
    label: 'Отменено', 
    icon: '🚫', 
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    btnClass: 'hover:bg-slate-50 dark:hover:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
  },
};

const TYPE_CONFIG: Record<TaskType, { label: string; icon: string }> = {
  maintenance: { label: 'Техобслуживание (ТО)', icon: '🔧' },
  repair: { label: 'Ремонт узла', icon: '🛠️' },
  inspection: { label: 'Осмотр / Диагностика', icon: '🔍' },
  setup: { label: 'Наладка / Калибровка', icon: '⚙️' },
  other: { label: 'Поручение / Задача', icon: '📝' },
};

export const TaskModal: React.FC = () => {
  const {
    state,
    activeTaskModal,
    closeTaskModal,
    updateEquipment,
    addEventLog,
    focusNode,
    showToast,
    currentUser,
  } = useFactory();

  // Find target equipment and task
  const equipment = useMemo(() => {
    if (!activeTaskModal) return null;
    return state.equipment.find(e => e.id === activeTaskModal.equipmentId) || null;
  }, [state.equipment, activeTaskModal]);

  const task = useMemo(() => {
    if (!equipment || !activeTaskModal) return null;
    return (equipment.tasks || []).find(t => t.id === activeTaskModal.taskId) || null;
  }, [equipment, activeTaskModal]);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('maintenance');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [copiedTaskLink, setCopiedTaskLink] = useState(false);
  const [copiedExternalLink, setCopiedExternalLink] = useState(false);
  const [isAddingLinkInline, setIsAddingLinkInline] = useState(false);
  const [inlineLinkValue, setInlineLinkValue] = useState('');

  // Sync state with current task when opened
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'pending');
      setPriority(task.priority || 'medium');
      setType(task.type || 'maintenance');
      setAssignedTo(task.assignedTo || '');
      setDueDate(task.dueDate || '');
      setChecklist(task.checklist || []);
      const currentLink = task.linkUrl || task.url || '';
      setLinkUrl(currentLink);
      setInlineLinkValue(currentLink);
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setIsAddingLinkInline(false);
      setCopiedTaskLink(false);
      setCopiedExternalLink(false);
    }
  }, [task]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTaskModal) {
        closeTaskModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTaskModal, closeTaskModal]);

  if (!activeTaskModal || !equipment || !task) {
    return null;
  }

  const canEdit = currentUser.role !== 'viewer';

  // Calculate deadline status
  const todayStr = new Date().toISOString().split('T')[0];
  let deadlineLabel = '';
  let deadlineColor = 'text-slate-500 dark:text-slate-400';
  let isOverdue = false;

  if (task.dueDate) {
    const diffDays = Math.ceil((new Date(task.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
    if (task.status === 'completed') {
      deadlineLabel = `Срок был: ${task.dueDate}`;
    } else if (diffDays < 0) {
      isOverdue = true;
      deadlineLabel = `Просрочено на ${Math.abs(diffDays)} дн.!`;
      deadlineColor = 'text-rose-600 dark:text-rose-400 font-bold';
    } else if (diffDays === 0) {
      deadlineLabel = 'Срок выполнения — СЕГОДНЯ!';
      deadlineColor = 'text-amber-600 dark:text-amber-400 font-bold';
    } else if (diffDays === 1) {
      deadlineLabel = 'Срок завтра (остался 1 день)';
      deadlineColor = 'text-amber-600 dark:text-amber-400';
    } else {
      deadlineLabel = `Осталось ${diffDays} дн. (до ${task.dueDate})`;
      deadlineColor = 'text-slate-600 dark:text-slate-300';
    }
  }

  // Calculate checklist progress
  const completedChecklistCount = (checklist || []).filter(c => c.completed).length;
  const totalChecklistCount = (checklist || []).length;
  const checklistPercent = totalChecklistCount > 0 
    ? Math.round((completedChecklistCount / totalChecklistCount) * 100) 
    : 0;

  // Save changes to task
  const handleSave = (updatedFields: Partial<typeof task>) => {
    if (!equipment.tasks) return;

    const updatedTasks = equipment.tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          ...updatedFields,
        };
      }
      return t;
    });

    updateEquipment(
      equipment.id,
      { tasks: updatedTasks },
      `Обновлена задача "${updatedFields.title || task.title}" для ${equipment.tag}`
    );
  };

  // Quick Status Change
  const handleQuickStatusChange = (newStatus: TaskStatus) => {
    if (!canEdit) {
      showToast('Ограничение роли', 'Наблюдатели не могут изменять статус задач', 'warning');
      return;
    }

    setStatus(newStatus);
    const isNowCompleted = newStatus === 'completed';
    const completedAt = isNowCompleted ? new Date().toISOString() : undefined;

    handleSave({
      status: newStatus,
      completedAt,
    });

    addEventLog({
      targetId: equipment.id,
      targetName: equipment.name,
      targetType: 'equipment',
      eventType: 'maintenance',
      severity: isNowCompleted ? 'success' : 'info',
      description: `Смена статуса задачи [${equipment.tag}] "${task.title}": ${STATUS_CONFIG[newStatus].label}`,
      userName: currentUser.name,
      userRole: currentUser.role,
    });

    showToast(
      `Статус изменен: ${STATUS_CONFIG[newStatus].label}`,
      `[${equipment.tag}] ${task.title}`,
      isNowCompleted ? 'success' : 'info'
    );
  };

  // Copy task deep link for external services
  const handleCopyTaskDeepLink = async (format: 'url' | 'markdown' | 'full' = 'url') => {
    const taskUrl = generateTaskUrl(equipment.id, task.id);
    let textToCopy = taskUrl;
    let label = 'Прямая ссылка на задачу';

    if (format === 'markdown') {
      textToCopy = `[Задача: ${task.title} (${equipment.tag})](${taskUrl})`;
      label = 'Markdown-ссылка';
    } else if (format === 'full') {
      const typeLabel = TYPE_CONFIG[task.type || 'maintenance']?.label || 'ТО';
      const statusLabel = STATUS_CONFIG[task.status]?.label || task.status;
      const priorityLabel = PRIORITY_CONFIG[task.priority || 'medium']?.label || 'Средний';
      textToCopy = `📋 Задача ТО: "${task.title}"\n📍 Оборудование: [${equipment.tag}] ${equipment.name}\n🔧 Тип: ${typeLabel} | Приоритет: ${priorityLabel}\n⚡ Статус: ${statusLabel}${task.assignedTo ? `\n👤 Исполнитель: ${task.assignedTo}` : ''}${task.dueDate ? `\n📅 Срок: ${task.dueDate}` : ''}\n🔗 Ссылка: ${taskUrl}`;
      label = 'Сводка задачи со ссылкой';
    }

    const success = await copyTextToClipboard(textToCopy);
    if (success) {
      setCopiedTaskLink(true);
      showToast(
        `${label} скопирована! 📋`,
        'Готово для вставки в мессенджер (Telegram, WhatsApp), Jira, 1C или документ',
        'success'
      );
      setTimeout(() => setCopiedTaskLink(false), 2500);
    } else {
      showToast('Не удалось скопировать', 'Пожалуйста, скопируйте ссылку вручную', 'error');
    }
  };

  // Copy external resource link stored in task
  const handleCopyExternalLink = async () => {
    const rawUrl = task.linkUrl || task.url;
    if (!rawUrl) return;
    const formatted = formatExternalUrl(rawUrl);
    const success = await copyTextToClipboard(formatted);
    if (success) {
      setCopiedExternalLink(true);
      showToast('Внешняя ссылка скопирована 🔗', formatted, 'success');
      setTimeout(() => setCopiedExternalLink(false), 2500);
    }
  };

  // Quick inline save of external link
  const handleSaveInlineLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inlineLinkValue.trim();
    handleSave({
      linkUrl: trimmed || undefined,
      url: trimmed || undefined,
    });
    setLinkUrl(trimmed);
    setIsAddingLinkInline(false);
    showToast(
      trimmed ? 'Внешняя ссылка прикреплена к задаче' : 'Внешняя ссылка удалена',
      `[${equipment.tag}] ${task.title}`,
      'success'
    );
  };

  const handleRemoveExternalLink = () => {
    handleSave({
      linkUrl: undefined,
      url: undefined,
    });
    setLinkUrl('');
    setInlineLinkValue('');
    showToast('Ссылка удалена из задачи', `[${equipment.tag}] ${task.title}`, 'info');
  };

  // Full form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const isNowCompleted = status === 'completed';
    const completedAt = isNowCompleted ? (task.completedAt || new Date().toISOString()) : undefined;

    handleSave({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      type,
      assignedTo: assignedTo.trim() || undefined,
      dueDate: dueDate || undefined,
      linkUrl: linkUrl.trim() || undefined,
      url: linkUrl.trim() || undefined,
      checklist,
      completedAt,
    });

    setIsEditing(false);
    showToast('Задача сохранена', `[${equipment.tag}] ${title}`, 'success');
  };

  // Checklist Item Toggle
  const handleToggleChecklistItem = (itemId: string) => {
    if (!canEdit) return;

    const nextChecklist = checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    setChecklist(nextChecklist);
    handleSave({ checklist: nextChecklist });
  };

  // Add Checklist Item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem: TaskChecklistItem = {
      id: `check_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: newChecklistText.trim(),
      completed: false,
    };

    const nextChecklist = [...checklist, newItem];
    setChecklist(nextChecklist);
    setNewChecklistText('');
    handleSave({ checklist: nextChecklist });
  };

  // Remove Checklist Item
  const handleRemoveChecklistItem = (itemId: string) => {
    if (!canEdit) return;
    const nextChecklist = checklist.filter(c => c.id !== itemId);
    setChecklist(nextChecklist);
    handleSave({ checklist: nextChecklist });
  };

  // Delete Task
  const handleDeleteTask = () => {
    if (!canEdit || !equipment.tasks) return;

    const updatedTasks = equipment.tasks.filter(t => t.id !== task.id);
    updateEquipment(
      equipment.id,
      { tasks: updatedTasks },
      `Удалена задача "${task.title}" у ${equipment.tag}`
    );

    addEventLog({
      targetId: equipment.id,
      targetName: equipment.name,
      targetType: 'equipment',
      eventType: 'alert',
      severity: 'warning',
      description: `Удалена задача [${equipment.tag}] "${task.title}"`,
      userName: currentUser.name,
      userRole: currentUser.role,
    });

    showToast('Задача удалена', `Задача "${task.title}" удалена`, 'info');
    closeTaskModal();
  };

  // Focus equipment on canvas and close modal
  const handleGoToEquipment = () => {
    focusNode(equipment.id);
    closeTaskModal();
    showToast(
      `Оборудование [${equipment.tag}]`,
      `Камера наведена на ${equipment.name}`,
      'info'
    );
  };

  // Quick Log entry for this task
  const handleCreateTaskLog = () => {
    addEventLog({
      targetId: equipment.id,
      targetName: equipment.name,
      targetType: 'equipment',
      eventType: 'maintenance',
      severity: 'info',
      description: `Отметка по задаче [${equipment.tag}] "${task.title}": выполнена проверка состояния мастером ${currentUser.name}`,
      userName: currentUser.name,
      userRole: currentUser.role,
    });
    showToast('Запись внесена в журнал', `Событие по задаче "${task.title}" зафиксировано`, 'success');
  };

  const hierarchyLocation = equipment.parentId 
    ? getHierarchyPath(equipment.parentId, state.containers) 
    : 'Главная производственная площадка';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeTaskModal();
      }}
    >
      <div 
        id="task-details-dialog"
        className="w-full max-w-2xl bg-white dark:bg-[#121217] text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161C] flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Top badges: Equipment link & Task Type */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <button
                type="button"
                onClick={handleGoToEquipment}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/25 border border-blue-200 dark:border-blue-500/30 text-xs font-mono font-bold transition-colors cursor-pointer group"
                title="Перейти к оборудованию на схеме холста"
              >
                <Cpu className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>[{equipment.tag}] {equipment.name}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </button>

              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-medium">
                {TYPE_CONFIG[task.type || 'maintenance'].icon} {TYPE_CONFIG[task.type || 'maintenance'].label}
              </span>

              <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${PRIORITY_CONFIG[task.priority || 'medium'].badgeClass}`}>
                {PRIORITY_CONFIG[task.priority || 'medium'].label}
              </span>

              <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${STATUS_CONFIG[task.status].badgeClass}`}>
                {STATUS_CONFIG[task.status].icon} {STATUS_CONFIG[task.status].label}
              </span>
            </div>

            {/* Title */}
            {!isEditing ? (
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {task.title}
              </h2>
            ) : (
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Редактирование карточки задачи
              </div>
            )}

            {/* Sub-location info */}
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>📍 {hierarchyLocation}</span>
              {task.createdAt && (
                <span className="opacity-75">| Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')} {task.createdBy ? `(${task.createdBy})` : ''}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Copy Task Deep Link Button */}
            <button
              type="button"
              onClick={() => handleCopyTaskDeepLink('url')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                copiedTaskLink
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 font-bold'
                  : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-blue-400'
              }`}
              title="Скопировать ссылку на задачу для отправки в Telegram, Jira, 1C или браузер"
            >
              {copiedTaskLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">Ссылка на задачу</span>
                </>
              )}
            </button>

            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="Редактировать задачу"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeTaskModal}
              className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Закрыть окно (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Quick Action Status Bar */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Статус исполнения задачи
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['pending', 'in_progress', 'completed', 'cancelled'] as TaskStatus[]).map((st) => {
                const isCurrent = task.status === st;
                const cfg = STATUS_CONFIG[st];

                return (
                  <button
                    key={st}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleQuickStatusChange(st)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                      isCurrent
                        ? `${cfg.badgeClass} ring-2 ring-blue-500/40 font-bold shadow-xs`
                        : `${cfg.btnClass} bg-white dark:bg-[#181820]`
                    } ${!canEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIEW MODE */}
          {!isEditing ? (
            <>
              {/* Key Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Due Date Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>Срок выполнения</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Не назначен'}
                  </div>
                  {task.dueDate && (
                    <div className={`text-[11px] mt-1 ${deadlineColor}`}>
                      {deadlineLabel}
                    </div>
                  )}
                </div>

                {/* Assignee Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ответственный мастер</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {task.assignedTo || 'Не назначен'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {task.assignedTo ? 'Исполнитель утвержден' : 'Свободная задача'}
                  </div>
                </div>

                {/* Priority & Equipment Health Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 sm:col-span-2 md:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Статус станка</span>
                  </div>
                  <div className="text-sm font-bold capitalize text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      equipment.status === 'critical' ? 'bg-red-500 animate-pulse' :
                      equipment.status === 'warning' ? 'bg-amber-500' :
                      equipment.status === 'maintenance' ? 'bg-indigo-500' :
                      'bg-emerald-500'
                    }`} />
                    <span>{equipment.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {equipment.powerKw ? `${equipment.powerKw} кВт` : 'Питание подключено'}
                  </div>
                </div>
              </div>

              {/* Task External Link (URL to regulations, Jira, tickets, docs) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <span>Внешняя ссылка задачи (регламент / тикет / документация)</span>
                  </div>
                  {canEdit && (task.linkUrl || task.url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setInlineLinkValue(task.linkUrl || task.url || '');
                        setIsAddingLinkInline(true);
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Изменить ссылку
                    </button>
                  )}
                </div>

                {task.linkUrl || task.url ? (
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-500/20 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300 font-mono">
                            URL
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate block">
                            {formatExternalUrl(task.linkUrl || task.url)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Прикрепленный внешний ресурс к задаче оборудования {equipment.tag}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyExternalLink}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                          copiedExternalLink
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                            : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20'
                        }`}
                        title="Скопировать внешнюю ссылку в буфер обмена"
                      >
                        {copiedExternalLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Скопировано!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Копировать URL</span>
                          </>
                        )}
                      </button>

                      <a
                        href={formatExternalUrl(task.linkUrl || task.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="Открыть внешнюю ссылку в новой вкладке"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Перейти</span>
                      </a>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={handleRemoveExternalLink}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Удалить внешнюю ссылку"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : isAddingLinkInline && canEdit ? (
                  <form onSubmit={handleSaveInlineLink} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-blue-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>Прикрепить внешнюю ссылку</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingLinkInline(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        Отмена
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="url"
                          autoFocus
                          value={inlineLinkValue}
                          onChange={(e) => setInlineLinkValue(e.target.value)}
                          placeholder="https://jira.company.ru/TASK-101 или https://wiki/page..."
                          className="w-full pl-8 pr-16 py-1.5 rounded-lg bg-white dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) setInlineLinkValue(text.trim());
                            } catch {
                              // ignore
                            }
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 rounded font-medium transition-colors"
                        >
                          Вставить
                        </button>
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Сохранить
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 dark:text-slate-500 italic">
                      Внешняя ссылка на регламент, тикет или документацию не указана.
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineLinkValue('');
                          setIsAddingLinkInline(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Прикрепить ссылку</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Share Task Link (Deep link to share with other services/messengers) */}
              <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/15 border border-purple-200/70 dark:border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-300">
                    <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Ссылка на задачу для других сервисов</span>
                  </div>
                  <span className="text-[10.5px] text-purple-600/80 dark:text-purple-400/80">
                    Прямой переход к этой задаче
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={generateTaskUrl(equipment.id, task.id)}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#161620] border border-purple-200 dark:border-purple-500/30 text-slate-800 dark:text-slate-200 text-xs font-mono select-all focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyTaskDeepLink('url')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      copiedTaskLink
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                    }`}
                    title="Скопировать ссылку для вставки в мессенджер, тикет или письмо"
                  >
                    {copiedTaskLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Additional copy formats */}
                <div className="flex items-center gap-2 pt-1 border-t border-purple-200/50 dark:border-purple-500/10 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Вставить как:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyTaskDeepLink('markdown')}
                    className="text-purple-700 dark:text-purple-300 hover:underline font-medium cursor-pointer"
                    title="[Задача: Название (Тег)](URL)"
                  >
                    Markdown-ссылка
                  </button>
                  <span className="text-slate-300 dark:text-white/20">•</span>
                  <button
                    type="button"
                    onClick={() => handleCopyTaskDeepLink('full')}
                    className="text-purple-700 dark:text-purple-300 hover:underline font-medium cursor-pointer"
                    title="Полный текст со статусом, исполнителем и ссылкой для Telegram / WhatsApp"
                  >
                    Сводка для мессенджера
                  </button>
                </div>
              </div>

              {/* Description & Work Instructions */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Описание и регламентные указания</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                  {task.description || (
                    <span className="text-slate-400 dark:text-slate-500 italic">
                      Подробные указания к задаче не добавлены. Нажмите кнопку редактирования, чтобы внести технический регламент или замечания.
                    </span>
                  )}
                </div>
              </div>

              {/* Interactive Checklist Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Контрольный чек-лист операций ({completedChecklistCount}/{totalChecklistCount})</span>
                  </div>

                  {totalChecklistCount > 0 && (
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {checklistPercent}% выполнено
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {totalChecklistCount > 0 && (
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full" 
                      style={{ width: `${checklistPercent}%` }} 
                    />
                  </div>
                )}

                {/* Checklist items list */}
                <div className="space-y-1.5">
                  {checklist.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                        item.completed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-500 dark:text-slate-400'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-blue-400 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {item.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={`text-xs ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                          {item.text}
                        </span>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveChecklistItem(item.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors opacity-60 hover:opacity-100"
                          title="Удалить пункт"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add checklist item inline form */}
                  {canEdit && (
                    <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Добавить пункт проверки / контрольную операцию..."
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!newChecklistText.trim()}
                        className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Добавить</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* EDIT FORM MODE */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Наименование задачи *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Замена подшипника привода или плановое ТО"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Тип регламентных работ
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TaskType)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="maintenance">🔧 Техобслуживание (ТО)</option>
                    <option value="repair">🛠️ Ремонт узла</option>
                    <option value="inspection">🔍 Осмотр / Диагностика</option>
                    <option value="setup">⚙️ Наладка / Калибровка</option>
                    <option value="other">📝 Поручение / Задача</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Приоритет задачи
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="urgent">🔴 Срочно (Аварийный)</option>
                    <option value="high">🟠 Высокий приоритет</option>
                    <option value="medium">🔵 Средний приоритет</option>
                    <option value="low">⚪ Низкий приоритет</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Статус задачи
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="pending">⏳ К исполнению</option>
                    <option value="in_progress">⚡ В работе</option>
                    <option value="completed">✅ Выполнено</option>
                    <option value="cancelled">🚫 Отменено</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Ответственный мастер
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="ФИО инженера или смены"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Срок завершения
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* External Link Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Внешняя ссылка (URL на регламент, тикет, документацию или ERP)</span>
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-normal">Необязательно</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://jira.company.ru/TASK-101 или https://wiki/page..."
                    className="w-full pl-3 pr-24 py-2 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                  <div className="absolute right-1.5 flex items-center gap-1">
                    {linkUrl && (
                      <button
                        type="button"
                        onClick={() => setLinkUrl('')}
                        className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                        title="Очистить поле ссылки"
                      >
                        Очистить
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setLinkUrl(text.trim());
                        } catch {
                          // ignore clipboard permission
                        }
                      }}
                      className="px-2 py-0.5 text-[10.5px] bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-medium rounded-md transition-colors cursor-pointer"
                      title="Вставить из буфера обмена"
                    >
                      Вставить
                    </button>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">
                  Прямой переход к внешнему регламенту, заявке в ServiceDesk/Jira, схеме или паспорту оборудования.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Описание и регламентные указания
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите необходимые работы, требуемые запчасти, параметры затяжки или нормы безопасности..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#181820] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить изменения</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161C] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {/* Go to equipment on canvas */}
            <button
              type="button"
              onClick={handleGoToEquipment}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/25 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Центрировать холст на этом станке"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Показать на схеме</span>
            </button>

            {/* Quick Log Note Button */}
            <button
              type="button"
              onClick={handleCreateTaskLog}
              className="px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Добавить отметку по этой задаче в оперативный журнал"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Запись в журнал</span>
            </button>

            {/* Copy Task Link for External Services */}
            <button
              type="button"
              onClick={() => handleCopyTaskDeepLink('url')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                copiedTaskLink
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 font-bold'
                  : 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/25 border border-purple-200 dark:border-purple-500/30'
              }`}
              title="Скопировать прямую ссылку на задачу для отправки коллегам или вставки в тикет"
            >
              {copiedTaskLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ссылка скопирована!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Копировать ссылку</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Delete button / confirm */}
            {canEdit && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Удалить эту задачу"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold px-1">Удалить?</span>
                    <button
                      type="button"
                      onClick={handleDeleteTask}
                      className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors"
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-0.5 rounded-lg text-slate-500 dark:text-slate-400 text-xs hover:bg-white/10 transition-colors"
                    >
                      Нет
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={closeTaskModal}
              className="px-4 py-1.5 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

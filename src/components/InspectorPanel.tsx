import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  EquipmentStatus, 
  EquipmentType, 
  CustomProperty, 
  LinkType, 
  LinkStyle,
  LinkDirection 
} from '../types';
import { getHierarchyPath } from '../utils/exportUtils';
import { 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Wrench, 
  PauseCircle, 
  Layers, 
  Zap, 
  Cpu, 
  Activity, 
  FolderTree, 
  Calendar, 
  Share2, 
  Edit3,
  Sliders,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Focus,
  Scan,
  Barcode,
  Tag,
  Copy,
  CopyPlus,
  ClipboardPaste,
  Search,
  ExternalLink
} from 'lucide-react';
import { ElementLinksSection } from './ElementLinksSection';
import { EquipmentTasksSection } from './EquipmentTasksSection';
import { ListTodo } from 'lucide-react';
import { openExternalUrl } from '../utils/linkUtils';

export const InspectorPanel: React.FC = () => {
  const {
    state,
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    toggleSelectId,
    batchDelete,
    updateEquipment,
    deleteEquipment,
    updateContainer,
    deleteContainer,
    toggleContainerCollapse,
    toggleEquipmentCollapse,
    updateLink,
    deleteLink,
    currentUser,
    focusNode,
    focusedContainerId,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
    fitContainerToScreen,
    openShareModal,
    copySelected,
    pasteElements,
    duplicateSelected,
    hasClipboard,
    isMobileSummaryOpen,
    setIsMobileSummaryOpen,
    isInspectorMobileOpen,
    setIsInspectorMobileOpen,
    mobileSheetSnap,
    setMobileSheetSnap,
    triggerHaptic,
    openSearch,
  } = useFactory();

  const getSheetSnapClass = () => {
    if (mobileSheetSnap === 'hidden') return 'hidden';
    if (mobileSheetSnap === 'peek') return 'fixed inset-x-0 bottom-0 z-40 max-h-[86px] h-[86px] w-full border-t border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-xl shadow-2xl rounded-t-3xl flex flex-col overflow-hidden';
    if (mobileSheetSnap === 'half') return 'fixed inset-x-0 bottom-0 z-40 max-h-[50dvh] max-h-[50vh] h-[50dvh] w-full border-t border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-xl shadow-2xl rounded-t-3xl flex flex-col';
    return 'fixed inset-x-0 bottom-0 z-40 max-h-[88dvh] max-h-[88vh] h-[88dvh] w-full border-t border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-xl shadow-2xl rounded-t-3xl flex flex-col';
  };

  const cycleSheetSnap = () => {
    triggerHaptic(15);
    if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
    else if (mobileSheetSnap === 'half') setMobileSheetSnap('full');
    else setMobileSheetSnap('peek');
  };

  const [newPropName, setNewPropName] = useState('');
  const [newPropValue, setNewPropValue] = useState('');
  const [newPropUnit, setNewPropUnit] = useState('');

  // Collapsible sections (скрывающиеся списки для мобильных и десктопа)
  const [eqSections, setEqSections] = useState({ basic: true, props: true, children: true, links: false, actions: true });
  const [contSections, setContSections] = useState({ focus: true, basic: true, dimensions: true, children: true, links: false, actions: true });
  const [overviewSections, setOverviewSections] = useState({ rate: true, kpi: true, tasks: true, tree: true });
  const [multiSections, setMultiSections] = useState({ summary: true, status: true, items: true, actions: true });

  const toggleEqSection = (key: keyof typeof eqSections) => setEqSections(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleContSection = (key: keyof typeof contSections) => setContSections(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleOverviewSection = (key: keyof typeof overviewSections) => setOverviewSections(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleMultiSection = (key: keyof typeof multiSections) => setMultiSections(prev => ({ ...prev, [key]: !prev[key] }));

  const effectiveId = selectedId || (selectedIds.length === 0 ? focusedContainerId : null);
  const selectedEquipment = state.equipment.find(e => e.id === effectiveId);
  const selectedContainer = state.containers.find(c => c.id === effectiveId);
  const selectedLink = state.links.find(l => l.id === selectedId);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'operator' || currentUser.role === 'maintenance';
  const canAdmin = currentUser.role === 'admin';

  // If multiple items are selected, show Group Selection Inspector
  if (selectedIds.length > 1) {
    const selectedEqList = state.equipment.filter(e => selectedIds.includes(e.id));
    const selectedContList = state.containers.filter(c => selectedIds.includes(c.id));
    const selectedLinkList = state.links.filter(l => selectedIds.includes(l.id));

    const totalKw = selectedEqList.reduce((sum, e) => sum + (e.powerKw || 0), 0);
    const critCount = selectedEqList.filter(e => e.status === 'critical').length;
    const warnCount = selectedEqList.filter(e => e.status === 'warning').length;
    const normCount = selectedEqList.filter(e => e.status === 'normal').length;

    const handleBatchStatus = (status: EquipmentStatus) => {
      selectedEqList.forEach(eq => {
        updateEquipment(eq.id, { status }, `Групповое изменение статуса: ${status}`);
      });
    };

    return (
      <>
        {/* Mobile backdrop overlay - only if half or full on mobile */}
        {mobileSheetSnap !== 'hidden' && mobileSheetSnap !== 'peek' && (
          <div 
            onClick={() => {
              triggerHaptic(15);
              setMobileSheetSnap('peek');
            }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          />
        )}
        <aside 
          id="factory-inspector-multiselect"
          className={`${getSheetSnapClass()} lg:static lg:inset-auto lg:h-full lg:max-h-none lg:w-80 lg:rounded-none lg:border-t-0 lg:border-l lg:border-slate-200 dark:lg:border-white/10 lg:bg-white dark:lg:bg-[#0F0F12] lg:flex lg:flex-col shrink-0 min-h-0 overflow-hidden shadow-sm text-slate-700 dark:text-slate-300 select-none transition-all`}
        >
          {/* Mobile Drag Indicator */}
          <div 
            onClick={cycleSheetSnap}
            className="lg:hidden flex items-center justify-center pt-2.5 pb-1 cursor-pointer shrink-0 touch-none active:opacity-60"
            title="Нажмите для переключения размера панели"
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/30 hover:bg-slate-400 dark:hover:bg-white/50 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0F0F12]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Групповое выделение ({selectedIds.length})
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleSheetSnap}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors lg:hidden"
                title={mobileSheetSnap === 'full' ? 'Свернуть' : 'Развернуть'}
              >
                {mobileSheetSnap === 'full' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedId(null);
                  setSelectedIds([]);
                  setMobileSheetSnap('hidden');
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                title="Снять выделение"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container */}
          <div 
            id="multiselect-inspector-scroll-container"
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 pb-12 overscroll-contain space-y-3"
          >
            {/* Selection Count Summary */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <span>Всего выбрано: {selectedIds.length} объектов</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center mt-2">
              <div className="p-1.5 rounded-lg bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Оборудование</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{selectedEqList.length}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Участки</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{selectedContList.length}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Связи</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{selectedLinkList.length}</div>
              </div>
            </div>
          </div>

        {/* Selected Equipment Metrics */}
        {selectedEqList.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Суммарные показатели
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Суммарная мощность:
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{totalKw} кВт</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 pt-1.5">
              <span className="text-slate-500 dark:text-slate-400">Статусы:</span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-emerald-500" title="В норме">{normCount} OK</span>
                {warnCount > 0 && <span className="text-amber-500" title="Предупреждение">{warnCount} Вним.</span>}
                {critCount > 0 && <span className="text-red-500" title="Авария">{critCount} Авар.</span>}
              </div>
            </div>
          </div>
        )}

        {/* Batch Status Actions for Equipment */}
        {canEdit && selectedEqList.length > 0 && (
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
              Массовое изменение статуса
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleBatchStatus('normal')}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>В норме</span>
              </button>
              <button
                onClick={() => handleBatchStatus('warning')}
                className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Внимание</span>
              </button>
              <button
                onClick={() => handleBatchStatus('maintenance')}
                className="px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>ТО</span>
              </button>
              <button
                onClick={() => handleBatchStatus('critical')}
                className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Авария</span>
              </button>
            </div>
          </div>
        )}

        {/* Selected Items List */}
        <div className="flex-1 min-h-[140px] mb-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
            Состав группы
          </label>
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {selectedContList.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="font-semibold truncate max-w-[130px] text-slate-800 dark:text-slate-200">{c.title}</span>
                </div>
                <button
                  onClick={() => toggleSelectId(c.id, true)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Убрать из выделения"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {selectedEqList.map(eq => (
              <div
                key={eq.id}
                className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-mono text-[10px] px-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">{eq.tag}</span>
                  <span className="truncate max-w-[110px] text-slate-800 dark:text-slate-200">{eq.name}</span>
                </div>
                <button
                  onClick={() => toggleSelectId(eq.id, true)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Убрать из выделения"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {selectedLinkList.map(l => (
              <div
                key={l.id}
                className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs"
              >
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  Связь: {l.label || l.type}
                </span>
                <button
                  onClick={() => toggleSelectId(l.id, true)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Убрать из выделения"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bulk Clipboard & Delete Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 mt-auto space-y-2">
          {canEdit && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copySelected}
                className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Копировать в буфер (Ctrl+C)"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span>Копировать</span>
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Дублировать по центру экрана (Ctrl+D)"
              >
                <CopyPlus className="w-3.5 h-3.5 text-blue-500" />
                <span>Дублировать</span>
              </button>
            </div>
          )}

          {canAdmin && (
            <button
              onClick={() => batchDelete(selectedIds)}
              className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить выбранные ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
    );
  }

  // Add custom property to selected equipment
  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !newPropName.trim()) return;

    const newProp: CustomProperty = {
      id: 'p_' + Date.now(),
      name: newPropName.trim(),
      value: isNaN(Number(newPropValue)) ? newPropValue : Number(newPropValue),
      type: isNaN(Number(newPropValue)) ? 'text' : 'number',
      unit: newPropUnit.trim() || undefined,
    };

    updateEquipment(selectedEquipment.id, {
      properties: [...selectedEquipment.properties, newProp]
    }, `Добавлено свойство "${newProp.name}" для ${selectedEquipment.tag}`);

    setNewPropName('');
    setNewPropValue('');
    setNewPropUnit('');
  };

  const handleDeleteProperty = (propId: string) => {
    if (!selectedEquipment) return;
    updateEquipment(selectedEquipment.id, {
      properties: selectedEquipment.properties.filter(p => p.id !== propId)
    }, `Удалено свойство для ${selectedEquipment.tag}`);
  };

  const handleUpdateProperty = (propId: string, updates: Partial<CustomProperty>) => {
    if (!selectedEquipment) return;
    updateEquipment(selectedEquipment.id, {
      properties: selectedEquipment.properties.map(p => p.id === propId ? { ...p, ...updates } : p)
    });
  };

  const handleQuickAddChip = (propName: string, unit: string, defaultValue: string = '0') => {
    if (!selectedEquipment || !canEdit) return;
    const numVal = Number(defaultValue);
    const isNum = !isNaN(numVal) && defaultValue !== '';
    const newProp: CustomProperty = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: propName,
      value: isNum ? numVal : defaultValue,
      type: isNum ? 'number' : 'text',
      unit: unit || undefined,
    };
    updateEquipment(selectedEquipment.id, {
      properties: [...selectedEquipment.properties, newProp]
    }, `Добавлен параметр "${propName}" для ${selectedEquipment.tag}`);
  };

  // If nothing selected, show Factory Overview Panel
  if (!selectedEquipment && !selectedContainer && !selectedLink) {
    const totalEq = state.equipment.length;
    const normalCount = state.equipment.filter(e => e.status === 'normal').length;
    const critCount = state.equipment.filter(e => e.status === 'critical').length;
    const warnCount = state.equipment.filter(e => e.status === 'warning').length;
    const maintCount = state.equipment.filter(e => e.status === 'maintenance').length;
    const totalPower = state.equipment.reduce((sum, e) => sum + (e.powerKw || 0), 0);
    const operationalPercent = totalEq > 0 ? Math.round((normalCount / totalEq) * 100) : 100;

    const allEqTasks = state.equipment.flatMap(e => 
      (e.tasks || []).map(t => ({ ...t, eqTag: e.tag, eqName: e.name, eqId: e.id }))
    );
    const activeEqTasks = allEqTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const urgentEqTasks = allEqTasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed');

    return (
      <>
        {/* Mobile floating button to open overview if closed */}
        <button
          onClick={() => setIsMobileSummaryOpen(true)}
          className="fixed top-14 left-3 z-30 lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#0F0F12]/95 border border-slate-200 dark:border-white/15 shadow-md text-xs font-semibold text-slate-800 dark:text-slate-200 backdrop-blur-md active:scale-95 transition-all"
          title="Открыть сводку предприятия и структуру цехов"
        >
          <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Сводка: {operationalPercent}% OK</span>
        </button>

        {/* Mobile backdrop overlay */}
        {isMobileSummaryOpen && (
          <div 
            onClick={() => setIsMobileSummaryOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
          />
        )}

        <aside 
          id="factory-inspector-overview"
          className={`
            ${isMobileSummaryOpen 
              ? 'fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] max-h-[85vh] w-full border-t border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-xl shadow-2xl rounded-t-3xl flex flex-col' 
              : 'hidden'
            }
            lg:static lg:inset-auto lg:h-full lg:max-h-none lg:w-80 lg:rounded-none lg:border-t-0 lg:border-l lg:border-slate-200 dark:lg:border-white/10 lg:bg-white dark:lg:bg-[#0F0F12] lg:flex lg:flex-col shrink-0 min-h-0 overflow-hidden shadow-sm
            text-slate-700 dark:text-slate-300 select-none transition-all
          `}
        >
          {/* Mobile Drag Handle & Header */}
          <div className="lg:hidden flex items-center justify-between p-4 pb-2.5 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0F0F12]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Сводка завода & Дерево цехов</span>
            </div>
            <button
              onClick={() => setIsMobileSummaryOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 p-4 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0F0F12]">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Сводка предприятия
            </h3>
          </div>

          {/* Scrollable Overview Body */}
          <div 
            id="overview-inspector-scroll-container"
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 pb-12 overscroll-contain space-y-3"
          >
            {/* Section 1: Operational Rate Meter (Collapsible) */}
            <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleOverviewSection('rate')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Готовность завода
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {operationalPercent}%
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${overviewSections.rate ? 'rotate-180' : ''}`} />
            </button>
            {overviewSections.rate && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-200/50 dark:border-white/5">
                <div className="w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                  <div style={{ width: `${(normalCount / totalEq) * 100}%` }} className="bg-emerald-500 h-full" />
                  <div style={{ width: `${(warnCount / totalEq) * 100}%` }} className="bg-amber-500 h-full" />
                  <div style={{ width: `${(critCount / totalEq) * 100}%` }} className="bg-red-500 h-full" />
                  <div style={{ width: `${(maintCount / totalEq) * 100}%` }} className="bg-indigo-500 h-full" />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-600 dark:text-slate-400 mt-2 font-medium text-center">
                  <span className="p-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Штатно: {normalCount}</span>
                  <span className="p-1 rounded bg-red-500/10 text-red-700 dark:text-red-300">Аварии: {critCount}</span>
                  <span className="p-1 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">ТО: {maintCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Key KPIs (Collapsible) */}
          <div className="my-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleOverviewSection('kpi')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Ключевые показатели (KPI)
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${overviewSections.kpi ? 'rotate-180' : ''}`} />
            </button>
            {overviewSections.kpi && (
              <div className="p-3 pt-1 border-t border-slate-200/50 dark:border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Оборудование</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{totalEq} ед.</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Цехи и зоны</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{state.containers.length} зон</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Мощность</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{totalPower.toFixed(0)} кВт</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Связей</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{state.links.length} лин.</div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Plant Equipment Tasks (Collapsible) */}
          <div className="my-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleOverviewSection('tasks')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ListTodo className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                  Задачи оборудования
                </span>
                <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                  {activeEqTasks.length} акт.
                </span>
                {urgentEqTasks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                    {urgentEqTasks.length} срочн.
                  </span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${overviewSections.tasks ? 'rotate-180' : ''}`} />
            </button>
            {overviewSections.tasks && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 space-y-1.5 text-xs">
                {allEqTasks.length === 0 ? (
                  <div className="text-[11px] text-slate-400 py-2.5 text-center">
                    Нет созданных задач. Выберите оборудование на схеме, чтобы назначить задачу.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-medium mb-1.5">
                      <div className="p-1 rounded bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                        <span className="text-slate-400 block text-[9px]">Всего</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{allEqTasks.length}</span>
                      </div>
                      <div className="p-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                        <span className="block text-[9px]">В работе</span>
                        <span className="font-bold">{activeEqTasks.length}</span>
                      </div>
                      <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <span className="block text-[9px]">Готово</span>
                        <span className="font-bold">{allEqTasks.filter(t => t.status === 'completed').length}</span>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                      {activeEqTasks.length > 0 ? (
                        activeEqTasks.slice(0, 8).map(task => (
                          <div
                            key={task.id}
                            onClick={() => focusNode(task.eqId)}
                            className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500/50 cursor-pointer transition-all flex items-start gap-1.5 group"
                            title={`Нажмите, чтобы перейти к [${task.eqTag}] ${task.eqName}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                              task.priority === 'urgent' ? 'bg-rose-500 animate-ping' :
                              task.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                  [{task.eqTag}]
                                </span>
                                {task.dueDate && (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    до {task.dueDate.slice(5)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {task.title}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 p-2 text-center font-medium bg-emerald-500/10 rounded-lg">
                          Все задачи выполнены!
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openSearch('tasks')}
                      className="w-full mt-2 py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Открыть окно глобального поиска по всем задачам ТО"
                    >
                      <Search className="w-3 h-3" />
                      <span>Поиск по всем задачам ({allEqTasks.length})</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Tree Navigator (Collapsible) */}
          <div className="my-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleOverviewSection('tree')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Дерево структуры цехов
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${overviewSections.tree ? 'rotate-180' : ''}`} />
            </button>
            {overviewSections.tree && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 space-y-1 text-xs">
                {state.containers.length === 0 ? (
                  <div className="text-[11px] text-slate-400 py-2 text-center">Контейнеры пока не созданы</div>
                ) : (
                  state.containers.filter(c => !c.parentId).map(topCont => (
                    <div key={topCont.id} className="space-y-1">
                      <button
                        onClick={() => {
                          focusNode(topCont.id);
                          setSelectedId(topCont.id);
                          setIsMobileSummaryOpen(false);
                        }}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 flex items-center justify-between group text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: topCont.color }} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{topCont.name}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>

                      {/* Sub-containers */}
                      {state.containers.filter(c => c.parentId === topCont.id).map(subCont => (
                        <button
                          key={subCont.id}
                          onClick={() => {
                            focusNode(subCont.id);
                            setSelectedId(subCont.id);
                            setIsMobileSummaryOpen(false);
                          }}
                          className="w-full text-left pl-5 pr-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                          <span className="truncate">↳ {subCont.name}</span>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{subCont.tag}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            💡 Кликните на любой блок или контейнер на схеме для открытия его инспектора свойств и связей.
          </div>
        </div>
      </aside>
      </>
    );
  }

  // EQUIPMENT INSPECTOR
  if (selectedEquipment) {
    const locationPath = selectedEquipment.parentId 
      ? getHierarchyPath(selectedEquipment.parentId, state.containers, state.equipment) 
      : 'Корень предприятия (вне контейнера)';

    const directChildEquipment = state.equipment.filter(eq => eq.parentId === selectedEquipment.id);

    return (
      <>
        {/* Mobile backdrop overlay - only if half or full on mobile */}
        {mobileSheetSnap !== 'hidden' && mobileSheetSnap !== 'peek' && (
          <div 
            onClick={() => {
              triggerHaptic(15);
              setMobileSheetSnap('peek');
            }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          />
        )}
        <aside 
          id="equipment-inspector"
          className={`${getSheetSnapClass()} lg:static lg:inset-auto lg:h-full lg:max-h-none lg:w-80 lg:rounded-none lg:border-t-0 lg:border-l lg:border-slate-200 dark:lg:border-white/10 lg:bg-white dark:lg:bg-[#0F0F12] lg:flex lg:flex-col shrink-0 min-h-0 overflow-hidden shadow-sm select-none transition-all text-slate-700 dark:text-slate-300`}
        >
          {/* Mobile Drag Indicator */}
          <div 
            onClick={cycleSheetSnap}
            className="lg:hidden flex items-center justify-center pt-2.5 pb-1 cursor-pointer shrink-0 touch-none active:opacity-60"
            title="Нажмите для переключения размера панели"
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/30 hover:bg-slate-400 dark:hover:bg-white/50 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0F0F12]">
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                {selectedEquipment.tag}
              </span>
              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {selectedEquipment.name || 'Оборудование'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleSheetSnap}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors lg:hidden"
                title={mobileSheetSnap === 'full' ? 'Свернуть' : 'Развернуть'}
              >
                {mobileSheetSnap === 'full' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={() => openShareModal(selectedEquipment.id)}
                className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="Поделиться ссылкой или QR-кодом (для внешних сервисов)"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setIsInspectorMobileOpen(false);
                  setSelectedId(null);
                  setMobileSheetSnap('hidden');
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container for ALL Element Properties */}
          <div 
            id="equipment-inspector-scroll-container"
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 pb-12 overscroll-contain space-y-4"
          >
            {/* Focus Mode Action for Equipment */}
            <div className="space-y-1.5">
          <button
            id="equipment-focus-mode-toggle-btn"
            onClick={() => toggleFocusMode(selectedEquipment.id)}
            className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer ${
              focusedContainerId === selectedEquipment.id
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-blue-500/25 ring-2 ring-blue-500/40'
                : 'bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40 hover:border-blue-300 dark:hover:border-blue-500/60'
            }`}
          >
            {focusedContainerId === selectedEquipment.id ? (
              <>
                <Minimize2 className="w-4 h-4 text-white" />
                <span>Выйти из оборудования (общий план)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Фокусный режим оборудования (F)</span>
              </>
            )}
          </button>

          {focusedContainerId === selectedEquipment.id && (
            <div className="pt-1">
              <button
                onClick={() => fitContainerToScreen(selectedEquipment.id)}
                className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Подогнать под рабочее окно"
              >
                <Scan className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>По размеру рабочего окна</span>
              </button>
            </div>
          )}
        </div>

        {/* Equipment Collapse Toggle */}
        <div className="mb-3">
          <button
            onClick={() => toggleEquipmentCollapse(selectedEquipment.id)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>Состояние оборудования:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              selectedEquipment.isCollapsed !== false ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              {selectedEquipment.isCollapsed !== false ? 'Свернуто (Минимизировано)' : 'Развернуто (Видны вложенные)'}
            </span>
          </button>
        </div>

        {/* Status Selector */}
        <div className="my-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Рабочий статус
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { id: 'normal', label: 'В норме', color: 'hover:border-emerald-500/50 hover:text-emerald-500', active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 font-semibold' },
              { id: 'warning', label: 'Внимание', color: 'hover:border-amber-500/50 hover:text-amber-500', active: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 font-semibold' },
              { id: 'critical', label: 'АВАРИЯ', color: 'hover:border-red-500/50 hover:text-red-500', active: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/60 font-bold' },
              { id: 'maintenance', label: 'ТО / Ремонт', color: 'hover:border-indigo-500/50 hover:text-indigo-500', active: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/50 font-semibold' },
              { id: 'idle', label: 'Простой', color: 'hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300', active: 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-white/20 font-semibold' },
              { id: 'standby', label: 'Резерв', color: 'hover:border-purple-500/50 hover:text-purple-500', active: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/50 font-semibold' },
            ].map(st => (
              <button
                key={st.id}
                disabled={!canEdit}
                onClick={() => updateEquipment(selectedEquipment.id, { status: st.id as EquipmentStatus })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  selectedEquipment.status === st.id 
                    ? st.active + ' border' 
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 ' + st.color
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-2.5 my-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Наименование
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={selectedEquipment.name}
              onChange={(e) => updateEquipment(selectedEquipment.id, { name: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Инв. Тэг
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={selectedEquipment.tag}
                onChange={(e) => updateEquipment(selectedEquipment.id, { tag: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-blue-600 dark:text-blue-400 font-bold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Тип
              </label>
              <select
                disabled={!canEdit}
                value={selectedEquipment.equipmentType}
                onChange={(e) => updateEquipment(selectedEquipment.id, { equipmentType: e.target.value as EquipmentType })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#17171C] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="custom">Другое / Свои свойства</option>
                <option value="cnc">ЧПУ станок</option>
                <option value="robot">Робот-манипулятор</option>
                <option value="pump">Насосная станция</option>
                <option value="transformer">Трансформатор</option>
                <option value="conveyor">Конвейер</option>
                <option value="cabinet">Шкаф АСУ (ПЛК)</option>
                <option value="compressor">Компрессор</option>
                <option value="furnace">Печь / Термоблок</option>
                <option value="motor">Электродвигатель</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Мощность (кВт)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                placeholder="0"
                value={selectedEquipment.powerKw ?? ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { powerKw: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Напряжение (В)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                placeholder="380"
                value={selectedEquipment.voltageV ?? ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { voltageV: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Dimensions Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Ширина (px)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                value={selectedEquipment.isCollapsed !== false ? (selectedEquipment.collapsedWidth || 180) : selectedEquipment.width}
                onChange={(e) => {
                  const val = Math.max(160, Number(e.target.value));
                  if (selectedEquipment.isCollapsed !== false) {
                    updateEquipment(selectedEquipment.id, { collapsedWidth: val });
                  } else {
                    updateEquipment(selectedEquipment.id, { width: val });
                  }
                }}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Высота (px)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                value={selectedEquipment.isCollapsed !== false ? (selectedEquipment.collapsedHeight || 64) : selectedEquipment.height}
                onChange={(e) => {
                  const val = Math.max(selectedEquipment.isCollapsed !== false ? 48 : 80, Number(e.target.value));
                  if (selectedEquipment.isCollapsed !== false) {
                    updateEquipment(selectedEquipment.id, { collapsedHeight: val });
                  } else {
                    updateEquipment(selectedEquipment.id, { height: val });
                  }
                }}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Расположение (Вложенность в цех или оборудование)
            </label>
            <select
              disabled={!canAdmin}
              value={selectedEquipment.parentId || ''}
              onChange={(e) => updateEquipment(selectedEquipment.id, { parentId: e.target.value || null }, `Перемещено в ${e.target.value || 'корень'}`)}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#17171C] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="">(Без родителя / Корень завода)</option>
              <optgroup label="Цехи и участки">
                {state.containers.map(c => (
                  <option key={c.id} value={c.id}>
                    📁 [{c.tag}] {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Оборудование (вложить внутрь)">
                {state.equipment
                  .filter(eq => eq.id !== selectedEquipment.id && eq.parentId !== selectedEquipment.id)
                  .map(eq => (
                    <option key={eq.id} value={eq.id}>
                      ⚙️ [{eq.tag}] {eq.name}
                    </option>
                  ))}
              </optgroup>
            </select>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              Путь: {locationPath}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Модель
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="напр. DMU-50"
                value={selectedEquipment.model || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { model: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Заводской №
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="SN-001"
                value={selectedEquipment.serialNumber || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { serialNumber: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Barcode className="w-3 h-3 text-blue-500" />
                <span>Barkod</span>
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="8690123456789"
                value={selectedEquipment.barcode || selectedEquipment.barkod || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { barcode: e.target.value, barkod: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-500" />
                <span>Stok kod</span>
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="STK-001"
                value={selectedEquipment.stockCode || selectedEquipment.stokKod || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { stockCode: e.target.value, stokKod: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Изготовитель / Бренд
            </label>
            <input
              type="text"
              disabled={!canEdit}
              placeholder="Siemens, KUKA, Danfoss..."
              value={selectedEquipment.manufacturer || ''}
              onChange={(e) => updateEquipment(selectedEquipment.id, { manufacturer: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Примечания / Дефектная ведомость
            </label>
            <textarea
              rows={2}
              disabled={!canEdit}
              placeholder="Заметки по оборудованию, состояние..."
              value={selectedEquipment.notes || ''}
              onChange={(e) => updateEquipment(selectedEquipment.id, { notes: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 resize-none text-[11px] placeholder:text-slate-400"
            />
          </div>

          {/* External Link (URL / SCADA / Documentation) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                <span>Ссылка (URL / SCADA / Документация)</span>
              </label>
              {(selectedEquipment.linkUrl || selectedEquipment.url) && (
                <button
                  type="button"
                  onClick={(e) => openExternalUrl(selectedEquipment.linkUrl || selectedEquipment.url, e)}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
                  title="Открыть ссылку в новой вкладке"
                >
                  <span>Перейти</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type="url"
                disabled={!canEdit}
                placeholder="https://... (документация, панель станка, SCADA)"
                value={selectedEquipment.linkUrl || selectedEquipment.url || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { linkUrl: e.target.value, url: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 font-mono text-xs pr-8"
              />
              {(selectedEquipment.linkUrl || selectedEquipment.url) && (
                <button
                  type="button"
                  onClick={(e) => openExternalUrl(selectedEquipment.linkUrl || selectedEquipment.url, e)}
                  className="absolute right-2 p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                  title="Открыть ссылку"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Editable Properties Section */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 my-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-blue-500" />
              <span>Настраиваемые свойства</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {selectedEquipment.properties.length}
            </span>
          </div>

          {/* Quick template chips */}
          {canEdit && (
            <div className="mb-2.5">
              <div className="text-[10px] text-slate-500 mb-1">Быстро добавить свойство:</div>
              <div className="flex flex-wrap gap-1">
                {[
                  { name: 'Barkod', unit: '', val: '8690123456789' },
                  { name: 'Stok kod', unit: '', val: 'STK-001' },
                  { name: 'Температура', unit: '°C', val: '40' },
                  { name: 'Давление', unit: 'бар', val: '6.0' },
                  { name: 'Вибрация', unit: 'мм/с', val: '1.2' },
                  { name: 'Ток', unit: 'А', val: '24' },
                  { name: 'Обороты', unit: 'об/мин', val: '1500' },
                  { name: 'Наработка', unit: 'ч', val: '120' },
                  { name: 'IP-адрес', unit: '', val: '192.168.1.50' },
                ].map(chip => (
                  <button
                    key={chip.name}
                    type="button"
                    onClick={() => handleQuickAddChip(chip.name, chip.unit, chip.val)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-blue-600/20 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{chip.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Properties list */}
          {selectedEquipment.properties.length === 0 ? (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-dashed border-blue-200 dark:border-blue-500/20 text-center text-slate-500 dark:text-slate-400 text-xs my-2">
              <div className="text-blue-600 dark:text-blue-300 font-semibold mb-0.5">Нет пользовательских свойств</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                Используйте кнопки выше или форму ниже, чтобы добавить параметры
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedEquipment.properties.map(prop => (
                <div 
                  key={prop.id} 
                  className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={prop.name}
                      onChange={(e) => handleUpdateProperty(prop.id, { name: e.target.value })}
                      placeholder="Имя параметра"
                      className="flex-1 bg-transparent text-slate-800 dark:text-slate-300 text-[11px] font-medium focus:outline-hidden focus:border-b border-blue-500 px-0.5"
                    />
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteProperty(prop.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                        title="Удалить свойство"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={prop.value}
                      onChange={(e) => handleUpdateProperty(prop.id, { value: e.target.value })}
                      placeholder="Значение"
                      className="flex-1 bg-white dark:bg-black/30 px-2 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-blue-500 text-xs"
                    />
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={prop.unit || ''}
                      onChange={(e) => handleUpdateProperty(prop.id, { unit: e.target.value })}
                      placeholder="ед."
                      className="w-12 bg-white dark:bg-black/30 px-1.5 py-0.5 rounded font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-blue-500 text-[10px] text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add property form */}
          {canEdit && (
            <form onSubmit={handleAddProperty} className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Добавить параметр</div>
              <div className="space-y-1.5 text-xs">
                <input
                  type="text"
                  placeholder="Имя (напр. Давление масла)"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Значение"
                    value={newPropValue}
                    onChange={(e) => setNewPropValue(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Ед. (бар)"
                    value={newPropUnit}
                    onChange={(e) => setNewPropUnit(e.target.value)}
                    className="w-16 px-2 py-1 rounded bg-white dark:bg-[#17171C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newPropName.trim()}
                  className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-semibold text-xs flex items-center justify-center gap-1 mt-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Добавить свойство</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Nested Child Equipment */}
        {directChildEquipment.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 my-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Вложенное оборудование ({directChildEquipment.length} ед.)</span>
            </div>
            <div className="space-y-1 text-xs max-h-36 overflow-y-auto">
              {directChildEquipment.map(child => (
                <div 
                  key={child.id}
                  onClick={() => focusNode(child.id)}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                    ⚙️ [{child.tag}] {child.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      enterFocusMode(child.id);
                    }}
                    className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                    title="Фокус на этом оборудовании"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Equipment Tasks Section */}
        <EquipmentTasksSection equipment={selectedEquipment} canEdit={canEdit} />

        {/* Element Links & Navigation */}
        <ElementLinksSection node={selectedEquipment} canEdit={canEdit} />

        {/* Clipboard and Delete actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
          {canEdit && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copySelected}
                className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Копировать в буфер (Ctrl+C)"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span>Копировать</span>
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Дублировать по центру экрана (Ctrl+D)"
              >
                <CopyPlus className="w-3.5 h-3.5 text-blue-500" />
                <span>Дублировать</span>
              </button>
            </div>
          )}

          {canAdmin && (
            <button
              onClick={() => {
                deleteEquipment(selectedEquipment.id);
                setSelectedId(null);
              }}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить оборудование</span>
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
  }

  // CONTAINER INSPECTOR (Deep nesting)
  if (selectedContainer) {
    const parentName = selectedContainer.parentId 
      ? state.containers.find(c => c.id === selectedContainer.parentId)?.name 
      : 'Корень завода';

    const childContainers = state.containers.filter(c => c.parentId === selectedContainer.id);
    const directEquipment = state.equipment.filter(e => e.parentId === selectedContainer.id);

    return (
      <>
        {/* Mobile backdrop overlay - only if half or full on mobile */}
        {mobileSheetSnap !== 'hidden' && mobileSheetSnap !== 'peek' && (
          <div 
            onClick={() => {
              triggerHaptic(15);
              setMobileSheetSnap('peek');
            }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          />
        )}
        <aside 
          id="container-inspector"
          className={`${getSheetSnapClass()} lg:static lg:inset-auto lg:h-full lg:max-h-none lg:w-80 lg:rounded-none lg:border-t-0 lg:border-l lg:border-slate-200 dark:lg:border-white/10 lg:bg-white dark:lg:bg-[#0F0F12] lg:flex lg:flex-col shrink-0 min-h-0 overflow-hidden shadow-sm select-none transition-all text-slate-700 dark:text-slate-300`}
        >
          {/* Mobile Drag Indicator */}
          <div 
            onClick={cycleSheetSnap}
            className="lg:hidden flex items-center justify-center pt-2.5 pb-1 cursor-pointer shrink-0 touch-none active:opacity-60"
            title="Нажмите для переключения размера панели"
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/30 hover:bg-slate-400 dark:hover:bg-white/50 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0F0F12]">
            <div className="flex items-center gap-2 truncate">
              <span 
                className="font-mono text-xs font-bold px-1.5 py-0.5 rounded text-white shadow-xs"
                style={{ backgroundColor: selectedContainer.color }}
              >
                {selectedContainer.tag}
              </span>
              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {selectedContainer.name || 'Цех/участок'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleSheetSnap}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors lg:hidden"
                title={mobileSheetSnap === 'full' ? 'Свернуть' : 'Развернуть'}
              >
                {mobileSheetSnap === 'full' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={() => openShareModal(selectedContainer.id)}
                className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="Поделиться ссылкой или QR-кодом (для внешних сервисов)"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setIsInspectorMobileOpen(false);
                  setSelectedId(null);
                  setMobileSheetSnap('hidden');
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container for Container Properties */}
          <div 
            id="container-inspector-scroll-container"
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 pb-12 overscroll-contain space-y-4"
          >
            {/* Focus Mode Action Banner */}
            {/* Fullscreen Workspace Focus Mode */}
            <div className="space-y-1.5">
          <button
            id="inspector-focus-mode-toggle-btn"
            onClick={() => toggleFocusMode(selectedContainer.id)}
            className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
              focusedContainerId === selectedContainer.id
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-blue-500/25 ring-2 ring-blue-500/40'
                : 'bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40 hover:border-blue-300 dark:hover:border-blue-500/60'
            }`}
          >
            {focusedContainerId === selectedContainer.id ? (
              <>
                <Minimize2 className="w-4 h-4 text-white" />
                <span>Выйти из цеха (общий план)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Открыть цех на весь экран (F)</span>
              </>
            )}
          </button>

          {focusedContainerId === selectedContainer.id && (
            <div className="pt-1">
              <button
                onClick={() => fitContainerToScreen(selectedContainer.id)}
                className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                title="Подогнать элементы цеха под рабочее окно"
              >
                <Scan className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>По размеру рабочего окна</span>
              </button>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="mb-3">
          <button
            onClick={() => toggleContainerCollapse(selectedContainer.id)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors"
          >
            <span>Состояние контейнера:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              selectedContainer.isCollapsed ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              {selectedContainer.isCollapsed ? 'Свернут (Минимизирован)' : 'Развернут (Видны станки)'}
            </span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Название цеха / участка
            </label>
            <input
              type="text"
              disabled={!canAdmin}
              value={selectedContainer.name}
              onChange={(e) => updateContainer(selectedContainer.id, { name: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Код / Тэг
            </label>
            <input
              type="text"
              disabled={!canAdmin}
              value={selectedContainer.tag}
              onChange={(e) => updateContainer(selectedContainer.id, { tag: e.target.value })}
              className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Container Dimensions Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Ширина границ (px)
              </label>
              <input
                type="number"
                disabled={!canAdmin}
                value={selectedContainer.isCollapsed ? (selectedContainer.collapsedWidth || 200) : selectedContainer.width}
                onChange={(e) => {
                  const val = Math.max(160, Number(e.target.value));
                  if (selectedContainer.isCollapsed) {
                    updateContainer(selectedContainer.id, { collapsedWidth: val });
                  } else {
                    updateContainer(selectedContainer.id, { width: val });
                  }
                }}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Высота границ (px)
              </label>
              <input
                type="number"
                disabled={!canAdmin}
                value={selectedContainer.isCollapsed ? (selectedContainer.collapsedHeight || 64) : selectedContainer.height}
                onChange={(e) => {
                  const val = Math.max(selectedContainer.isCollapsed ? 48 : 100, Number(e.target.value));
                  if (selectedContainer.isCollapsed) {
                    updateContainer(selectedContainer.id, { collapsedHeight: val });
                  } else {
                    updateContainer(selectedContainer.id, { height: val });
                  }
                }}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Deep nesting: Parent Container */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Родительский контейнер (Глубокая вложенность)
            </label>
            <select
              disabled={!canAdmin}
              value={selectedContainer.parentId || ''}
              onChange={(e) => {
                const newParent = e.target.value || null;
                // prevent circular parenting
                if (newParent === selectedContainer.id) return;
                updateContainer(selectedContainer.id, { parentId: newParent }, `Вложенность изменена`);
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#17171C] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="">(Верхний уровень / Главный цех)</option>
              {state.containers
                .filter(c => c.id !== selectedContainer.id && c.parentId !== selectedContainer.id)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.tag}] {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Color accent picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Цветовая маркировка
            </label>
            <div className="flex gap-2">
              {['#0284c7', '#0d9488', '#16a34a', '#ea580c', '#4f46e5', '#9333ea', '#e11d48'].map(clr => (
                <button
                  key={clr}
                  disabled={!canAdmin}
                  onClick={() => updateContainer(selectedContainer.id, { color: clr })}
                  style={{ backgroundColor: clr }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    selectedContainer.color === clr ? 'border-white ring-2 ring-blue-500 scale-110 shadow-sm' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Ответственный мастер / начальник
            </label>
            <input
              type="text"
              disabled={!canAdmin}
              value={selectedContainer.manager || ''}
              onChange={(e) => updateContainer(selectedContainer.id, { manager: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Описание технологической зоны
            </label>
            <textarea
              rows={2}
              disabled={!canAdmin}
              value={selectedContainer.description || ''}
              onChange={(e) => updateContainer(selectedContainer.id, { description: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 resize-none text-[11px] placeholder:text-slate-400"
            />
          </div>

          {/* External Link for Container (URL / SCADA / Dashboard) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                <span>Ссылка (URL / SCADA / Дашборд цеха)</span>
              </label>
              {(selectedContainer.linkUrl || selectedContainer.url) && (
                <button
                  type="button"
                  onClick={(e) => openExternalUrl(selectedContainer.linkUrl || selectedContainer.url, e)}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
                  title="Открыть ссылку в новой вкладке"
                >
                  <span>Перейти</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type="url"
                disabled={!canAdmin}
                placeholder="https://... (дашборд цеха, регламент, SCADA)"
                value={selectedContainer.linkUrl || selectedContainer.url || ''}
                onChange={(e) => updateContainer(selectedContainer.id, { linkUrl: e.target.value, url: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 font-mono text-xs pr-8"
              />
              {(selectedContainer.linkUrl || selectedContainer.url) && (
                <button
                  type="button"
                  onClick={(e) => openExternalUrl(selectedContainer.linkUrl || selectedContainer.url, e)}
                  className="absolute right-2 p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                  title="Открыть ссылку"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nested Elements List */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 my-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Вложенные элементы ({directEquipment.length} ед. / {childContainers.length} подзон)
          </div>
          <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
            {childContainers.map(cc => (
              <div 
                key={cc.id} 
                className="p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10 group/item transition-colors"
              >
                <span 
                  onClick={() => focusNode(cc.id)}
                  className="font-semibold text-blue-600 dark:text-blue-400 truncate cursor-pointer hover:underline flex-1"
                >
                  📁 [{cc.tag}] {cc.name}
                </span>
                <button
                  onClick={() => enterFocusMode(cc.id)}
                  className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                  title="Войти в фокусный режим для этого цеха (на весь экран)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {directEquipment.map(eq => (
              <div 
                key={eq.id}
                onClick={() => focusNode(eq.id)}
                className="p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <span className="text-slate-700 dark:text-slate-200 truncate font-medium">⚙️ [{eq.tag}] {eq.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                  eq.status === 'critical' ? 'bg-red-500 text-white font-bold' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {eq.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Element Links & Navigation */}
        <ElementLinksSection node={selectedContainer} canEdit={canAdmin} />

        {/* Clipboard and Delete actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
          {canEdit && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copySelected}
                className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Копировать контейнер со всем содержимым (Ctrl+C)"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span>Копировать</span>
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Дублировать контейнер по центру экрана (Ctrl+D)"
              >
                <CopyPlus className="w-3.5 h-3.5 text-blue-500" />
                <span>Дублировать</span>
              </button>
            </div>
          )}

          {canAdmin && (
            <button
              onClick={() => {
                deleteContainer(selectedContainer.id);
                setSelectedId(null);
              }}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить контейнер цеха</span>
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
  }

  // LINK / CONNECTION INSPECTOR
  if (selectedLink) {
    const fromNode = state.equipment.find(e => e.id === selectedLink.fromId) || state.containers.find(c => c.id === selectedLink.fromId);
    const toNode = state.equipment.find(e => e.id === selectedLink.toId) || state.containers.find(c => c.id === selectedLink.toId);

    return (
      <>
        {/* Mobile backdrop overlay - only if half or full on mobile */}
        {mobileSheetSnap !== 'hidden' && mobileSheetSnap !== 'peek' && (
          <div 
            onClick={() => {
              triggerHaptic(15);
              setMobileSheetSnap('peek');
            }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          />
        )}
        <aside 
          id="link-inspector"
          className={`${getSheetSnapClass()} lg:static lg:inset-auto lg:h-full lg:max-h-none lg:w-80 lg:rounded-none lg:border-t-0 lg:border-l lg:border-slate-200 dark:lg:border-white/10 lg:bg-white dark:lg:bg-[#0F0F12] lg:flex lg:flex-col shrink-0 min-h-0 overflow-hidden shadow-sm select-none transition-all text-slate-700 dark:text-slate-300`}
        >
          {/* Mobile Drag Indicator */}
          <div 
            onClick={cycleSheetSnap}
            className="lg:hidden flex items-center justify-center pt-2.5 pb-1 cursor-pointer shrink-0 touch-none active:opacity-60"
            title="Нажмите для переключения размера панели"
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/30 hover:bg-slate-400 dark:hover:bg-white/50 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0F0F12]">
            <div className="flex items-center gap-2 truncate">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                Технологическая связь
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleSheetSnap}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors lg:hidden"
                title={mobileSheetSnap === 'full' ? 'Свернуть' : 'Развернуть'}
              >
                {mobileSheetSnap === 'full' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setIsInspectorMobileOpen(false);
                  setSelectedId(null);
                  setMobileSheetSnap('hidden');
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container for Link Properties */}
          <div 
            id="link-inspector-scroll-container"
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 pb-12 overscroll-contain space-y-3"
          >
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs space-y-1.5">
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">Соединение:</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            От: {fromNode?.name || selectedLink.fromId}
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            До: {toNode?.name || selectedLink.toId}
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Подпись / Назначение связи
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={selectedLink.label || ''}
              onChange={(e) => updateLink(selectedLink.id, { label: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Тип коммуникации
            </label>
            <select
              disabled={!canEdit}
              value={selectedLink.type}
              onChange={(e) => updateLink(selectedLink.id, { type: e.target.value as LinkType })}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#17171C] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="power">⚡ Электропитание (Кабель)</option>
              <option value="pipe">💧 Трубопровод (Жидкость/Газ)</option>
              <option value="conveyor">📦 Материальный поток (Конвейер)</option>
              <option value="signal">📶 Сигнал / АСУ ТП / Ethernet</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Геометрия трассировки
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'orthogonal', label: 'Прямоуг.' },
                { id: 'curved', label: 'Кривая' },
                { id: 'straight', label: 'Прямая' },
              ].map(st => (
                <button
                  key={st.id}
                  disabled={!canEdit}
                  onClick={() => updateLink(selectedLink.id, { style: st.id as LinkStyle })}
                  className={`p-1.5 rounded-lg border text-center transition-all ${
                    selectedLink.style === st.id
                      ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Анимация движения потока
            </label>
            <button
              disabled={!canEdit}
              onClick={() => updateLink(selectedLink.id, { animated: !selectedLink.animated })}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                selectedLink.animated 
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <span>Анимация потока:</span>
              <span className="font-mono font-bold">{selectedLink.animated ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          </div>

          {/* External Link for Connection Link (URL / Documentation / Scheme) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                <span>Ссылка (URL / Схема трассы / Документация)</span>
              </label>
              {(selectedLink.linkUrl || selectedLink.url) && (
                <button
                  type="button"
                  onClick={(e) => openExternalUrl(selectedLink.linkUrl || selectedLink.url, e)}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
                  title="Открыть ссылку в новой вкладке"
                >
                  <span>Перейти</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type="url"
                disabled={!canEdit}
                placeholder="https://... (спецификация кабеля, гидравлическая схема, SCADA)"
                value={selectedLink.linkUrl || selectedLink.url || ''}
                onChange={(e) => updateLink(selectedLink.id, { linkUrl: e.target.value, url: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 font-mono text-xs pr-8"
              />
              {(selectedLink.linkUrl || selectedLink.url) && (
                <button
                  type="button"
                  onClick={(e) => openExternalUrl(selectedLink.linkUrl || selectedLink.url, e)}
                  className="absolute right-2 p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                  title="Открыть ссылку"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-4">
            <button
              onClick={() => {
                deleteLink(selectedLink.id);
                setSelectedId(null);
              }}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить связь</span>
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
  }

  return null;
};

import React, { useState, useRef, useEffect } from 'react';
import { useFactory, CanvasTool } from '../context/FactoryContext';
import { EquipmentType, LinkType } from '../types';
import { 
  MousePointer, 
  Hand, 
  PlusSquare, 
  FolderPlus, 
  Share2, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  ChevronsDownUp,
  ChevronsUpDown,
  Focus,
  Grid, 
  Zap, 
  Droplet, 
  Boxes, 
  Wifi,
  Cpu,
  ChevronDown,
  Sliders,
  Sparkles,
  Plus,
  Magnet,
  Copy,
  ClipboardPaste,
  CopyPlus,
  X,
  Activity,
  FolderTree,
  Search
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
    state,
    selectedId,
    selectedIds,
    activeTool,
    setActiveTool,
    linkDraftType,
    setLinkDraftType,
    undo,
    redo,
    canUndo,
    canRedo,
    zoomIn,
    zoomOut,
    zoomReset,
    viewport,
    gridSnap,
    setGridSnap,
    smartGuides,
    setSmartGuides,
    currentUser,
    addEquipment,
    addEmptyEquipment,
    setIsCreateEquipmentOpen,
    addContainer,
    focusedContainerId,
    toggleFocusMode,
    exitFocusMode,
    collapseAllNodes,
    expandAllNodes,
    copySelected,
    pasteElements,
    duplicateSelected,
    hasClipboard,
    getVisibleCanvasCenter,
    isMobileSummaryOpen,
    setIsMobileSummaryOpen,
    setIsSearchOpen,
  } = useFactory();

  const selectedContainer = state.containers.find(c => c.id === selectedId);

  const [equipmentMenuOpen, setEquipmentMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [mobileSections, setMobileSections] = useState({
    equip: true,
    links: true,
    clipboard: false,
    focus: false,
    view: false,
    canvas: true,
  });

  const toggleMobileSection = (key: keyof typeof mobileSections) =>
    setMobileSections(prev => ({ ...prev, [key]: !prev[key] }));

  const equipmentMenuRef = useRef<HTMLDivElement>(null);
  const linkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (equipmentMenuRef.current && !equipmentMenuRef.current.contains(e.target as Node)) {
        setEquipmentMenuOpen(false);
      }
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) {
        setLinkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'operator';

  const handleQuickAddEquipment = (eqType: EquipmentType, name: string, tag: string, power: number) => {
    if (!canEdit) return;
    const center = getVisibleCanvasCenter();

    // Only set parentId if explicitly working within a focused container
    const targetParentId = focusedContainerId || null;

    addEquipment({
      id: 'eq_' + Date.now(),
      type: 'equipment',
      name,
      tag,
      equipmentType: eqType,
      status: 'normal',
      parentId: targetParentId,
      x: center.x - 85,
      y: center.y - 85,
      width: 170,
      height: 170,
      isCollapsed: true,
      collapsedWidth: 180,
      collapsedHeight: 64,
      powerKw: power,
      voltageV: 380,
      commissionDate: new Date().toISOString().slice(0, 10),
      lastMaintenanceDate: new Date().toISOString().slice(0, 10),
      nextMaintenanceDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      properties: [
        { id: 'p_' + Date.now() + '_1', name: 'Напряжение сети', value: 380, type: 'number', unit: 'В' },
        { id: 'p_' + Date.now() + '_2', name: 'Температура блока', value: 36.6, type: 'number', unit: '°C' },
      ]
    });
    setEquipmentMenuOpen(false);
  };

  const handleQuickAddContainer = () => {
    if (!canEdit) return;
    const center = getVisibleCanvasCenter();

    const colors = ['#0284c7', '#0d9488', '#ea580c', '#16a34a', '#4f46e5', '#9333ea'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    addContainer({
      id: 'cont_' + Date.now(),
      type: 'container',
      name: focusedContainerId ? 'Новая технологическая линия' : 'Новый производственный участок',
      tag: (focusedContainerId ? 'LINE-' : 'SEC-') + Math.floor(10 + Math.random() * 90),
      parentId: focusedContainerId || null,
      x: center.x - 140,
      y: center.y - 45,
      width: 500,
      height: 360,
      isCollapsed: true,
      collapsedWidth: 280,
      collapsedHeight: 90,
      color: randomColor,
      description: focusedContainerId ? 'Внутренняя линия цеха' : 'Новая технологическая зона завода'
    });
  };

  return (
    <>
      <aside 
        id="main-toolbar"
      style={{
        bottom: 'max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))'
      }}
      className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1 sm:p-1 rounded-2xl sm:rounded-xl bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-md border border-slate-200/90 dark:border-white/15 shadow-xl text-slate-700 dark:text-slate-300 select-none transition-all max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] overflow-visible"
    >
      {/* Pointer / Select */}
      <button
        id="tool-select-btn"
        type="button"
        onClick={() => setActiveTool('select')}
        className={`p-2 sm:p-2 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          activeTool === 'select'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Инструмент выбора и перемещения (V)"
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* Pan / Hand */}
      <button
        id="tool-pan-btn"
        type="button"
        onClick={() => setActiveTool('pan')}
        className={`p-2 sm:p-2 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          activeTool === 'pan'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Панорамирование холста (H или зажатый Пробел)"
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

      {/* Add Equipment Dropdown */}
      <div className="relative shrink-0" ref={equipmentMenuRef}>
        <div className="flex items-center">
          <button
            id="tool-add-equipment-btn"
            type="button"
            disabled={!canEdit}
            onClick={(e) => {
              e.stopPropagation();
              setEquipmentMenuOpen(prev => !prev);
              setLinkMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-lg shrink-0 transition-all ${
              !canEdit 
                ? 'opacity-30 cursor-not-allowed'
                : activeTool === 'add_equipment' || equipmentMenuOpen
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={canEdit ? 'Добавить оборудование (Q)' : 'Только для администраторов/операторов'}
          >
            <PlusSquare className="w-4 h-4" />
            <span className="text-xs font-semibold hidden md:inline">Оборудование</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${equipmentMenuOpen ? 'rotate-180 opacity-100' : 'opacity-60'}`} />
          </button>
        </div>

        {equipmentMenuOpen && (
          <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:-translate-x-1/4 w-80 bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-2.5 z-50 text-xs text-slate-800 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
            {/* Custom / Empty Equipment Section */}
            <div className="p-1 mb-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
              <button
                type="button"
                onClick={() => {
                  addEmptyEquipment();
                  setEquipmentMenuOpen(false);
                }}
                className="w-full text-left p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white dark:bg-blue-600/30 dark:border dark:border-blue-500/40 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Пустое оборудование</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-400/30 font-mono">
                      СВОИ СВОЙСТВА
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-300/80 truncate">
                    Создать пустой узел и заполнить параметры вручную
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCreateEquipmentOpen(true);
                  setEquipmentMenuOpen(false);
                }}
                className="w-full mt-1 text-left px-2 py-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 flex items-center gap-2 transition-colors text-[11px] text-blue-700 dark:text-blue-300 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Мастер создания со всеми параметрами...</span>
              </button>
            </div>

            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-t border-slate-100 dark:border-white/5 pt-1.5">
              Готовые типовые шаблоны
            </div>
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleQuickAddEquipment('cnc', 'Станок ЧПУ фрезерный', 'CNC-' + Math.floor(100 + Math.random() * 900), 22)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 flex items-center justify-center font-bold text-[10px]">ЧПУ</div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">ЧПУ Станок</div>
                  <div className="text-[10px] text-slate-500">Токарный/фрезерный центр (22 кВт)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddEquipment('robot', 'Робот-манипулятор', 'ROB-' + Math.floor(100 + Math.random() * 900), 8)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-[10px]">РОБ</div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Промышленный робот</div>
                  <div className="text-[10px] text-slate-500">Сборка, сварка, паллетирование</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddEquipment('pump', 'Насосная станция', 'PUMP-' + Math.floor(100 + Math.random() * 900), 11)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-[10px]">НАС</div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Насос / Гидростанция</div>
                  <div className="text-[10px] text-slate-500">Подача СОЖ, масел, охлаждения</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddEquipment('transformer', 'Трансформатор силовой', 'TR-' + Math.floor(10 + Math.random() * 90), 1000)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">ТР</div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Трансформатор / ТП</div>
                  <div className="text-[10px] text-slate-500">Понизительная подстанция 10/0.4кВ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddEquipment('conveyor', 'Ленточный конвейер', 'CNV-' + Math.floor(100 + Math.random() * 900), 5.5)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">КНВ</div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Конвейерная линия</div>
                  <div className="text-[10px] text-slate-500">Транспорт готовых изделий</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddEquipment('cabinet', 'Шкаф АСУ ТП / PLC', 'CAB-' + Math.floor(10 + Math.random() * 90), 1.5)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">ШУ</div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Шкаф управления (ПЛК)</div>
                  <div className="text-[10px] text-slate-500">Контроллеры Siemens, Danfoss, ОВЕН</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Container (Цех / Участок) */}
      <button
        id="tool-add-container-btn"
        type="button"
        disabled={!canEdit}
        onClick={handleQuickAddContainer}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
          !canEdit 
            ? 'opacity-30 cursor-not-allowed'
            : activeTool === 'add_container'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Создать контейнер цеха / участка (C)"
      >
        <FolderPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold hidden md:inline">Контейнер (Цех)</span>
      </button>

      {/* Link Connection Tool */}
      <div className="relative" ref={linkMenuRef}>
        <button
          id="tool-connect-btn"
          type="button"
          disabled={!canEdit}
          onClick={(e) => {
            e.stopPropagation();
            if (activeTool === 'connect') {
              setLinkMenuOpen(prev => !prev);
            } else {
              setActiveTool('connect');
              setLinkMenuOpen(true);
            }
            setEquipmentMenuOpen(false);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
            !canEdit 
              ? 'opacity-30 cursor-not-allowed'
              : activeTool === 'connect' || linkMenuOpen
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Связь между блоками (L) - нажмите для смены типа"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-semibold hidden md:inline">Связь</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${linkMenuOpen ? 'rotate-180 opacity-100' : 'opacity-60'}`} />
        </button>

        {linkMenuOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-800 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Тип связи между блоками
            </div>
            <div className="space-y-1">
              {[
                { type: 'power' as LinkType, label: 'Электропитание (380В/10кВ)', icon: Zap, color: 'text-amber-500' },
                { type: 'pipe' as LinkType, label: 'Трубопровод (СОЖ/Газ/Вода)', icon: Droplet, color: 'text-cyan-500' },
                { type: 'conveyor' as LinkType, label: 'Материальный поток / Детали', icon: Boxes, color: 'text-emerald-500' },
                { type: 'signal' as LinkType, label: 'Шина АСУ ТП / Profinet', icon: Wifi, color: 'text-purple-500' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setLinkDraftType(item.type);
                      setLinkMenuOpen(false);
                      setActiveTool('connect');
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                      linkDraftType === item.type
                        ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />

      {/* Focus Mode Button (Desktop) */}
      <div className="hidden sm:flex items-center">
        {focusedContainerId ? (
          <button
            id="toolbar-exit-focus-btn"
            type="button"
            onClick={exitFocusMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-600/30 hover:bg-blue-200 dark:hover:bg-blue-600/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/50 shadow-xs transition-all"
            title="Выйти из фокусного режима контейнера (Esc / F)"
          >
            <Minimize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold hidden md:inline">
              Фокус: {state.containers.find(c => c.id === focusedContainerId)?.tag || 'Цех'}
            </span>
          </button>
        ) : selectedContainer ? (
          <button
            id="toolbar-enter-focus-btn"
            type="button"
            onClick={() => toggleFocusMode(selectedContainer.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 shadow-xs transition-all"
            title="Открыть контейнер на весь экран в фокусном режиме (F)"
          >
            <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold hidden md:inline">Фокус (F)</span>
          </button>
        ) : (
          <button
            id="toolbar-focus-hint-btn"
            type="button"
            onClick={() => {
              if (state.containers.length > 0) {
                toggleFocusMode(state.containers[0].id);
              }
            }}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:text-slate-300 transition-all"
            title="Фокусный режим цеха (выберите контейнер или нажмите F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Clipboard: Copy, Paste, Duplicate (Desktop) */}
      <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 shrink-0" title="Буфер обмена элементов схемы">
        <button
          id="toolbar-copy-btn"
          type="button"
          disabled={!canEdit || (!selectedId && selectedIds.length === 0)}
          onClick={copySelected}
          className={`p-1.5 rounded transition-colors ${
            canEdit && (selectedId || selectedIds.length > 0)
              ? 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
              : 'opacity-30 cursor-not-allowed text-slate-400'
          }`}
          title="Копировать выделенное (Ctrl+C)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          id="toolbar-paste-btn"
          type="button"
          disabled={!canEdit || !hasClipboard}
          onClick={pasteElements}
          className={`p-1.5 rounded transition-colors relative ${
            canEdit && hasClipboard
              ? 'hover:bg-white dark:hover:bg-white/10 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold'
              : 'opacity-30 cursor-not-allowed text-slate-400'
          }`}
          title={hasClipboard ? 'Вставить по центру экрана (Ctrl+V)' : 'Буфер обмена пуст (Ctrl+V)'}
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          {hasClipboard && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          )}
        </button>
        <button
          id="toolbar-duplicate-btn"
          type="button"
          disabled={!canEdit || (!selectedId && selectedIds.length === 0)}
          onClick={duplicateSelected}
          className={`p-1.5 rounded transition-colors ${
            canEdit && (selectedId || selectedIds.length > 0)
              ? 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
              : 'opacity-30 cursor-not-allowed text-slate-400'
          }`}
          title="Дублировать по центру экрана (Ctrl+D)"
        >
          <CopyPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Collapse All / Expand All Nodes (Desktop) */}
      <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 shrink-0" title="Управление отображением узлов схемы">
        <button
          id="toolbar-collapse-all-btn"
          type="button"
          onClick={collapseAllNodes}
          className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Свернуть все узлы (все контейнеры и оборудование в компактный вид)"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" />
        </button>
        <button
          id="toolbar-expand-all-btn"
          type="button"
          onClick={expandAllNodes}
          className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Развернуть все узлы схемы"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Smart Guides Toggle (Desktop) */}
      <button
        id="smart-guides-snap-btn"
        type="button"
        onClick={() => setSmartGuides(!smartGuides)}
        className={`hidden sm:flex p-2 rounded-lg shrink-0 transition-all ${
          smartGuides
            ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold ring-1 ring-sky-500/20'
            : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:text-slate-300'
        }`}
        title={smartGuides ? 'Умные направляющие (draw.io): ВКЛ' : 'Умные направляющие (draw.io): ВЫКЛ'}
      >
        <Magnet className="w-4 h-4" />
      </button>

      {/* Grid Snap Toggle (Desktop) */}
      <button
        id="grid-snap-btn"
        type="button"
        onClick={() => setGridSnap(!gridSnap)}
        className={`hidden sm:flex p-2 rounded-lg shrink-0 transition-all ${
          gridSnap
            ? 'bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:text-slate-300'
        }`}
        title={gridSnap ? 'Привязка к сетке: ВКЛ (20px)' : 'Привязка к сетке: ВЫКЛ'}
      >
        <Grid className="w-4 h-4" />
      </button>

      {/* Desktop Zoom Controls */}
      <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 shrink-0">
        <button
          type="button"
          onClick={zoomOut}
          className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          title="Отдалить (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={zoomReset}
          className="px-2 py-1 text-[11px] font-mono font-medium hover:bg-white dark:hover:bg-white/10 rounded text-slate-700 dark:text-slate-300"
          title="Сбросить масштаб (100%)"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          title="Приблизить (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

      {/* Undo & Redo */}
      <button
        id="undo-btn"
        type="button"
        disabled={!canUndo}
        onClick={undo}
        className={`flex items-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          canUndo
            ? 'bg-blue-50 dark:bg-blue-600/25 hover:bg-blue-100 dark:hover:bg-blue-600/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 shadow-2xs active:scale-95'
            : 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600'
        }`}
        title={canUndo ? 'Отменить (Ctrl+Z)' : 'Нет действий для отмены'}
      >
        <Undo2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-semibold hidden md:inline">Отменить</span>
      </button>

      <button
        id="redo-btn"
        type="button"
        disabled={!canRedo}
        onClick={redo}
        className={`p-2 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          canRedo
            ? 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-95'
            : 'opacity-20 cursor-not-allowed text-slate-400 dark:text-slate-600'
        }`}
        title={canRedo ? 'Повторить (Ctrl+Y)' : 'Нет действий для повтора'}
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {/* Global Search Button (Desktop) */}
      <button
        id="toolbar-search-btn"
        type="button"
        onClick={() => setIsSearchOpen(true)}
        className="hidden sm:flex items-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-lg shrink-0 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all active:scale-95 shadow-2xs"
        title="Поиск оборудования, цехов, задач ТО и логов (Ctrl+K или /)"
      >
        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-semibold hidden md:inline">Поиск</span>
      </button>

      {/* Mobile Search Button in Bottom Dock */}
      <button
        id="toolbar-mobile-search-btn"
        type="button"
        onClick={() => setIsSearchOpen(true)}
        className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-2xs active:scale-95 transition-all shrink-0 font-semibold text-[11px]"
        title="Поиск по схеме и задачам (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>Поиск</span>
      </button>

      {/* Mobile "Все инструменты" button */}
      <button
        id="toolbar-mobile-more-btn"
        type="button"
        onClick={() => setIsMobileToolsOpen(true)}
        className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0"
        title="Все инструменты (скрывающиеся списки)"
      >
        <Sliders className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold">Все</span>
      </button>
    </aside>

    {/* Mobile Tools Bottom Sheet with Collapsible Lists */}
    {isMobileToolsOpen && (
      <>
        <div 
          onClick={() => setIsMobileToolsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs sm:hidden"
        />
        <div 
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] max-h-[85vh] w-full border-t border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto shadow-2xl rounded-t-3xl sm:hidden text-slate-700 dark:text-slate-300 select-none"
        >
          {/* Mobile Drag Handle */}
          <div className="flex items-center justify-center pb-2 -mt-1">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Все инструменты схемы
              </h3>
            </div>
            <button
              onClick={() => setIsMobileToolsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Search Action in Mobile Bottom Sheet */}
          <button
            id="mobile-sheet-search-action-btn"
            type="button"
            onClick={() => {
              setIsMobileToolsOpen(false);
              setIsSearchOpen(true);
            }}
            className="w-full flex items-center justify-between p-2.5 mb-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 font-semibold text-xs shadow-xs active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Search className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white">Глобальный поиск по схеме</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Оборудование, параметры, логи и теги</div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-200/60 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold">
              Ctrl+K
            </span>
          </button>

          {/* 1. Скрывающийся список: Оборудование и Цехи */}
          <div className="mb-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleMobileSection('equip')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PlusSquare className="w-4 h-4 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Добавление оборудования и цехов
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mobileSections.equip ? 'rotate-180' : ''}`} />
            </button>
            {mobileSections.equip && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 space-y-2 text-xs">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    handleQuickAddContainer();
                    setIsMobileToolsOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2 hover:bg-emerald-100"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Создать новый цех / участок (контейнер)</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      addEmptyEquipment();
                      setIsMobileToolsOpen(false);
                    }}
                    className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left hover:bg-slate-50 flex items-center gap-1.5 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-500" />
                    <span>Пустой блок</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      setIsCreateEquipmentOpen(true);
                      setIsMobileToolsOpen(false);
                    }}
                    className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-left hover:bg-blue-500/20 flex items-center gap-1.5 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Мастер параметров</span>
                  </button>
                </div>

                <div className="pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Быстрые шаблоны оборудования:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { type: 'machine' as EquipmentType, name: 'ЧПУ Станок', tag: 'CNC', power: 22, icon: Cpu },
                      { type: 'robot' as EquipmentType, name: 'Робот KUKA', tag: 'ROB', power: 8, icon: Sparkles },
                      { type: 'pump' as EquipmentType, name: 'Насос СОЖ', tag: 'PUMP', power: 11, icon: Droplet },
                      { type: 'transformer' as EquipmentType, name: 'Трансформатор', tag: 'TR', power: 1000, icon: Zap },
                      { type: 'conveyor' as EquipmentType, name: 'Конвейер', tag: 'CNV', power: 5.5, icon: Boxes },
                      { type: 'sensor' as EquipmentType, name: 'Шкаф АСУ', tag: 'PLC', power: 1.5, icon: Wifi },
                    ].map(tpl => {
                      const Icon = tpl.icon;
                      return (
                        <button
                          key={tpl.tag}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            handleQuickAddEquipment(tpl.type, tpl.name, tpl.tag, tpl.power);
                            setIsMobileToolsOpen(false);
                          }}
                          className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-2 hover:bg-slate-100/70 text-left"
                        >
                          <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-[11px] truncate">{tpl.name}</div>
                            <div className="text-[10px] text-slate-400">{tpl.power} кВт</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Скрывающийся список: Связи и соединения */}
          <div className="mb-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleMobileSection('links')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Типы связей между блоками (L)
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mobileSections.links ? 'rotate-180' : ''}`} />
            </button>
            {mobileSections.links && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 space-y-1 text-xs">
                {[
                  { type: 'power' as LinkType, label: 'Электропитание (380В/10кВ)', icon: Zap, color: 'text-amber-500' },
                  { type: 'pipe' as LinkType, label: 'Трубопровод (СОЖ/Газ/Вода)', icon: Droplet, color: 'text-cyan-500' },
                  { type: 'conveyor' as LinkType, label: 'Материальный поток / Детали', icon: Boxes, color: 'text-emerald-500' },
                  { type: 'signal' as LinkType, label: 'Шина АСУ ТП / Profinet', icon: Wifi, color: 'text-purple-500' },
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeTool === 'connect' && linkDraftType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => {
                        setLinkDraftType(item.type);
                        setActiveTool('connect');
                        setIsMobileToolsOpen(false);
                      }}
                      className={`w-full p-2 rounded-lg flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-white/15 text-blue-700 dark:text-white font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <span className="text-[10px] text-blue-600 font-bold uppercase">Активен</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Скрывающийся список: Буфер обмена */}
          <div className="mb-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleMobileSection('clipboard')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Буфер обмена (Копирование / Вставка)
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mobileSections.clipboard ? 'rotate-180' : ''}`} />
            </button>
            {mobileSections.clipboard && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  disabled={!canEdit || (!selectedId && selectedIds.length === 0)}
                  onClick={() => {
                    copySelected();
                    setIsMobileToolsOpen(false);
                  }}
                  className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Copy className="w-4 h-4 text-blue-500" />
                  <span className="text-[11px] font-semibold">Копировать</span>
                </button>
                <button
                  type="button"
                  disabled={!canEdit || !hasClipboard}
                  onClick={() => {
                    pasteElements();
                    setIsMobileToolsOpen(false);
                  }}
                  className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1 disabled:opacity-40"
                >
                  <ClipboardPaste className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] font-semibold">Вставить</span>
                </button>
                <button
                  type="button"
                  disabled={!canEdit || (!selectedId && selectedIds.length === 0)}
                  onClick={() => {
                    duplicateSelected();
                    setIsMobileToolsOpen(false);
                  }}
                  className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1 disabled:opacity-40"
                >
                  <CopyPlus className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] font-semibold">Дублировать</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Скрывающийся список: Сетка, направляющие и зум */}
          <div className="mb-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleMobileSection('canvas')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-sky-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Сетка, направляющие и масштаб
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mobileSections.canvas ? 'rotate-180' : ''}`} />
            </button>
            {mobileSections.canvas && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSmartGuides(!smartGuides)}
                    className={`p-2 rounded-lg border flex items-center justify-between transition-colors ${
                      smartGuides
                        ? 'bg-sky-50 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 font-bold'
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Magnet className="w-4 h-4 text-sky-500" />
                      <span>Направляющие</span>
                    </div>
                    <span className="text-[10px]">{smartGuides ? 'ВКЛ' : 'ВЫКЛ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGridSnap(!gridSnap)}
                    className={`p-2 rounded-lg border flex items-center justify-between transition-colors ${
                      gridSnap
                        ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Grid className="w-4 h-4 text-blue-500" />
                      <span>Сетка (20px)</span>
                    </div>
                    <span className="text-[10px]">{gridSnap ? 'ВКЛ' : 'ВЫКЛ'}</span>
                  </button>
                </div>

                {/* Zoom control row */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Масштаб холста:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={zoomOut}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={zoomReset}
                      className="px-2 py-1 font-mono font-bold text-xs bg-slate-100 dark:bg-white/10 rounded-lg"
                    >
                      {Math.round(viewport.zoom * 100)}%
                    </button>
                    <button
                      type="button"
                      onClick={zoomIn}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Скрывающийся список: Фокусный режим цеха */}
          <div className="mb-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleMobileSection('focus')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Фокусный режим цеха (Focus Mode)
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mobileSections.focus ? 'rotate-180' : ''}`} />
            </button>
            {mobileSections.focus && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 space-y-2 text-xs">
                {focusedContainerId ? (
                  <button
                    type="button"
                    onClick={() => {
                      exitFocusMode();
                      setIsMobileToolsOpen(false);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-blue-100 dark:bg-blue-600/30 text-blue-800 dark:text-blue-200 font-semibold flex items-center justify-center gap-2"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>Выйти из фокусного режима ({state.containers.find(c => c.id === focusedContainerId)?.name || 'Цех'})</span>
                  </button>
                ) : state.containers.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Выберите цех для фокусировки:</div>
                    {state.containers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          toggleFocusMode(c.id);
                          setIsMobileToolsOpen(false);
                        }}
                        className="w-full p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-left hover:bg-slate-100"
                      >
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{c.tag}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-1">На схеме пока нет цехов</div>
                )}
              </div>
            )}
          </div>

          {/* 6. Скрывающийся список: Отображение узлов */}
          <div className="mb-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => toggleMobileSection('view')}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronsUpDown className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Отображение и компактность узлов
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mobileSections.view ? 'rotate-180' : ''}`} />
            </button>
            {mobileSections.view && (
              <div className="p-2.5 pt-1 border-t border-slate-200/50 dark:border-white/5 grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    collapseAllNodes();
                    setIsMobileToolsOpen(false);
                  }}
                  className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5"
                >
                  <ChevronsDownUp className="w-4 h-4 text-slate-500" />
                  <span>Свернуть все</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    expandAllNodes();
                    setIsMobileToolsOpen(false);
                  }}
                  className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5"
                >
                  <ChevronsUpDown className="w-4 h-4 text-slate-500" />
                  <span>Развернуть все</span>
                </button>
              </div>
            )}
          </div>

          {/* 7. Кнопка открытия Сводки предприятия */}
          <button
            type="button"
            onClick={() => {
              setIsMobileToolsOpen(false);
              setIsMobileSummaryOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-200"
          >
            <Activity className="w-4 h-4 text-blue-500" />
            <span>Открыть сводку завода и структуру цехов</span>
          </button>
        </div>
      </>
    )}
  </>
  );
};


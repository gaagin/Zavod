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
  Plus
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
    state,
    selectedId,
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
    currentUser,
    addEquipment,
    addEmptyEquipment,
    setIsCreateEquipmentOpen,
    addContainer,
    focusedContainerId,
    toggleFocusMode,
    exitFocusMode,
  } = useFactory();

  const selectedContainer = state.containers.find(c => c.id === selectedId);

  const [equipmentMenuOpen, setEquipmentMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
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
    const centerCanvasX = Math.round((-viewport.panX + window.innerWidth / 2) / viewport.zoom);
    const centerCanvasY = Math.round((-viewport.panY + window.innerHeight / 2) / viewport.zoom);

    addEquipment({
      id: 'eq_' + Date.now(),
      type: 'equipment',
      name,
      tag,
      equipmentType: eqType,
      status: 'normal',
      parentId: focusedContainerId || null,
      x: centerCanvasX - 85,
      y: centerCanvasY - 85,
      width: 170,
      height: 170,
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
    const centerCanvasX = Math.round((-viewport.panX + window.innerWidth / 2) / viewport.zoom);
    const centerCanvasY = Math.round((-viewport.panY + window.innerHeight / 2) / viewport.zoom);

    const colors = ['#0284c7', '#0d9488', '#ea580c', '#16a34a', '#4f46e5', '#9333ea'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    addContainer({
      id: 'cont_' + Date.now(),
      type: 'container',
      name: focusedContainerId ? 'Новая технологическая линия' : 'Новый производственный участок',
      tag: (focusedContainerId ? 'LINE-' : 'SEC-') + Math.floor(10 + Math.random() * 90),
      parentId: focusedContainerId || null,
      x: centerCanvasX - 250,
      y: centerCanvasY - 180,
      width: 500,
      height: 360,
      isCollapsed: false,
      collapsedWidth: 280,
      collapsedHeight: 90,
      color: randomColor,
      description: focusedContainerId ? 'Внутренняя линия цеха' : 'Новая технологическая зона завода'
    });
  };

  return (
    <aside className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1.5 sm:p-1 rounded-2xl sm:rounded-xl bg-[#0F0F12]/95 backdrop-blur-md border border-white/15 shadow-2xl text-slate-300 select-none transition-all max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar">
      {/* Pointer / Select */}
      <button
        id="tool-select-btn"
        onClick={() => setActiveTool('select')}
        className={`p-2.5 sm:p-2 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          activeTool === 'select'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'hover:bg-white/5 text-slate-400 hover:text-white'
        }`}
        title="Инструмент выбора и перемещения (V)"
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* Pan / Hand */}
      <button
        id="tool-pan-btn"
        onClick={() => setActiveTool('pan')}
        className={`p-2.5 sm:p-2 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          activeTool === 'pan'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'hover:bg-white/5 text-slate-400 hover:text-white'
        }`}
        title="Панорамирование холста (H или зажатый Пробел)"
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

      {/* Add Equipment Dropdown */}
      <div className="relative shrink-0" ref={equipmentMenuRef}>
        <div className="flex items-center">
          <button
            id="tool-add-equipment-btn"
            disabled={!canEdit}
            onClick={() => setEquipmentMenuOpen(!equipmentMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg shrink-0 transition-all ${
              !canEdit 
                ? 'opacity-30 cursor-not-allowed'
                : activeTool === 'add_equipment'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'hover:bg-white/5 text-slate-300 hover:text-white'
            }`}
            title={canEdit ? 'Добавить оборудование (Q)' : 'Только для администраторов/операторов'}
          >
            <PlusSquare className="w-4 h-4" />
            <span className="text-xs font-semibold hidden md:inline">Оборудование</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        </div>

        {equipmentMenuOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-72 bg-[#0F0F12] border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-300">
            {/* Custom / Empty Equipment Section */}
            <div className="p-1 mb-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <button
                onClick={() => {
                  addEmptyEquipment();
                  setEquipmentMenuOpen(false);
                }}
                className="w-full text-left p-2 rounded-md hover:bg-blue-500/20 flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Пустое оборудование</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-mono">
                      СВОИ СВОЙСТВА
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-300/80 truncate">
                    Создать пустой узел и заполнить всё вручную
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsCreateEquipmentOpen(true);
                  setEquipmentMenuOpen(false);
                }}
                className="w-full mt-1 text-left px-2 py-1.5 rounded-md hover:bg-blue-500/20 flex items-center gap-2 transition-colors text-[11px] text-blue-300 hover:text-white"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-medium">Мастер создания со всеми параметрами...</span>
              </button>
            </div>

            <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-white/5 pt-1.5">
              Готовые типовые шаблоны
            </div>
            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              <button
                onClick={() => handleQuickAddEquipment('cnc', 'Станок ЧПУ фрезерный', 'CNC-' + Math.floor(100 + Math.random() * 900), 22)}
                className="w-full text-left p-2 rounded-lg hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">ЧПУ</div>
                <div>
                  <div className="font-semibold text-slate-200">ЧПУ Станок</div>
                  <div className="text-[10px] text-slate-500">Токарный/фрезерный центр (22 кВт)</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAddEquipment('robot', 'Робот-манипулятор', 'ROB-' + Math.floor(100 + Math.random() * 900), 8)}
                className="w-full text-left p-2 rounded-lg hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">РОБ</div>
                <div>
                  <div className="font-semibold text-slate-200">Промышленный робот</div>
                  <div className="text-[10px] text-slate-500">Сборка, сварка, паллетирование</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAddEquipment('pump', 'Насосная станция', 'PUMP-' + Math.floor(100 + Math.random() * 900), 11)}
                className="w-full text-left p-2 rounded-lg hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">НАС</div>
                <div>
                  <div className="font-semibold text-slate-200">Насос / Гидростанция</div>
                  <div className="text-[10px] text-slate-500">Подача СОЖ, масел, охлаждения</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAddEquipment('transformer', 'Трансформатор силовой', 'TR-' + Math.floor(10 + Math.random() * 90), 1000)}
                className="w-full text-left p-2 rounded-lg hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">ТР</div>
                <div>
                  <div className="font-semibold text-slate-200">Трансформатор / ТП</div>
                  <div className="text-[10px] text-slate-500">Понизительная подстанция 10/0.4кВ</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAddEquipment('conveyor', 'Ленточный конвейер', 'CNV-' + Math.floor(100 + Math.random() * 900), 5.5)}
                className="w-full text-left p-2 rounded-lg hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">КНВ</div>
                <div>
                  <div className="font-semibold text-slate-200">Конвейерная линия</div>
                  <div className="text-[10px] text-slate-500">Транспорт готовых изделий</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAddEquipment('cabinet', 'Шкаф АСУ ТП / PLC', 'CAB-' + Math.floor(10 + Math.random() * 90), 1.5)}
                className="w-full text-left p-2 rounded-lg hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">ШУ</div>
                <div>
                  <div className="font-semibold text-slate-200">Шкаф управления (ПЛК)</div>
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
        disabled={!canEdit}
        onClick={handleQuickAddContainer}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
          !canEdit 
            ? 'opacity-30 cursor-not-allowed'
            : activeTool === 'add_container'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'hover:bg-white/5 text-slate-300 hover:text-white'
        }`}
        title="Создать контейнер цеха / участка (C)"
      >
        <FolderPlus className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold hidden md:inline">Контейнер (Цех)</span>
      </button>

      {/* Link Connection Tool */}
      <div className="relative" ref={linkMenuRef}>
        <button
          id="tool-connect-btn"
          disabled={!canEdit}
          onClick={() => {
            if (activeTool === 'connect') {
              setLinkMenuOpen(!linkMenuOpen);
            } else {
              setActiveTool('connect');
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
            !canEdit 
              ? 'opacity-30 cursor-not-allowed'
              : activeTool === 'connect'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'hover:bg-white/5 text-slate-300 hover:text-white'
          }`}
          title="Связь между блоками (L) - нажмите для смены типа"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-semibold hidden md:inline">Связь</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {linkMenuOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-56 bg-[#0F0F12] border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-300">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Тип связи между блоками
            </div>
            <div className="space-y-1">
              {[
                { type: 'power' as LinkType, label: 'Электропитание (380В/10кВ)', icon: Zap, color: 'text-amber-400' },
                { type: 'pipe' as LinkType, label: 'Трубопровод (СОЖ/Газ/Вода)', icon: Droplet, color: 'text-cyan-400' },
                { type: 'conveyor' as LinkType, label: 'Материальный поток / Детали', icon: Boxes, color: 'text-emerald-400' },
                { type: 'signal' as LinkType, label: 'Шина АСУ ТП / Profinet', icon: Wifi, color: 'text-purple-400' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      setLinkDraftType(item.type);
                      setLinkMenuOpen(false);
                      setActiveTool('connect');
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                      linkDraftType === item.type
                        ? 'bg-white/10 text-white font-semibold'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-slate-200">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="w-[1px] h-6 bg-white/10 mx-1" />

      {/* Focus Mode Button */}
      {focusedContainerId ? (
        <button
          id="toolbar-exit-focus-btn"
          onClick={exitFocusMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-500/50 shadow-sm transition-all animate-pulse"
          title="Выйти из фокусного режима контейнера (Esc / F)"
        >
          <Minimize2 className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold hidden md:inline">
            Фокус: {state.containers.find(c => c.id === focusedContainerId)?.tag || 'Цех'}
          </span>
        </button>
      ) : selectedContainer ? (
        <button
          id="toolbar-enter-focus-btn"
          onClick={() => toggleFocusMode(selectedContainer.id)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/40 shadow-sm transition-all"
          title="Открыть контейнер на весь экран в фокусном режиме (F)"
        >
          <Maximize2 className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold hidden md:inline">Фокус (F)</span>
        </button>
      ) : (
        <button
          id="toolbar-focus-hint-btn"
          onClick={() => {
            if (state.containers.length > 0) {
              toggleFocusMode(state.containers[0].id);
            }
          }}
          className="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all"
          title="Фокусный режим цеха (выберите контейнер или нажмите F)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}

      {/* Grid Snap Toggle */}
      <button
        id="grid-snap-btn"
        onClick={() => setGridSnap(!gridSnap)}
        className={`p-2 sm:p-2 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          gridSnap
            ? 'bg-white/10 text-blue-400 font-bold'
            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
        }`}
        title={gridSnap ? 'Привязка к сетке: ВКЛ (20px)' : 'Привязка к сетке: ВЫКЛ'}
      >
        <Grid className="w-4 h-4" />
      </button>

      {/* Desktop Zoom Controls (Mobile has floating top-right controls) */}
      <div className="hidden sm:flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
        <button
          onClick={zoomOut}
          className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"
          title="Отдалить (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={zoomReset}
          className="px-2 py-1 text-[11px] font-mono font-medium hover:bg-white/10 rounded text-slate-300"
          title="Сбросить масштаб (100%)"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>

        <button
          onClick={zoomIn}
          className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"
          title="Приблизить (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-6 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

      {/* Undo & Redo */}
      <button
        id="undo-btn"
        disabled={!canUndo}
        onClick={undo}
        className={`flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          canUndo
            ? 'bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-500/40 shadow-sm active:scale-95'
            : 'opacity-25 cursor-not-allowed text-slate-600'
        }`}
        title={canUndo ? 'Отменить последнее действие (Ctrl+Z)' : 'Нет действий для отмены'}
      >
        <Undo2 className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold hidden md:inline">Отменить</span>
      </button>

      <button
        id="redo-btn"
        disabled={!canRedo}
        onClick={redo}
        className={`p-2 sm:p-2 rounded-xl sm:rounded-lg shrink-0 transition-all ${
          canRedo
            ? 'hover:bg-white/10 text-slate-300 hover:text-white active:scale-95'
            : 'opacity-20 cursor-not-allowed text-slate-600'
        }`}
        title={canRedo ? 'Повторить отмененное действие (Ctrl+Y)' : 'Нет действий для повтора'}
      >
        <Redo2 className="w-4 h-4" />
      </button>
    </aside>
  );
};

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
  Grid, 
  Zap, 
  Droplet, 
  Boxes, 
  Wifi,
  Cpu,
  ChevronDown
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
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
    addContainer,
  } = useFactory();

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
      parentId: null,
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
      name: 'Новый производственный участок',
      tag: 'SEC-' + Math.floor(10 + Math.random() * 90),
      parentId: null,
      x: centerCanvasX - 250,
      y: centerCanvasY - 180,
      width: 500,
      height: 360,
      isCollapsed: false,
      collapsedWidth: 280,
      collapsedHeight: 90,
      color: randomColor,
      description: 'Новая технологическая зона завода'
    });
  };

  return (
    <aside className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-xl bg-[#0F0F12]/90 backdrop-blur-md border border-white/10 shadow-2xl text-slate-300 select-none transition-all">
      {/* Pointer / Select */}
      <button
        id="tool-select-btn"
        onClick={() => setActiveTool('select')}
        className={`p-2 rounded-lg transition-all ${
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
        className={`p-2 rounded-lg transition-all ${
          activeTool === 'pan'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'hover:bg-white/5 text-slate-400 hover:text-white'
        }`}
        title="Панорамирование холста (H или зажатый Пробел)"
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-white/10 mx-1" />

      {/* Add Equipment Dropdown */}
      <div className="relative" ref={equipmentMenuRef}>
        <div className="flex items-center">
          <button
            id="tool-add-equipment-btn"
            disabled={!canEdit}
            onClick={() => setEquipmentMenuOpen(!equipmentMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
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
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-[#0F0F12] border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-300">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Шаблоны оборудования
            </div>
            <div className="space-y-0.5">
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

      {/* Grid Snap Toggle */}
      <button
        id="grid-snap-btn"
        onClick={() => setGridSnap(!gridSnap)}
        className={`p-2 rounded-lg transition-all ${
          gridSnap
            ? 'bg-white/10 text-blue-400 font-bold'
            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
        }`}
        title={gridSnap ? 'Привязка к сетке: ВКЛ (20px)' : 'Привязка к сетке: ВЫКЛ'}
      >
        <Grid className="w-4 h-4" />
      </button>

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
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

      <div className="w-[1px] h-6 bg-white/10 mx-1" />

      {/* Undo & Redo */}
      <button
        id="undo-btn"
        disabled={!canUndo}
        onClick={undo}
        className={`p-2 rounded-lg transition-colors ${
          canUndo
            ? 'hover:bg-white/5 text-slate-300 hover:text-white'
            : 'opacity-20 cursor-not-allowed text-slate-600'
        }`}
        title="Отменить (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        id="redo-btn"
        disabled={!canRedo}
        onClick={redo}
        className={`p-2 rounded-lg transition-colors ${
          canRedo
            ? 'hover:bg-white/5 text-slate-300 hover:text-white'
            : 'opacity-20 cursor-not-allowed text-slate-600'
        }`}
        title="Повторить (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4" />
      </button>
    </aside>
  );
};

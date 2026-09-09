import React, { useState, useMemo } from 'react';
import { useFactory } from '../context/FactoryContext';
import { EquipmentNode, EquipmentStatus, EquipmentType } from '../types';
import { 
  Search, 
  Map as MapIcon, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Wrench, 
  PauseCircle, 
  FolderTree, 
  Zap, 
  ChevronRight, 
  Sliders, 
  ListTodo, 
  Sparkles,
  ArrowRight,
  Filter,
  Plus
} from 'lucide-react';

export const MobileListView: React.FC = () => {
  const {
    state,
    selectedId,
    setSelectedId,
    setMobileViewMode,
    setMobileSheetSnap,
    focusNode,
    triggerHaptic,
    setIsCreateEquipmentOpen,
    currentUser
  } = useFactory();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');
  const [selectedContainerId, setSelectedContainerId] = useState<string | 'all'>('all');

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'operator';

  // Status counts for quick filter pills
  const counts = useMemo(() => {
    const res = {
      all: state.equipment.length,
      critical: 0,
      warning: 0,
      normal: 0,
      maintenance: 0,
      idle: 0,
    };
    for (const eq of state.equipment) {
      if (eq.status === 'critical') res.critical++;
      else if (eq.status === 'warning') res.warning++;
      else if (eq.status === 'normal') res.normal++;
      else if (eq.status === 'maintenance') res.maintenance++;
      else if (eq.status === 'idle') res.idle++;
    }
    return res;
  }, [state.equipment]);

  // Filtered equipment
  const filteredEquipment = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return state.equipment.filter((eq) => {
      if (statusFilter !== 'all' && eq.status !== statusFilter) return false;
      if (selectedContainerId !== 'all') {
        if (selectedContainerId === 'none') {
          if (eq.parentId) return false;
        } else if (eq.parentId !== selectedContainerId) {
          return false;
        }
      }
      if (!q) return true;

      const nameMatch = eq.name?.toLowerCase().includes(q);
      const tagMatch = eq.tag?.toLowerCase().includes(q);
      const modelMatch = eq.model?.toLowerCase().includes(q);
      const barcodeMatch = (eq.barcode || eq.barkod)?.toLowerCase().includes(q);
      const manMatch = eq.manufacturer?.toLowerCase().includes(q);

      return nameMatch || tagMatch || modelMatch || barcodeMatch || manMatch;
    });
  }, [state.equipment, searchQuery, statusFilter, selectedContainerId]);

  // Group equipment by parent container
  const groupedData = useMemo(() => {
    const containerMap = new Map<string, EquipmentNode[]>();
    const rootItems: EquipmentNode[] = [];

    for (const eq of filteredEquipment) {
      if (eq.parentId && state.containers.some(c => c.id === eq.parentId)) {
        const list = containerMap.get(eq.parentId) || [];
        list.push(eq);
        containerMap.set(eq.parentId, list);
      } else {
        rootItems.push(eq);
      }
    }

    return { containerMap, rootItems };
  }, [filteredEquipment, state.containers]);

  const handleSelectAndLocate = (id: string) => {
    triggerHaptic(20);
    setSelectedId(id);
    setMobileViewMode('canvas');
    setMobileSheetSnap('half');
    focusNode(id);
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Авария
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Внимание
          </span>
        );
      case 'maintenance':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25">
            <Wrench className="w-2.5 h-2.5" />
            На ТО
          </span>
        );
      case 'idle':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-500/15 px-2 py-0.5 rounded-full border border-slate-500/25">
            <PauseCircle className="w-2.5 h-2.5" />
            Простой
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            В норме
          </span>
        );
    }
  };

  return (
    <div 
      id="mobile-list-view-container"
      className="fixed inset-0 top-12 bottom-16 z-20 bg-[#09090B] flex flex-col text-slate-200 overflow-hidden sm:hidden animate-in fade-in duration-150"
    >
      {/* Top Search & Filter Header */}
      <div className="p-3 bg-[#0F0F12] border-b border-white/10 shrink-0 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, тегу, модели..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileViewMode('canvas')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold shrink-0"
            title="Вернуться к схеме"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Схема</span>
          </button>
        </div>

        {/* Status Filter Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-white/20 text-white font-bold'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            Все ({counts.all})
          </button>

          {counts.critical > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('critical')}
              className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'critical'
                  ? 'bg-red-500/30 text-red-300 font-bold border border-red-500/50'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Аварии ({counts.critical})
            </button>
          )}

          {counts.warning > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'warning'
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Внимание ({counts.warning})
            </button>
          )}

          <button
            type="button"
            onClick={() => setStatusFilter('normal')}
            className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'normal'
                ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            В норме ({counts.normal})
          </button>

          {counts.maintenance > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('maintenance')}
              className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'maintenance'
                  ? 'bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/50'
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}
            >
              <Wrench className="w-3 h-3" />
              На ТО ({counts.maintenance})
            </button>
          )}
        </div>
      </div>

      {/* List Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 overscroll-contain">
        {filteredEquipment.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-500">
              <Filter className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-300">Оборудование не найдено</div>
            <div className="text-xs text-slate-500 max-w-xs mx-auto">
              Попробуйте изменить поисковый запрос или сбросить фильтры статуса
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedContainerId('all');
              }}
              className="text-xs text-blue-400 hover:underline"
            >
              Сбросить все фильтры
            </button>
          </div>
        ) : (
          <>
            {/* Containers (Workshops) Sections */}
            {state.containers.map((container) => {
              const eqList = groupedData.containerMap.get(container.id);
              if (!eqList || eqList.length === 0) return null;

              return (
                <div key={container.id} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-blue-400" />
                      {container.name}
                    </span>
                    <span className="text-[10px] text-slate-500">{eqList.length} ед.</span>
                  </div>

                  <div className="space-y-1.5">
                    {eqList.map((eq) => renderEquipmentRow(eq))}
                  </div>
                </div>
              );
            })}

            {/* Root equipment outside containers */}
            {groupedData.rootItems.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Общая зона цеха</span>
                  <span className="text-[10px] text-slate-500">{groupedData.rootItems.length} ед.</span>
                </div>
                <div className="space-y-1.5">
                  {groupedData.rootItems.map((eq) => renderEquipmentRow(eq))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Add Equipment action button */}
      {canEdit && (
        <div className="absolute right-4 bottom-4">
          <button
            type="button"
            onClick={() => setIsCreateEquipmentOpen(true)}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transition-transform active:scale-95"
            title="Добавить оборудование"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );

  function renderEquipmentRow(eq: EquipmentNode) {
    const isSelected = selectedId === eq.id;
    const taskCount = eq.tasks?.length || 0;
    const activeTasks = eq.tasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length || 0;

    return (
      <div
        key={eq.id}
        onClick={() => handleSelectAndLocate(eq.id)}
        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          isSelected
            ? 'bg-blue-600/15 border-blue-500/60 shadow-lg shadow-blue-500/10'
            : 'bg-[#121217] hover:bg-[#181820] border-white/5 active:scale-[0.99]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-slate-300">
            <Sliders className="w-5 h-5 text-blue-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-mono text-[11px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                {eq.tag}
              </span>
              {getStatusBadge(eq.status)}
            </div>

            <div className="font-semibold text-xs text-white truncate max-w-[200px]">
              {eq.name}
            </div>

            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              {eq.powerKw !== undefined && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {eq.powerKw} кВт
                </span>
              )}
              {eq.model && <span className="truncate max-w-[120px]">{eq.model}</span>}
              {activeTasks > 0 && (
                <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                  <ListTodo className="w-3 h-3" />
                  {activeTasks} зад.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <span className="text-[10px] text-blue-400 font-medium hidden xs:inline">На схему</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    );
  }
};

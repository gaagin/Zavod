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
  ChevronRight
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const {
    state,
    selectedId,
    setSelectedId,
    updateEquipment,
    deleteEquipment,
    updateContainer,
    deleteContainer,
    toggleContainerCollapse,
    updateLink,
    deleteLink,
    currentUser,
    focusNode,
  } = useFactory();

  const [newPropName, setNewPropName] = useState('');
  const [newPropValue, setNewPropValue] = useState('');
  const [newPropUnit, setNewPropUnit] = useState('');

  const selectedEquipment = state.equipment.find(e => e.id === selectedId);
  const selectedContainer = state.containers.find(c => c.id === selectedId);
  const selectedLink = state.links.find(l => l.id === selectedId);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'operator' || currentUser.role === 'maintenance';
  const canAdmin = currentUser.role === 'admin';

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

  const handleUpdateProperty = (propId: string, value: string | number) => {
    if (!selectedEquipment) return;
    updateEquipment(selectedEquipment.id, {
      properties: selectedEquipment.properties.map(p => p.id === propId ? { ...p, value } : p)
    });
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

    return (
      <aside 
        id="factory-inspector-overview"
        className="w-80 border-l border-white/10 bg-[#0F0F12] text-slate-300 p-4 h-[calc(100vh-3.5rem)] overflow-y-auto select-none transition-colors hidden lg:block"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Сводка предприятия
          </h3>
        </div>

        {/* Operational Rate Meter */}
        <div className="my-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-400">Коэффициент готовности:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {operationalPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
            <div style={{ width: `${(normalCount / totalEq) * 100}%` }} className="bg-emerald-500 h-full" />
            <div style={{ width: `${(warnCount / totalEq) * 100}%` }} className="bg-amber-500 h-full" />
            <div style={{ width: `${(critCount / totalEq) * 100}%` }} className="bg-red-500 h-full" />
            <div style={{ width: `${(maintCount / totalEq) * 100}%` }} className="bg-indigo-500 h-full" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
            <span>Штатно: {normalCount}</span>
            <span>Аварии: {critCount}</span>
            <span>ТО: {maintCount}</span>
          </div>
        </div>

        {/* Key KPIs */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-500">Всего оборудования</div>
            <div className="text-base font-bold text-white mt-0.5">{totalEq} ед.</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-500">Цехов и линий</div>
            <div className="text-base font-bold text-white mt-0.5">{state.containers.length} зон</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-500">Суммарная мощность</div>
            <div className="text-base font-bold text-white mt-0.5">{totalPower.toFixed(0)} кВт</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-500">Связей в схеме</div>
            <div className="text-base font-bold text-white mt-0.5">{state.links.length} лин.</div>
          </div>
        </div>

        {/* Tree Navigator */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Структура цехов</span>
            <FolderTree className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1 text-xs">
            {state.containers.filter(c => !c.parentId).map(topCont => (
              <div key={topCont.id} className="space-y-1">
                <button
                  onClick={() => focusNode(topCont.id)}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-between group text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topCont.color }} />
                    <span className="font-semibold text-slate-200 group-hover:text-white truncate">{topCont.name}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* Sub-containers */}
                {state.containers.filter(c => c.parentId === topCont.id).map(subCont => (
                  <button
                    key={subCont.id}
                    onClick={() => focusNode(subCont.id)}
                    className="w-full text-left pl-5 pr-2 py-1 rounded-lg hover:bg-white/5 flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    <span className="truncate">↳ {subCont.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{subCont.tag}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed">
          💡 Кликните на любой блок или контейнер на холсте для редактирования его параметров, статуса или свойств.
        </div>
      </aside>
    );
  }

  // EQUIPMENT INSPECTOR
  if (selectedEquipment) {
    const locationPath = selectedEquipment.parentId 
      ? getHierarchyPath(selectedEquipment.parentId, state.containers) 
      : 'Корень предприятия (вне контейнера)';

    return (
      <aside 
        id="equipment-inspector"
        className="w-80 border-l border-white/10 bg-[#0F0F12] text-slate-300 p-4 h-[calc(100vh-3.5rem)] overflow-y-auto select-none transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {selectedEquipment.tag}
            </span>
            <span className="font-bold text-xs text-white truncate">
              Свойства оборудования
            </span>
          </div>
          <button
            onClick={() => setSelectedId(null)}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Selector */}
        <div className="my-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Рабочий статус
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { id: 'normal', label: 'В норме', color: 'hover:border-emerald-500/50 hover:text-emerald-400', active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-semibold' },
              { id: 'warning', label: 'Внимание', color: 'hover:border-amber-500/50 hover:text-amber-400', active: 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-semibold' },
              { id: 'critical', label: 'АВАРИЯ', color: 'hover:border-red-500/50 hover:text-red-400', active: 'bg-red-500/20 text-red-400 border-red-500/60 font-bold' },
              { id: 'maintenance', label: 'ТО / Ремонт', color: 'hover:border-indigo-500/50 hover:text-indigo-400', active: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 font-semibold' },
              { id: 'idle', label: 'Простой', color: 'hover:border-slate-500/50 hover:text-slate-300', active: 'bg-white/10 text-slate-300 border-white/20 font-semibold' },
              { id: 'standby', label: 'Резерв', color: 'hover:border-purple-500/50 hover:text-purple-400', active: 'bg-purple-500/20 text-purple-400 border-purple-500/50 font-semibold' },
            ].map(st => (
              <button
                key={st.id}
                disabled={!canEdit}
                onClick={() => updateEquipment(selectedEquipment.id, { status: st.id as EquipmentStatus })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  selectedEquipment.status === st.id 
                    ? st.active + ' border' 
                    : 'border-white/10 bg-white/5 text-slate-400 ' + st.color
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Наименование
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={selectedEquipment.name}
              onChange={(e) => updateEquipment(selectedEquipment.id, { name: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Инв. Тэг
              </label>
              <input
                type="text"
                disabled={!canAdmin}
                value={selectedEquipment.tag}
                onChange={(e) => updateEquipment(selectedEquipment.id, { tag: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Тип
              </label>
              <select
                disabled={!canEdit}
                value={selectedEquipment.equipmentType}
                onChange={(e) => updateEquipment(selectedEquipment.id, { equipmentType: e.target.value as EquipmentType })}
                className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-[#17171C] text-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="cnc" className="bg-[#0F0F12]">ЧПУ станок</option>
                <option value="robot" className="bg-[#0F0F12]">Робот-манипулятор</option>
                <option value="pump" className="bg-[#0F0F12]">Насосная станция</option>
                <option value="transformer" className="bg-[#0F0F12]">Трансформатор</option>
                <option value="conveyor" className="bg-[#0F0F12]">Конвейер</option>
                <option value="cabinet" className="bg-[#0F0F12]">Шкаф АСУ (ПЛК)</option>
                <option value="compressor" className="bg-[#0F0F12]">Компрессор</option>
                <option value="furnace" className="bg-[#0F0F12]">Печь / Термоблок</option>
                <option value="motor" className="bg-[#0F0F12]">Электродвигатель</option>
                <option value="custom" className="bg-[#0F0F12]">Другое</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Мощность (кВт)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                value={selectedEquipment.powerKw || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { powerKw: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Напряжение (В)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                value={selectedEquipment.voltageV || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { voltageV: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Расположение (Вложенность в контейнер)
            </label>
            <select
              disabled={!canAdmin}
              value={selectedEquipment.parentId || ''}
              onChange={(e) => updateEquipment(selectedEquipment.id, { parentId: e.target.value || null }, `Перемещено в ${e.target.value || 'корень'}`)}
              className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-[#17171C] text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="" className="bg-[#0F0F12]">(Без контейнера / Корень завода)</option>
              {state.containers.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0F0F12]">
                  [{c.tag}] {c.name}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              Путь: {locationPath}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Модель & Серийный номер
            </label>
            <input
              type="text"
              disabled={!canEdit}
              placeholder="Например, DMU 50, сер. №8841"
              value={selectedEquipment.model || ''}
              onChange={(e) => updateEquipment(selectedEquipment.id, { model: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500 mb-1 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Примечания / Дефектная ведомость
            </label>
            <textarea
              rows={2}
              disabled={!canEdit}
              value={selectedEquipment.notes || ''}
              onChange={(e) => updateEquipment(selectedEquipment.id, { notes: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500 resize-none text-[11px] placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Custom Editable Properties Section */}
        <div className="pt-3 border-t border-white/10 my-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Настраиваемые свойства
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {selectedEquipment.properties.length}
            </span>
          </div>

          {/* Properties list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {selectedEquipment.properties.map(prop => (
              <div 
                key={prop.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="font-medium text-slate-400 truncate text-[11px]">
                    {prop.name}
                  </div>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={prop.value}
                    onChange={(e) => handleUpdateProperty(prop.id, e.target.value)}
                    className="w-full bg-transparent font-mono font-bold text-white focus:outline-hidden text-xs"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {prop.unit && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {prop.unit}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteProperty(prop.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add property form */}
          {canEdit && (
            <form onSubmit={handleAddProperty} className="mt-2 p-2.5 rounded-xl bg-white/5 border border-dashed border-white/10">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Добавить параметр</div>
              <div className="space-y-1.5 text-xs">
                <input
                  type="text"
                  placeholder="Имя (напр. Давление масла)"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-[#17171C] border border-white/10 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Значение"
                    value={newPropValue}
                    onChange={(e) => setNewPropValue(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-[#17171C] border border-white/10 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Ед. (бар)"
                    value={newPropUnit}
                    onChange={(e) => setNewPropUnit(e.target.value)}
                    className="w-16 px-2 py-1 rounded bg-[#17171C] border border-white/10 text-slate-200 text-xs font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
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

        {/* Delete action */}
        {canAdmin && (
          <div className="pt-3 border-t border-white/10">
            <button
              onClick={() => {
                deleteEquipment(selectedEquipment.id);
                setSelectedId(null);
              }}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить оборудование</span>
            </button>
          </div>
        )}
      </aside>
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
      <aside 
        id="container-inspector"
        className="w-80 border-l border-white/10 bg-[#0F0F12] text-slate-300 p-4 h-[calc(100vh-3.5rem)] overflow-y-auto select-none transition-colors"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 truncate">
            <span 
              className="font-mono text-xs font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: selectedContainer.color }}
            >
              {selectedContainer.tag}
            </span>
            <span className="font-bold text-xs text-white truncate">
              Контейнер участка/цеха
            </span>
          </div>
          <button
            onClick={() => setSelectedId(null)}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collapse Toggle */}
        <div className="my-3">
          <button
            onClick={() => toggleContainerCollapse(selectedContainer.id)}
            className="w-full py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 flex items-center justify-between transition-colors"
          >
            <span>Состояние контейнера:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              selectedContainer.isCollapsed ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {selectedContainer.isCollapsed ? 'Свернут (Минимизирован)' : 'Развернут (Видны станки)'}
            </span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Название цеха / участка
            </label>
            <input
              type="text"
              disabled={!canAdmin}
              value={selectedContainer.name}
              onChange={(e) => updateContainer(selectedContainer.id, { name: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Код / Тэг
            </label>
            <input
              type="text"
              disabled={!canAdmin}
              value={selectedContainer.tag}
              onChange={(e) => updateContainer(selectedContainer.id, { tag: e.target.value })}
              className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Deep nesting: Parent Container */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
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
              className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-[#17171C] text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="" className="bg-[#0F0F12]">(Верхний уровень / Главный цех)</option>
              {state.containers
                .filter(c => c.id !== selectedContainer.id && c.parentId !== selectedContainer.id)
                .map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0F0F12]">
                    [{c.tag}] {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Color accent picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
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
                    selectedContainer.color === clr ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Ответственный мастер / начальник
            </label>
            <input
              type="text"
              disabled={!canAdmin}
              value={selectedContainer.manager || ''}
              onChange={(e) => updateContainer(selectedContainer.id, { manager: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Описание технологической зоны
            </label>
            <textarea
              rows={2}
              disabled={!canAdmin}
              value={selectedContainer.description || ''}
              onChange={(e) => updateContainer(selectedContainer.id, { description: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500 resize-none text-[11px]"
            />
          </div>
        </div>

        {/* Nested Elements List */}
        <div className="pt-3 border-t border-white/10 my-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Вложенные элементы ({directEquipment.length} ед. / {childContainers.length} подзон)
          </div>
          <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
            {childContainers.map(cc => (
              <div 
                key={cc.id}
                onClick={() => focusNode(cc.id)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10"
              >
                <span className="font-semibold text-blue-400 truncate">📁 [{cc.tag}] {cc.name}</span>
              </div>
            ))}
            {directEquipment.map(eq => (
              <div 
                key={eq.id}
                onClick={() => focusNode(eq.id)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10"
              >
                <span className="text-slate-200 truncate">⚙️ [{eq.tag}] {eq.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  eq.status === 'critical' ? 'bg-red-500 text-white font-bold' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {eq.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {canAdmin && (
          <div className="pt-3 border-t border-white/10">
            <button
              onClick={() => {
                deleteContainer(selectedContainer.id);
                setSelectedId(null);
              }}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить контейнер цеха</span>
            </button>
          </div>
        )}
      </aside>
    );
  }

  // LINK / CONNECTION INSPECTOR
  if (selectedLink) {
    const fromNode = state.equipment.find(e => e.id === selectedLink.fromId) || state.containers.find(c => c.id === selectedLink.fromId);
    const toNode = state.equipment.find(e => e.id === selectedLink.toId) || state.containers.find(c => c.id === selectedLink.toId);

    return (
      <aside 
        id="link-inspector"
        className="w-80 border-l border-white/10 bg-[#0F0F12] text-slate-300 p-4 h-[calc(100vh-3.5rem)] overflow-y-auto select-none transition-colors"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 truncate">
            <Share2 className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-xs text-white truncate">
              Технологическая связь
            </span>
          </div>
          <button
            onClick={() => setSelectedId(null)}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
          <div className="text-slate-400 text-[11px]">Соединение:</div>
          <div className="font-semibold text-slate-200">
            От: {fromNode?.name || selectedLink.fromId}
          </div>
          <div className="font-semibold text-slate-200">
            До: {toNode?.name || selectedLink.toId}
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Подпись / Назначение связи
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={selectedLink.label || ''}
              onChange={(e) => updateLink(selectedLink.id, { label: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Тип коммуникации
            </label>
            <select
              disabled={!canEdit}
              value={selectedLink.type}
              onChange={(e) => updateLink(selectedLink.id, { type: e.target.value as LinkType })}
              className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-[#17171C] text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="power" className="bg-[#0F0F12]">⚡ Электропитание (Кабель)</option>
              <option value="pipe" className="bg-[#0F0F12]">💧 Трубопровод (Жидкость/Газ)</option>
              <option value="conveyor" className="bg-[#0F0F12]">📦 Материальный поток (Конвейер)</option>
              <option value="signal" className="bg-[#0F0F12]">📶 Сигнал / АСУ ТП / Ethernet</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
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
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-bold'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Анимация движения потока
            </label>
            <button
              disabled={!canEdit}
              onClick={() => updateLink(selectedLink.id, { animated: !selectedLink.animated })}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                selectedLink.animated 
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400' 
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <span>Анимация потока:</span>
              <span>{selectedLink.animated ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 border-t border-white/10 mt-4">
            <button
              onClick={() => {
                deleteLink(selectedLink.id);
                setSelectedId(null);
              }}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить связь</span>
            </button>
          </div>
        )}
      </aside>
    );
  }

  return null;
};

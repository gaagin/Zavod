import React, { useState, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import { EquipmentType, EquipmentStatus, CustomProperty, EquipmentNode } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Sliders, 
  Cpu, 
  Droplet, 
  RotateCw, 
  Boxes, 
  Zap, 
  Settings2, 
  Gauge, 
  Flame, 
  Radio, 
  Sparkles,
  Layers,
  Barcode,
  Tag
} from 'lucide-react';

interface PropDraft {
  id: string;
  name: string;
  value: string;
  unit: string;
}

export const CreateEquipmentModal: React.FC = () => {
  const {
    state,
    isCreateEquipmentOpen,
    setIsCreateEquipmentOpen,
    addEquipment,
    setSelectedId,
    focusedContainerId,
    viewport,
    showToast,
  } = useFactory();

  const [name, setName] = useState('Новое оборудование');
  const [tag, setTag] = useState('');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('custom');
  const [status, setStatus] = useState<EquipmentStatus>('normal');
  const [parentId, setParentId] = useState<string>('');
  const [powerKw, setPowerKw] = useState<string>('');
  const [voltageV, setVoltageV] = useState<string>('380');
  const [model, setModel] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [stockCode, setStockCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Custom properties draft
  const [customProps, setCustomProps] = useState<PropDraft[]>([]);
  const [newPropName, setNewPropName] = useState('');
  const [newPropValue, setNewPropValue] = useState('');
  const [newPropUnit, setNewPropUnit] = useState('');

  // Reset/initialize when modal opens
  useEffect(() => {
    if (isCreateEquipmentOpen) {
      const randomTag = 'EQ-' + Math.floor(100 + Math.random() * 900);
      setTag(randomTag);
      setName('Новое оборудование');
      setEquipmentType('custom');
      setStatus('normal');
      setParentId(focusedContainerId || '');
      setPowerKw('');
      setVoltageV('380');
      setModel('');
      setSerialNumber('');
      setManufacturer('');
      setBarcode('');
      setStockCode('');
      setNotes('');
      setCustomProps([]);
      setNewPropName('');
      setNewPropValue('');
      setNewPropUnit('');
    }
  }, [isCreateEquipmentOpen, focusedContainerId]);

  if (!isCreateEquipmentOpen) return null;

  const handleAddPropDraft = () => {
    if (!newPropName.trim()) return;
    setCustomProps(prev => [
      ...prev,
      {
        id: 'draft_p_' + Date.now(),
        name: newPropName.trim(),
        value: newPropValue.trim(),
        unit: newPropUnit.trim()
      }
    ]);
    setNewPropName('');
    setNewPropValue('');
    setNewPropUnit('');
  };

  const handleQuickAddPropTemplate = (propName: string, defaultUnit: string, defaultValue: string = '') => {
    setCustomProps(prev => [
      ...prev,
      {
        id: 'draft_p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: propName,
        value: defaultValue,
        unit: defaultUnit
      }
    ]);
  };

  const handleRemovePropDraft = (id: string) => {
    setCustomProps(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const centerCanvasX = Math.round((-viewport.panX + window.innerWidth / 2) / viewport.zoom);
    const centerCanvasY = Math.round((-viewport.panY + window.innerHeight / 2) / viewport.zoom);
    const finalId = 'eq_' + Date.now();
    const finalTag = tag.trim() || ('EQ-' + Math.floor(100 + Math.random() * 900));

    // Convert drafted properties
    const formattedProps: CustomProperty[] = customProps.map(p => {
      const numVal = Number(p.value);
      const isNum = !isNaN(numVal) && p.value.trim() !== '';
      return {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: p.name,
        value: isNum ? numVal : p.value,
        type: isNum ? 'number' : 'text',
        unit: p.unit || undefined
      };
    });

    // If user left something typed in the draft input, include it too
    if (newPropName.trim()) {
      const numVal = Number(newPropValue);
      const isNum = !isNaN(numVal) && newPropValue.trim() !== '';
      formattedProps.push({
        id: 'p_' + Date.now() + '_extra',
        name: newPropName.trim(),
        value: isNum ? numVal : newPropValue.trim(),
        type: isNum ? 'number' : 'text',
        unit: newPropUnit.trim() || undefined
      });
    }

    const newEquipment: EquipmentNode = {
      id: finalId,
      type: 'equipment',
      name: name.trim() || 'Новое оборудование',
      tag: finalTag,
      equipmentType,
      status,
      parentId: parentId || null,
      x: centerCanvasX - 85,
      y: centerCanvasY - 85,
      width: 170,
      height: 170,
      powerKw: powerKw ? Number(powerKw) : undefined,
      voltageV: voltageV ? Number(voltageV) : undefined,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      barcode: barcode.trim() || undefined,
      barkod: barcode.trim() || undefined,
      stockCode: stockCode.trim() || undefined,
      stokKod: stockCode.trim() || undefined,
      notes: notes.trim() || undefined,
      properties: formattedProps,
      commissionDate: new Date().toISOString().slice(0, 10),
    };

    addEquipment(newEquipment, `Создано оборудование [${finalTag}] ${newEquipment.name}`);
    setSelectedId(finalId);
    setIsCreateEquipmentOpen(false);

    showToast(
      `Создано оборудование [${finalTag}]`,
      'Объект размещен на схеме и открыт в инспекторе параметров.',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="create-equipment-dialog"
        className="w-full max-w-2xl bg-[#0F0F12] text-slate-300 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#131318]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Новое оборудование</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                  СВОИ СВОЙСТВА
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Заполните параметры и пользовательские свойства оборудования вручную
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateEquipmentOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Section 1: Main info */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Основная информация</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Наименование оборудования <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например, Токарный станок с ЧПУ 16А20Ф3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Инв. Тэг / Номер <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="EQ-101"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-blue-400 font-mono font-bold focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Тип оборудования
                </label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="custom">Другое / Настраиваемое</option>
                  <option value="cnc">Станок с ЧПУ</option>
                  <option value="robot">Робот-манипулятор</option>
                  <option value="pump">Насос / Гидростанция</option>
                  <option value="transformer">Трансформатор / ТП</option>
                  <option value="conveyor">Конвейерная линия</option>
                  <option value="cabinet">Шкаф АСУ (ПЛК)</option>
                  <option value="compressor">Компрессор</option>
                  <option value="furnace">Печь / Термоблок</option>
                  <option value="motor">Электродвигатель</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Статус при создании
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="normal">В норме (Работает)</option>
                  <option value="standby">Резерв</option>
                  <option value="idle">Простой</option>
                  <option value="maintenance">ТО / Ремонт</option>
                  <option value="warning">Предупреждение</option>
                  <option value="critical">Авария</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Размещение (Цех / Зона)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">(Корень завода / Без цеха)</option>
                  {state.containers.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.tag}] {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Specs */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Технические параметры</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Мощность (кВт)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="напр. 15"
                  value={powerKw}
                  onChange={(e) => setPowerKw(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Напряжение (В)
                </label>
                <input
                  type="number"
                  placeholder="380"
                  value={voltageV}
                  onChange={(e) => setVoltageV(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Модель
                </label>
                <input
                  type="text"
                  placeholder="DMU-50"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Серийный номер
                </label>
                <input
                  type="text"
                  placeholder="SN-98442"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Barkod</span>
                </label>
                <input
                  type="text"
                  placeholder="8690123456789"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Stok kod</span>
                </label>
                <input
                  type="text"
                  placeholder="STK-001"
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Изготовитель / Бренд
                </label>
                <input
                  type="text"
                  placeholder="DMG Mori, Fanuc, Schneider Electric..."
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Примечания / Назначение
                </label>
                <input
                  type="text"
                  placeholder="Участок чистовой обработки, ввод в 2024 г."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Custom Properties & Sensors */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Свои свойства и датчики ({customProps.length})</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Отображаются на карточке оборудования и в инспекторе
              </span>
            </div>

            {/* Quick Template Chips */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">Быстро добавить частый параметр:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Barkod', unit: '', defaultVal: '8690123456789' },
                  { name: 'Stok kod', unit: '', defaultVal: 'STK-001' },
                  { name: 'Температура', unit: '°C', defaultVal: '45' },
                  { name: 'Давление', unit: 'бар', defaultVal: '6.2' },
                  { name: 'Вибрация', unit: 'мм/с', defaultVal: '1.4' },
                  { name: 'Ток фазы A', unit: 'А', defaultVal: '28' },
                  { name: 'Скорость', unit: 'об/мин', defaultVal: '1500' },
                  { name: 'Уровень масла', unit: '%', defaultVal: '85' },
                  { name: 'IP-адрес', unit: '', defaultVal: '192.168.1.120' },
                  { name: 'Наработка', unit: 'ч', defaultVal: '240' },
                ].map(chip => (
                  <button
                    key={chip.name}
                    type="button"
                    onClick={() => handleQuickAddPropTemplate(chip.name, chip.unit, chip.defaultVal)}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-blue-600/20 hover:text-blue-300 border border-white/10 text-[10px] text-slate-300 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{chip.name} {chip.unit ? `(${chip.unit})` : ''}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Draft Properties List */}
            {customProps.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {customProps.map((p) => (
                  <div 
                    key={p.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/10 text-xs"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium text-slate-300 truncate max-w-[140px]">{p.name}</span>
                      <span className="text-slate-600">:</span>
                      <span className="font-mono font-bold text-blue-300 truncate">{p.value || '—'}</span>
                      {p.unit && (
                        <span className="text-[10px] text-slate-500 font-mono">({p.unit})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePropDraft(p.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Prop Input */}
            <div className="p-2 rounded-lg bg-black/20 border border-dashed border-white/15 space-y-2">
              <div className="text-[10px] font-semibold text-slate-400">Произвольный параметр:</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Имя (напр. Влажность)"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="flex-2 px-2.5 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Значение (напр. 65)"
                  value={newPropValue}
                  onChange={(e) => setNewPropValue(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Ед. (напр. %)"
                  value={newPropUnit}
                  onChange={(e) => setNewPropUnit(e.target.value)}
                  className="w-20 px-2 py-1.5 rounded-lg bg-[#17171C] border border-white/10 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddPropDraft}
                  disabled={!newPropName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 disabled:opacity-30 text-blue-300 hover:text-white font-semibold flex items-center gap-1 border border-blue-500/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsCreateEquipmentOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-semibold"
            >
              Отмена
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Создать оборудование</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

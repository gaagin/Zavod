import React, { useState, useMemo } from 'react';
import { useFactory } from '../context/FactoryContext';
import { EquipmentStatus, EventSeverity } from '../types';
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
  Filter,
  Plus
} from 'lucide-react';

export const SearchModal: React.FC = () => {
  const {
    state,
    isSearchOpen,
    setIsSearchOpen,
    focusNode,
    addEventLog,
    currentUser,
  } = useFactory();

  const [activeTab, setActiveTab] = useState<'components' | 'logs'>('components');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Manual Log Note
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [manualSeverity, setManualSeverity] = useState<EventSeverity>('info');
  const [manualTargetId, setManualTargetId] = useState<string>('');

  // Filtered Components
  const filteredComponents = useMemo(() => {
    const q = query.toLowerCase().trim();

    const matchedEquipment = state.equipment.filter(eq => {
      if (statusFilter !== 'all' && eq.status !== statusFilter) return false;
      if (!q) return true;

      // Match name, tag, model, serial, manufacturer, notes, barcode, stockCode
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

      // Match custom property name or value
      return eq.properties.some(p => 
        p.name.toLowerCase().includes(q) || 
        String(p.value).toLowerCase().includes(q)
      );
    });

    const matchedContainers = state.containers.filter(c => {
      if (statusFilter !== 'all') return false; // containers don't have operational statuses
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

  // Filtered Logs with Deduplication Protection
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="search-dialog"
        className="w-full max-w-3xl bg-[#0F0F12] text-slate-300 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-500 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Поиск по названию, инв. номеру, параметрам, датчикам или тексту логов..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-4 py-2 bg-[#131318] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('components')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'components'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Оборудование & Цеха ({filteredComponents.equipment.length + filteredComponents.containers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Журнал событий ({filteredLogs.length})</span>
            </button>
          </div>

          {/* Context Filter Pills */}
          {activeTab === 'components' ? (
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'Все' },
                { id: 'critical', label: 'Аварии', color: 'text-red-400 font-bold' },
                { id: 'warning', label: 'Внимание', color: 'text-amber-400' },
                { id: 'maintenance', label: 'ТО', color: 'text-indigo-400' },
                { id: 'normal', label: 'В норме', color: 'text-emerald-400' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors border ${
                    statusFilter === f.id
                      ? 'bg-blue-600 text-white border-blue-500 font-bold'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'Все логи' },
                  { id: 'critical', label: 'Критические', color: 'text-red-400' },
                  { id: 'warning', label: 'Предупреждения', color: 'text-amber-400' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSeverityFilter(f.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] transition-colors border ${
                      severityFilter === f.id
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsAddingLog(!isAddingLog)}
                className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-semibold text-[11px] flex items-center gap-1 border border-blue-500/30"
              >
                <Plus className="w-3 h-3" />
                <span>Запись в журнал</span>
              </button>
            </div>
          )}
        </div>

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
          {activeTab === 'components' ? (
            <>
              {filteredComponents.equipment.length === 0 && filteredComponents.containers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Ничего не найдено по запросу "{query}"
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
                    return (
                      <div
                        key={eq.id}
                        onClick={() => {
                          focusNode(eq.id);
                          setIsSearchOpen(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            eq.status === 'critical' ? 'bg-red-500 text-white animate-pulse' :
                            eq.status === 'warning' ? 'bg-amber-500 text-white' :
                            eq.status === 'maintenance' ? 'bg-indigo-500 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            <Cpu className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
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
                            </div>

                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              📍 {location}  |  ⚡ {eq.powerKw ? `${eq.powerKw} кВт` : 'Питание штатно'} {eq.model ? `| ${eq.model}` : ''} {(eq.barcode || eq.barkod) ? `| Barkod: ${eq.barcode || eq.barkod}` : ''} {(eq.stockCode || eq.stokKod) ? `| Stok: ${eq.stockCode || eq.stokKod}` : ''}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform shrink-0" />
                      </div>
                    );
                  })}
                </>
              )}
            </>
          ) : (
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
        <div className="px-4 py-2.5 bg-[#131318] border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Нажмите на результат для моментального перехода к элементу на холсте</span>
          <kbd className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-300 text-[10px]">
            Esc для закрытия
          </kbd>
        </div>
      </div>
    </div>
  );
};

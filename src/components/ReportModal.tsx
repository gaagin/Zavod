import React, { useState, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  exportToCSV, 
  exportToPDF, 
  exportToJSON, 
  getHierarchyPath 
} from '../utils/exportUtils';
import { CloudBackup } from '../types';
import { 
  FileText, 
  Download, 
  Cloud, 
  X, 
  FileSpreadsheet, 
  FileType, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  HardDrive,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export const ReportModal: React.FC = () => {
  const {
    state,
    isReportOpen,
    setIsReportOpen,
    restoreState,
    currentUser,
    addEventLog,
  } = useFactory();

  const [activeTab, setActiveTab] = useState<'report' | 'cloud'>('report');
  const [targetContainerId, setTargetContainerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Cloud Backup State
  const [backups, setBackups] = useState<CloudBackup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<'s3' | 'yandex' | 'gcs' | 'local'>('yandex');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isReportOpen && activeTab === 'cloud') {
      fetchBackups();
    }
  }, [isReportOpen, activeTab]);

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (e) {
      console.error('Failed to load backups', e);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateCloudBackup = async () => {
    setIsCreatingBackup(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: cloudProvider,
          userName: currentUser.name
        })
      });
      if (res.ok) {
        setStatusNotice('Резервная копия успешно создана и сохранена в облачном хранилище!');
        fetchBackups();
      }
    } catch (e) {
      setStatusNotice('Ошибка соединения с облачным сервером');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreCloudBackup = async (id: string) => {
    if (!confirm('Восстановить состояние фабрики из этой резервной копии? Текущие несохраненные изменения будут перезаписаны.')) return;
    try {
      const res = await fetch(`/api/backups/${id}`);
      if (res.ok) {
        const backupData = await res.json();
        if (backupData && backupData.state) {
          restoreState(backupData.state);
          setStatusNotice('Снимок успешно применен на холсте!');
        }
      }
    } catch (e) {
      alert('Ошибка при восстановлении снимка');
    }
  };

  // Filter equipment for report
  const reportEquipment = state.equipment.filter(eq => {
    if (statusFilter !== 'all' && eq.status !== statusFilter) return false;
    if (targetContainerId !== 'all') {
      // Must be direct or indirect child
      let currentParent = eq.parentId;
      let matches = false;
      while (currentParent) {
        if (currentParent === targetContainerId) {
          matches = true;
          break;
        }
        const parentCont = state.containers.find(c => c.id === currentParent);
        currentParent = parentCont ? parentCont.parentId : null;
      }
      if (!matches) return false;
    }
    return true;
  });

  // Local JSON upload restore
  const handleJSONFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const dataToRestore = parsed.state || parsed;
        if (dataToRestore.equipment && dataToRestore.containers) {
          restoreState(dataToRestore);
          addEventLog({
            targetId: 'system',
            targetName: 'Импорт конфигурации',
            targetType: 'system',
            eventType: 'backup_restore',
            severity: 'success',
            description: `Импортирован файл ${file.name} (${dataToRestore.equipment.length} ед. оборудования)`,
            userName: currentUser.name,
            userRole: currentUser.role
          });
          alert('Схема завода успешно импортирована из файла!');
          setIsReportOpen(false);
        } else {
          alert('Файл имеет неверный формат конфигурации ПромСхема');
        }
      } catch (err) {
        alert('Ошибка при чтении JSON-файла');
      }
    };
    reader.readAsText(file);
  };

  if (!isReportOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="report-export-modal"
        className="w-full max-w-4xl bg-[#0F0F12] text-slate-300 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Отчетность и Экспорт данных предприятия
              </h3>
              <p className="text-xs text-slate-400">
                Формирование сводок по состоянию оборудования и облачные резервные копии
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReportOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-4 py-2 border-b border-white/10 bg-[#131318] flex items-center gap-2">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Генерация отчета (PDF / CSV / JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cloud'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4 text-blue-400" />
            <span>Облачные копии & Бэкапы</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'report' ? (
            <div className="space-y-5">
              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Область выборки (Цех / Участок)
                  </label>
                  <select
                    value={targetContainerId}
                    onChange={(e) => setTargetContainerId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-white/10 bg-[#17171C] text-slate-200 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="all" className="bg-[#0F0F12]">Весь завод (Все цеха и сектора)</option>
                    {state.containers.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0F0F12]">
                        [{c.tag}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Фильтр по статусу оборудования
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 rounded-lg border border-white/10 bg-[#17171C] text-slate-200 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="all" className="bg-[#0F0F12]">Любой статус (Все единицы)</option>
                    <option value="critical" className="bg-[#0F0F12]">Только Аварийное (Критические)</option>
                    <option value="warning" className="bg-[#0F0F12]">Только с предупреждениями (Внимание)</option>
                    <option value="maintenance" className="bg-[#0F0F12]">На техобслуживании (ТО)</option>
                    <option value="normal" className="bg-[#0F0F12]">Только в штатной норме</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: CSV, PDF, JSON */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => exportToCSV(state, targetContainerId)}
                  className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-xs text-emerald-300">
                    Экспорт в CSV (Excel)
                  </div>
                  <div className="text-[11px] text-emerald-400/70 mt-0.5">
                    Таблица с тегами, мощностью, локациями и свойствами
                  </div>
                </button>

                <button
                  onClick={() => exportToPDF(state, targetContainerId)}
                  className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileType className="w-5 h-5 text-red-400" />
                    <Download className="w-4 h-4 text-red-400 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-xs text-red-300">
                    Сформировать PDF Акт
                  </div>
                  <div className="text-[11px] text-red-400/70 mt-0.5">
                    Печатный отчет с титульным листом и дефектами
                  </div>
                </button>

                <button
                  onClick={() => exportToJSON(state)}
                  className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/15 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <HardDrive className="w-5 h-5 text-blue-400" />
                    <Download className="w-4 h-4 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-xs text-blue-300">
                    Полный снимок JSON
                  </div>
                  <div className="text-[11px] text-blue-400/70 mt-0.5">
                    Архив конфигурации всей схемы для переноса
                  </div>
                </button>
              </div>

              {/* Equipment Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-bold text-slate-300">
                    Предварительный просмотр позиций ({reportEquipment.length} ед.):
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Сумм. мощность: {reportEquipment.reduce((acc, e) => acc + (e.powerKw || 0), 0).toFixed(1)} кВт
                  </span>
                </div>

                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#17171C] text-[11px] text-slate-400 font-semibold border-b border-white/10">
                      <tr>
                        <th className="p-2.5">Тэг</th>
                        <th className="p-2.5">Наименование</th>
                        <th className="p-2.5">Участок / Цех</th>
                        <th className="p-2.5">Статус</th>
                        <th className="p-2.5">Мощность</th>
                        <th className="p-2.5">ТО</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {reportEquipment.slice(0, 10).map(eq => {
                        const path = eq.parentId ? getHierarchyPath(eq.parentId, state.containers) : 'Корень завода';
                        return (
                          <tr key={eq.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-2.5 font-mono font-bold text-white">{eq.tag}</td>
                            <td className="p-2.5 font-medium text-slate-200">{eq.name}</td>
                            <td className="p-2.5 text-slate-400 truncate max-w-[140px]">{path}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                eq.status === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                eq.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                eq.status === 'maintenance' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {eq.status}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-300">{eq.powerKw ? `${eq.powerKw} кВт` : '—'}</td>
                            <td className="p-2.5 font-mono text-slate-400">{eq.lastMaintenanceDate || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {reportEquipment.length > 10 && (
                    <div className="p-2 text-center text-slate-400 text-[11px] bg-white/5 border-t border-white/5">
                      ... и еще {reportEquipment.length - 10} единиц оборудования (будут выгружены в полном объеме)
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Cloud Backups Tab */
            <div className="space-y-4 text-xs">
              {statusNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{statusNotice}</span>
                </div>
              )}

              {/* Cloud Provider Select & Trigger */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Интеграция с облачным хранилищем
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Автоматическая синхронизация
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'yandex', name: 'Yandex Object Storage', logo: 'Я' },
                    { id: 's3', name: 'Amazon S3 / MinIO', logo: 'S3' },
                    { id: 'gcs', name: 'Google Cloud Storage', logo: 'GCS' },
                    { id: 'local', name: 'Локальный кластер', logo: 'LAN' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setCloudProvider(p.id as any)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        cloudProvider === p.id 
                          ? 'border-blue-500 bg-blue-500/20 font-bold text-white' 
                          : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="text-sm font-black mb-0.5">{p.logo}</div>
                      <div className="text-[10px] truncate">{p.name}</div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <button
                    disabled={isCreatingBackup}
                    onClick={handleCreateCloudBackup}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>{isCreatingBackup ? 'Создание копии...' : 'Создать точку восстановления в облаке'}</span>
                  </button>

                  <label className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Восстановить из файла .JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleJSONFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Backups List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-300 text-xs">
                    Сохраненные снимки состояния завода ({backups.length}):
                  </span>
                  <button
                    onClick={fetchBackups}
                    className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                    title="Обновить список"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {backups.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
                    Резервные копии еще не создавались. Нажмите кнопку выше для сохранения текущего состояния.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {backups.map(b => {
                      const date = new Date(b.timestamp).toLocaleString('ru-RU');
                      return (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                              <HardDrive className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{b.name}</span>
                                <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
                                  {b.provider}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                🕒 {date}  |  📦 {b.nodesCount} элементов  |  👤 {b.author}  |  💾 {(b.sizeBytes / 1024).toFixed(1)} КБ
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRestoreCloudBackup(b.id)}
                            className="px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-semibold text-xs flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Применить снимок</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  exportToCSV, 
  exportToPDF, 
  exportToJSON, 
  copyProjectJSONToClipboard, 
  getHierarchyPath 
} from '../utils/exportUtils';
import { CloudBackup, CloudServiceType } from '../types';
import { 
  FileText, 
  Download, 
  Cloud, 
  X, 
  FileSpreadsheet, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive,
  Copy,
  Trash2,
  FolderDown,
  Layers,
  FileCode,
  ArrowDownToLine,
  ExternalLink,
  ClipboardPaste,
  ShieldCheck,
  Server
} from 'lucide-react';

export const ReportModal: React.FC = () => {
  const {
    state,
    isReportOpen,
    setIsReportOpen,
    isBackupOpen,
    setIsBackupOpen,
    createBackup,
    restoreBackup,
    deleteBackup,
    importProject,
    importProjectFromJSON,
    showToast,
    currentUser,
  } = useFactory();

  const isOpen = isReportOpen || isBackupOpen;

  // Tabs: 'export_import' or 'cloud'
  const [activeTab, setActiveTab] = useState<'export_import' | 'cloud'>(
    isBackupOpen ? 'cloud' : 'export_import'
  );

  useEffect(() => {
    if (isBackupOpen) {
      setActiveTab('cloud');
    } else if (isReportOpen) {
      setActiveTab('export_import');
    }
  }, [isBackupOpen, isReportOpen]);

  // Filters for CSV / PDF
  const [targetContainerId, setTargetContainerId] = useState<string>('all');
  
  // Cloud Backup State
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<CloudServiceType>('yandex');
  const [customBackupName, setCustomBackupName] = useState('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Paste JSON Drawer
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');

  // File drag & drop inside modal
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsReportOpen(false);
    setIsBackupOpen(false);
    setConfirmRestoreId(null);
    setShowPasteArea(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importProject(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await importProject(file);
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingBackup(true);
    const name = customBackupName.trim() || undefined;
    await createBackup(cloudProvider, name);
    setCustomBackupName('');
    setIsCreatingBackup(false);
  };

  const handleExecuteRestore = async (backupId: string) => {
    setIsRestoring(true);
    await restoreBackup(backupId);
    setIsRestoring(false);
    setConfirmRestoreId(null);
  };

  const handleCopyClipboard = async () => {
    const ok = await copyProjectJSONToClipboard(state);
    if (ok) {
      showToast('Скопировано в буфер', 'JSON структуры схемы предприятия готов для вставки', 'success');
    } else {
      showToast('Ошибка копирования', 'Не удалось получить доступ к буферу обмена', 'error');
    }
  };

  const handleImportPastedJSON = () => {
    if (!pastedJsonText.trim()) {
      showToast('Ошибка', 'Вставьте JSON-текст схемы в поле ввода', 'warning');
      return;
    }
    const res = importProjectFromJSON(pastedJsonText);
    if (res.success) {
      setPastedJsonText('');
      setShowPasteArea(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsExportingPDF(true);
    showToast('Генерация PDF', 'Формирование векторного паспорта оборудования...', 'info');
    try {
      const ok = await exportToPDF(state, targetContainerId);
      if (ok) {
        showToast('PDF сформирован', 'Файл паспорта предприятия загружен на устройство', 'success');
      } else {
        showToast('Ошибка PDF', 'Не удалось сформировать документ PDF', 'error');
      }
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleGenerateCSV = () => {
    const ok = exportToCSV(state, targetContainerId);
    if (ok) {
      showToast('CSV сформирован', 'Реестр оборудования сохранен для Excel/1С', 'success');
    }
  };

  const handleDownloadJSON = () => {
    const ok = exportToJSON(state);
    if (ok) {
      showToast('Проект экспортирован', 'Файл .json сохранен на диск', 'success');
    }
  };

  const allBackups = state.backups || [];

  return (
    <div 
      id="report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div 
        id="report-modal-container"
        className="bg-[#111318] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#16181F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              {activeTab === 'cloud' ? <Cloud className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{activeTab === 'cloud' ? 'Облачные снимки & Резервные копии' : 'Экспорт и Импорт проекта'}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  ПромСхема.IO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Перенос схемы предприятия между устройствами, экспорт документации и сохранение
              </p>
            </div>
          </div>

          <button 
            id="close-report-modal-btn"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-[#0E1015] px-6">
          <button
            id="tab-export-import-btn"
            onClick={() => setActiveTab('export_import')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export_import'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FolderDown className="w-4 h-4" />
            <span>Файлы & Перенос проекта (JSON / CSV / PDF)</span>
          </button>
          <button
            id="tab-cloud-backups-btn"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'cloud'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Облачные снимки ({allBackups.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'export_import' ? (
            <div className="space-y-6">
              {/* Device Transfer Card */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="font-semibold text-white text-sm">Синхронизация между устройствами и рабочими ПК</h4>
                  <p className="text-slate-300 leading-relaxed">
                    Все изменения сохраняются на сервере в режиме реального времени. Чтобы гарантированно перенести проект на рабочий компьютер:
                    скачайте файл <strong>.JSON</strong>, сохраните копию в облако или воспользуйтесь кнопкой копирования схемы в буфер обмена.
                  </p>
                </div>
              </div>

              {/* Grid of Main Export / Import Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. JSON Export & Backup */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-sm text-white">
                        <FileCode className="w-4 h-4 text-blue-400" />
                        <span>Экспорт проекта (.JSON)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                        Полная схема
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Выгрузка структуры завода: {state.equipment.length} ед. оборудования, {state.containers.length} цехов, {state.links.length} связей и история событий.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      id="export-json-file-btn"
                      onClick={handleDownloadJSON}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Скачать .JSON</span>
                    </button>
                    <button
                      id="copy-json-clipboard-btn"
                      onClick={handleCopyClipboard}
                      className="bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                      title="Скопировать JSON в буфер обмена"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="hidden sm:inline">Буфер</span>
                    </button>
                  </div>
                </div>

                {/* 2. JSON Import Dropzone */}
                <div 
                  id="import-dropzone"
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' 
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-sm text-white">
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span>Импорт проекта (.JSON)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        Восстановление
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Перетащите сюда файл проекта <strong>.json</strong> или выберите его на диске. Поддерживаются форматы бэкапов и экспорта.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      id="select-file-import-btn"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <FolderDown className="w-4 h-4" />
                      <span>Выбрать файл на диске</span>
                    </button>
                    <button
                      id="toggle-paste-json-btn"
                      onClick={() => setShowPasteArea(!showPasteArea)}
                      className="bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                      title="Вставить JSON из буфера"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      <span className="hidden sm:inline">Вставка</span>
                    </button>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept=".json,application/json" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </div>
              </div>

              {/* Expandable Textarea for Raw JSON import */}
              {showPasteArea && (
                <div className="p-4 rounded-xl border border-white/10 bg-[#161820] space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-blue-400" />
                      <span>Вставка JSON структуры напрямую</span>
                    </span>
                    <button 
                      onClick={() => setShowPasteArea(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Отмена
                    </button>
                  </div>
                  <textarea
                    id="paste-json-textarea"
                    value={pastedJsonText}
                    onChange={(e) => setPastedJsonText(e.target.value)}
                    placeholder="Вставьте сюда текст схемы в формате JSON..."
                    rows={5}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      id="apply-pasted-json-btn"
                      onClick={handleImportPastedJSON}
                      disabled={!pastedJsonText.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold py-1.5 px-4 rounded-lg transition-colors"
                    >
                      Применить и загрузить схему
                    </button>
                  </div>
                </div>
              )}

              {/* Documentation & Analytical Reports */}
              <div className="pt-2 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Техническая документация и отчеты</h3>
                    <p className="text-xs text-slate-400">Формирование официального паспорта оборудования и ведомостей для 1С/Excel</p>
                  </div>

                  {/* Container Selector Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Область:</span>
                    <select
                      id="report-container-filter"
                      value={targetContainerId}
                      onChange={(e) => setTargetContainerId(e.target.value)}
                      className="bg-[#181A22] border border-white/10 rounded-lg text-xs px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Весь завод ({state.equipment.length} ед.)</option>
                      {state.containers.map(cont => (
                        <option key={cont.id} value={cont.id}>
                          {cont.name} ({cont.tag})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PDF Passport */}
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-white">Паспорт завода в PDF</div>
                        <div className="text-[11px] text-slate-400">Векторный бланк, сводка статусов, аварий и нагрузок</div>
                      </div>
                    </div>
                    <button
                      id="export-pdf-report-btn"
                      onClick={handleGeneratePDF}
                      disabled={isExportingPDF}
                      className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-500/20 shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isExportingPDF ? 'Формирование...' : 'Сформировать PDF'}</span>
                    </button>
                  </div>

                  {/* CSV Registry */}
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-white">Реестр в CSV / Excel</div>
                        <div className="text-[11px] text-slate-400">Таблица с характеристиками, инв. номерами и ТО</div>
                      </div>
                    </div>
                    <button
                      id="export-csv-report-btn"
                      onClick={handleGenerateCSV}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20 shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Выгрузить CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Cloud Snapshots Tab */
            <div className="space-y-6">
              {/* Create Snapshot Block */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm text-white">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span>Создать снимок состояния схемы</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Версия: v{state.version || 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium">Хранилище / Провайдер</label>
                    <select
                      id="cloud-provider-select"
                      value={cloudProvider}
                      onChange={(e) => setCloudProvider(e.target.value as CloudServiceType)}
                      className="w-full bg-[#181A22] border border-white/10 rounded-lg text-xs px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="yandex">Yandex Cloud Object Storage</option>
                      <option value="s3">Amazon S3 Backup</option>
                      <option value="gcs">Google Cloud Storage</option>
                      <option value="local">Внутренний сервер предприятия</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] text-slate-400 font-medium">Наименование снимка (опционально)</label>
                    <div className="flex gap-2">
                      <input
                        id="custom-backup-name-input"
                        type="text"
                        value={customBackupName}
                        onChange={(e) => setCustomBackupName(e.target.value)}
                        placeholder={`Снимок от ${new Date().toLocaleDateString('ru-RU')}...`}
                        className="flex-1 bg-[#181A22] border border-white/10 rounded-lg text-xs px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        id="create-cloud-backup-btn"
                        onClick={handleCreateSnapshot}
                        disabled={isCreatingBackup}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 shrink-0"
                      >
                        {isCreatingBackup ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Cloud className="w-4 h-4" />
                        )}
                        <span>{isCreatingBackup ? 'Сохранение...' : 'Сохранить снимок'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Snapshots List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Доступные точки восстановления</span>
                    <span className="text-xs text-slate-400 font-normal">({allBackups.length})</span>
                  </h3>
                </div>

                {allBackups.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-white/10 bg-white/5 space-y-2">
                    <Cloud className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-300 font-medium">Нет сохраненных резервных копий</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Создайте первый снимок схемы кнопкой выше, чтобы зафиксировать текущее состояние предприятия
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {allBackups.map((b) => {
                      const isConfirming = confirmRestoreId === b.id;
                      const dateObj = new Date(b.timestamp);
                      const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={b.id}
                          id={`backup-item-${b.id}`}
                          className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white">{b.name}</span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {b.service}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>{formattedDate}</span>
                              <span>•</span>
                              <span>Оборудования: {b.equipmentCount}</span>
                              <span>•</span>
                              <span>Цехов: {b.containersCount}</span>
                              <span>•</span>
                              <span>{b.fileSizeKb} КБ</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            {isConfirming ? (
                              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 p-1 rounded-lg">
                                <span className="text-[11px] text-amber-300 px-1 font-medium">Перезаписать холст?</span>
                                <button
                                  id={`confirm-restore-${b.id}`}
                                  onClick={() => handleExecuteRestore(b.id)}
                                  disabled={isRestoring}
                                  className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold px-2 py-1 rounded transition-colors"
                                >
                                  {isRestoring ? 'Загрузка...' : 'Да'}
                                </button>
                                <button
                                  onClick={() => setConfirmRestoreId(null)}
                                  className="bg-white/10 hover:bg-white/20 text-slate-300 text-[11px] px-2 py-1 rounded transition-colors"
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  id={`restore-backup-btn-${b.id}`}
                                  onClick={() => setConfirmRestoreId(b.id)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
                                  title="Восстановить состояние из этого снимка"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                  <span>Применить</span>
                                </button>
                                <button
                                  id={`delete-backup-btn-${b.id}`}
                                  onClick={() => deleteBackup(b.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title="Удалить резервную копию"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#16181F] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Шифрование и контроль целостности данных активны</span>
          </div>
          <button
            id="close-report-modal-footer-btn"
            onClick={handleClose}
            className="bg-white/10 hover:bg-white/15 text-slate-200 font-semibold py-1.5 px-4 rounded-lg transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

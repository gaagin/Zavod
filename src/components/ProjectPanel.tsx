import React, { useState, useRef, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import {
  exportToJSON,
  copyProjectJSONToClipboard,
  exportToPDF,
  exportToExcel,
  exportToPNG,
  exportToSVG,
  exportToCSV,
  saveWithSystemFilePicker,
  selectSystemDirectory,
  saveProjectToDirectory
} from '../utils/exportUtils';
import {
  X,
  Save,
  FolderOpen,
  FolderCheck,
  FolderPlus,
  HardDrive,
  Download,
  Copy,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Code,
  FileCode,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  History,
  FilePlus,
  Upload,
  Activity,
  RotateCcw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileDown,
  Trash2
} from 'lucide-react';

export const ProjectPanel: React.FC = () => {
  const {
    state,
    isProjectPanelOpen,
    setIsProjectPanelOpen,
    autoSaveConfig,
    setAutoSaveConfig,
    saveStatus,
    lastSavedTime,
    forceSave,
    importProject,
    showToast,
    setIsBackupOpen,
    createBackup,
    setIsReportOpen,
    setIsEventLogsOpen,
    loadFactoryPreset,
  } = useFactory();

  const [timeAgoText, setTimeAgoText] = useState('только что');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropActive, setIsDropActive] = useState(false);

  // Folder selection state
  const directoryHandleRef = useRef<any>(null);
  const [targetDirectory, setTargetDirectory] = useState<{ name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('promschema_target_folder');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // "Save As" Modal state
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [includeLogsInSaveAs, setIncludeLogsInSaveAs] = useState(true);
  const [isSavingInProgress, setIsSavingInProgress] = useState(false);

  // Live timer for autosave
  useEffect(() => {
    const update = () => {
      const diffSec = Math.floor((Date.now() - lastSavedTime) / 1000);
      if (diffSec < 10) setTimeAgoText('только что');
      else if (diffSec < 60) setTimeAgoText(`${diffSec}с назад`);
      else {
        const diffMin = Math.floor(diffSec / 60);
        setTimeAgoText(`${diffMin}м назад`);
      }
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastSavedTime]);

  // Folder selection handler
  const handleSelectFolder = async () => {
    try {
      const res = await selectSystemDirectory();
      if (res.success && res.handle && res.dirName) {
        directoryHandleRef.current = res.handle;
        const info = { name: res.dirName };
        setTargetDirectory(info);
        try {
          localStorage.setItem('promschema_target_folder', JSON.stringify(info));
        } catch (e) {}
        showToast(
          'Папка сохранения выбрана',
          `Выбрана папка: «${res.dirName}». Проекты будут сохраняться в нее.`,
          'success'
        );
      } else if (!res.aborted && res.error) {
        showToast('Выбор папки', res.error, 'info');
      }
    } catch (err: any) {
      showToast(
        'Информация о сохранении',
        'Для прямого сохранения с выбором папки воспользуйтесь кнопкой «Сохранить как... (проводник ОС)».',
        'info'
      );
    }
  };

  // Clear target folder
  const handleClearFolder = () => {
    directoryHandleRef.current = null;
    setTargetDirectory(null);
    try {
      localStorage.removeItem('promschema_target_folder');
    } catch (e) {}
    showToast('Папка сброшена', 'Используется стандартный диалог сохранения браузера', 'info');
  };

  // Open "Save As" dialog with preset filename
  const handleOpenSaveAs = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
    setCustomFilename(`promschema_project_${dateStr}_${timeStr}`);
    setIsSaveAsOpen(true);
  };

  // Save with system picker (allows picking ANY folder in OS dialog)
  const handleSaveWithSystemPicker = async () => {
    if (!customFilename.trim()) return;
    setIsSavingInProgress(true);
    forceSave();
    const targetState = includeLogsInSaveAs
      ? state
      : { ...state, eventLogs: [] };

    try {
      const res = await saveWithSystemFilePicker(targetState, customFilename.trim());
      if (res.success) {
        showToast(
          'Файл сохранен',
          `Файл «${res.filename}» успешно записан в выбранную папку.`,
          'success'
        );
        setIsSaveAsOpen(false);
      } else if (!res.aborted) {
        showToast('Ошибка сохранения', res.error || 'Не удалось сохранить файл', 'error');
      }
    } finally {
      setIsSavingInProgress(false);
    }
  };

  // Save to pre-selected folder
  const handleSaveToSelectedDirectory = async () => {
    if (!directoryHandleRef.current || !customFilename.trim()) return;
    setIsSavingInProgress(true);
    forceSave();
    const targetState = includeLogsInSaveAs
      ? state
      : { ...state, eventLogs: [] };

    try {
      const res = await saveProjectToDirectory(
        directoryHandleRef.current,
        targetState,
        customFilename.trim()
      );
      if (res.success) {
        showToast(
          'Сохранено в целевую папку',
          `Файл «${res.filename}» записан в «${targetDirectory?.name}»`,
          'success'
        );
        setIsSaveAsOpen(false);
      } else {
        showToast('Ошибка записи', res.error || 'Не удалось записать в выбранную папку', 'error');
      }
    } finally {
      setIsSavingInProgress(false);
    }
  };

  // Confirm standard browser download save
  const handleConfirmSaveAsDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFilename.trim()) return;

    forceSave();
    const targetState = includeLogsInSaveAs
      ? state
      : { ...state, eventLogs: [] };

    const success = exportToJSON(targetState, customFilename.trim());
    if (success) {
      showToast(
        'Проект сохранен как новый файл',
        `Файл «${customFilename.trim().replace(/\.json$/i, '')}.json» отправлен на сохранение.`,
        'success'
      );
      setIsSaveAsOpen(false);
    } else {
      showToast('Ошибка сохранения', 'Не удалось скачать файл проекта.', 'error');
    }
  };

  // Quick Save
  const handleQuickSave = async () => {
    forceSave();
    if (directoryHandleRef.current) {
      const res = await saveProjectToDirectory(directoryHandleRef.current, state);
      if (res.success) {
        showToast(
          'Файл сохранен',
          `Файл «${res.filename}» записан в папку «${targetDirectory?.name}»`,
          'success'
        );
        return;
      }
    }
    exportToJSON(state);
    showToast('Файл проекта сохранен', 'Файл .json загружен. Все данные схемы сохранены.', 'success');
  };

  // File Import handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importProject(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Copy JSON
  const handleCopyJSON = async () => {
    const success = await copyProjectJSONToClipboard(state);
    if (success) {
      showToast('JSON скопирован', 'Схема скопирована в буфер обмена', 'success');
    } else {
      showToast('Ошибка', 'Не удалось скопировать данные в буфер обмена', 'error');
    }
  };

  // Drop zone inside panel
  const handlePanelDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.json') || file.type.includes('json'))) {
      await importProject(file);
    }
  };

  // Quick snapshot backup
  const handleCreateSnapshot = () => {
    const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    createBackup('yandex', `Точка восстановления ${timeStr}`);
    showToast('Снимок создан', `Контрольная точка от ${timeStr} сохранена.`, 'success');
  };

  const criticalAlarmsCount = state.equipment.filter(e => e.status === 'critical').length;

  return (
    <>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Floating Edge Toggle Tab on the LEFT EDGE */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-start pointer-events-none">
        <button
          id="toggle-project-panel-floating-tab"
          onClick={() => setIsProjectPanelOpen(!isProjectPanelOpen)}
          className={`pointer-events-auto flex items-center gap-2 py-3 px-2.5 bg-[#0E1015]/95 hover:bg-slate-800 text-white rounded-r-xl border-y border-r border-white/20 shadow-2xl backdrop-blur-md transition-all hover:pl-3 group ${
            isProjectPanelOpen ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
          }`}
          title="Открыть панель: Файлы, Сохранение, Папки и Экспорт"
        >
          <div className="flex flex-col items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving'
                ? 'bg-amber-400 animate-pulse'
                : autoSaveConfig.enabled
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-slate-500'
            }`} />
            <div className="[writing-mode:vertical-rl] text-[11px] font-bold tracking-wider uppercase text-slate-300 group-hover:text-blue-400 flex items-center gap-1.5 py-1 rotate-180">
              <span>Файлы и проект</span>
            </div>
            <Save className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
        </button>
      </div>

      {/* Backdrop overlay for clean mobile close */}
      {isProjectPanelOpen && (
        <div
          onClick={() => setIsProjectPanelOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sliding LEFT Collapsible Panel */}
      <aside
        id="left-project-management-panel"
        className={`fixed top-0 left-0 h-full w-84 sm:w-96 bg-[#0E1015] border-r border-white/10 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out select-none ${
          isProjectPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Файлы и проект</h2>
              <p className="text-[11px] text-slate-400">Сохранение, выбор папки и экспорт</p>
            </div>
          </div>

          <button
            id="close-project-panel-btn"
            onClick={() => setIsProjectPanelOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Скрыть панель (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-300">

          {/* SECTION 1: Target Folder Selection (REQUESTED FEATURE) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/30 to-indigo-950/20 border border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Папка сохранения
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                targetDirectory ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-slate-400'
              }`}>
                {targetDirectory ? 'НА ДИСКЕ' : 'СТАНДАРТ'}
              </span>
            </div>

            {/* Folder indicator */}
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Место сохранения:</span>
                {targetDirectory && (
                  <button
                    onClick={handleClearFolder}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
                    title="Сбросить выбранную папку"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Сбросить</span>
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-white font-medium break-all">
                {targetDirectory ? (
                  <>
                    <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-xs text-emerald-300">
                      {targetDirectory.name}
                    </span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-300 text-xs">
                      Папка загрузок браузера / Запрос ОС
                    </span>
                  </>
                )}
              </div>

              <div className="text-[10px] text-slate-400 pt-1 leading-snug">
                {targetDirectory
                  ? 'Файлы проектов будут направляться в выбранную папку на вашем компьютере.'
                  : 'Нажмите «Выбрать папку», чтобы назначить конкретный каталог для схем на вашем ПК.'}
              </div>
            </div>

            {/* Select Folder Action Button */}
            <button
              id="select-folder-btn"
              onClick={handleSelectFolder}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all hover:scale-[1.01] active:scale-95"
            >
              <FolderPlus className="w-4 h-4 text-blue-400" />
              <span>{targetDirectory ? 'Сменить целевую папку...' : 'Выбрать папку на диске...'}</span>
            </button>
          </div>

          {/* SECTION 2: Project File Operations */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Файл проекта схемы</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Quick Save */}
              <button
                id="panel-quick-save-btn"
                onClick={handleQuickSave}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95"
                title="Быстро сохранить текущую схему (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить</span>
              </button>

              {/* Save As */}
              <button
                id="panel-save-as-btn"
                onClick={handleOpenSaveAs}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95"
                title="Сохранить проект под другим именем или в другую папку"
              >
                <FilePlus className="w-4 h-4 text-indigo-400" />
                <span>Сохранить как...</span>
              </button>
            </div>

            {/* Open File */}
            <button
              id="panel-open-file-btn"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all hover:scale-[1.01] active:scale-95"
              title="Открыть файл проекта (.json) с диска"
            >
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>Открыть файл проекта (.json)</span>
            </button>

            {/* Drag and Drop Zone inside panel */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
              onDragLeave={() => setIsDropActive(false)}
              onDrop={handlePanelDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                isDropActive
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/15 hover:border-white/30 bg-white/[0.02] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-5 h-5 mx-auto mb-1 opacity-70" />
              <div className="text-[11px] font-medium">Перетащите сюда файл .json</div>
              <div className="text-[10px] text-slate-500 mt-0.5">или нажмите для выбора с диска</div>
            </div>

            {/* Copy JSON */}
            <button
              id="panel-copy-json-btn"
              onClick={handleCopyJSON}
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs transition-colors"
              title="Скопировать проект в буфер обмена для быстрой пересылки"
            >
              <div className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Скопировать JSON схемы в буфер</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          {/* SECTION 3: Real-time Auto-Save Status Card */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Автосохранение
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1 ${
                saveStatus === 'saving'
                  ? 'bg-amber-500/20 text-amber-300'
                  : autoSaveConfig.enabled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/10 text-slate-400'
              }`}>
                {saveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />
                    <span>Запись...</span>
                  </>
                ) : autoSaveConfig.enabled ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>АКТИВНО</span>
                  </>
                ) : (
                  <span>ВЫКЛЮЧЕНО</span>
                )}
              </span>
            </div>

            <div className="text-[11px] space-y-1.5 text-slate-300 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Последняя запись:</span>
                <span className="text-white font-mono text-[11px]">
                  {new Date(lastSavedTime).toLocaleTimeString('ru-RU')} ({timeAgoText})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Хранилище:</span>
                <span className="text-slate-200">Браузер + файл сервера</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  Мгновенное автосохранение
                </span>
                <input
                  type="checkbox"
                  checked={autoSaveConfig.enabled}
                  onChange={(e) => {
                    setAutoSaveConfig(prev => ({ ...prev, enabled: e.target.checked }));
                    showToast(
                      e.target.checked ? 'Автосохранение включено' : 'Автосохранение отключено',
                      e.target.checked ? 'Изменения сохраняются непрерывно.' : 'Используйте кнопки «Сохранить» или Ctrl+S.',
                      e.target.checked ? 'success' : 'warning'
                    );
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-white/20 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  Периодические автоснимки (5 мин)
                </span>
                <input
                  type="checkbox"
                  checked={autoSaveConfig.autoSnapshots}
                  onChange={(e) => {
                    setAutoSaveConfig(prev => ({ ...prev, autoSnapshots: e.target.checked }));
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-white/20 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* SECTION 4: Backups & Restore Points */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Резервные копии и история</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="panel-open-backups-btn"
                onClick={() => setIsBackupOpen(true)}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors"
                title="История сохраненных копий и облачные снимки"
              >
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>Все бэкапы</span>
              </button>

              <button
                id="panel-create-snapshot-btn"
                onClick={handleCreateSnapshot}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-colors"
                title="Создать контрольную точку схемы прямо сейчас"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Создать снимок</span>
              </button>
            </div>
          </div>

          {/* SECTION 5: Export Formats */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Экспорт документации</span>
            </div>

            <div className="space-y-1.5 text-xs">
              {/* PDF Passport */}
              <button
                id="panel-export-pdf-btn"
                onClick={() => {
                  exportToPDF(state);
                  showToast('Паспорт сформирован', 'Файл PDF готов к загрузке', 'success');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-white">Паспорт предприятия (PDF)</div>
                    <div className="text-[10px] text-slate-400">Технический паспорт со сводкой и ведомостью</div>
                  </div>
                </div>
                <FileDown className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
              </button>

              {/* Excel */}
              <button
                id="panel-export-excel-btn"
                onClick={() => {
                  exportToExcel(state);
                  showToast('Таблица Excel создана', 'Файл .xls реестра готов', 'success');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-white">Реестр оборудования (Excel)</div>
                    <div className="text-[10px] text-slate-400">Таблица параметров и мощностей для 1C/ERP</div>
                  </div>
                </div>
                <FileDown className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
              </button>

              {/* PNG */}
              <button
                id="panel-export-png-btn"
                onClick={() => {
                  exportToPNG(state);
                  showToast('Изображение готово', 'Схема в формате PNG сохранена', 'success');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-white">Графика схемы (PNG)</div>
                    <div className="text-[10px] text-slate-400">Высокое разрешение FullHD для отчетов</div>
                  </div>
                </div>
                <FileDown className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
              </button>

              {/* SVG */}
              <button
                id="panel-export-svg-btn"
                onClick={() => {
                  exportToSVG(state);
                  showToast('Вектор сформирован', 'Файл SVG схемы сохранен', 'success');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-white">Векторная графика (SVG)</div>
                    <div className="text-[10px] text-slate-400">Масштабируемый вектор схемы для печати</div>
                  </div>
                </div>
                <FileDown className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
              </button>

              {/* CSV */}
              <button
                id="panel-export-csv-btn"
                onClick={() => {
                  exportToCSV(state);
                  showToast('CSV готов', 'Таблица спецификации сохранена', 'success');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-white">Спецификация (CSV)</div>
                    <div className="text-[10px] text-slate-400">Для интеграции со сторонними SCADA / 1C</div>
                  </div>
                </div>
                <FileDown className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
              </button>
            </div>
          </div>

          {/* SECTION 6: Analytics & Logs & Preset Reset */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Дополнительные модули</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                id="panel-open-report-btn"
                onClick={() => {
                  setIsReportOpen(true);
                  setIsProjectPanelOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-white transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Отчеты</span>
              </button>

              <button
                id="panel-open-logs-btn"
                onClick={() => {
                  setIsEventLogsOpen(true);
                  setIsProjectPanelOpen(false);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Логи аварий</span>
                </div>
                {criticalAlarmsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                    {criticalAlarmsCount}
                  </span>
                )}
              </button>
            </div>

            <button
              id="panel-reset-preset-btn"
              onClick={() => {
                if (window.confirm('Сбросить текущую схему к базовому заводскому шаблону? Несохраненные изменения будут перезаписаны.')) {
                  loadFactoryPreset();
                  showToast('Схема сброшена', 'Загружен заводской типовой проект предприятия.', 'info');
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 text-xs transition-colors mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить к заводскому шаблону</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-white/10 bg-white/[0.01] text-[10px] text-slate-500 text-center flex items-center justify-between">
          <span>Схема SCADA v{state.version || 1}</span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Все узлы защищены
          </span>
        </div>
      </aside>

      {/* SAVE AS MODAL DIALOG WITH DIRECTORY SELECTION */}
      {isSaveAsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            id="save-as-dialog"
            className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FilePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Сохранить проект как...</h3>
                  <p className="text-xs text-slate-400">Выбор имени файла, папки назначения и параметров</p>
                </div>
              </div>
              <button
                onClick={() => setIsSaveAsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSaveAsDownload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Имя файла проекта:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="promschema_project"
                    autoFocus
                    className="w-full pl-3 pr-16 py-2 rounded-xl bg-slate-800/90 border border-white/20 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                    .json
                  </div>
                </div>
              </div>

              {/* Destination folder options card */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    <span>Папка назначения на компьютере:</span>
                  </span>
                  {targetDirectory ? (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <FolderCheck className="w-3 h-3" />
                      {targetDirectory.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Папка загрузок / диалог ОС
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  Вы можете выбрать конкретную папку через системный проводник или сохранить в заранее назначенную.
                </div>

                {/* System File Picker Button (OS Native Dialog - user picks folder directly) */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleSaveWithSystemPicker}
                    disabled={isSavingInProgress}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Выбрать папку и сохранить (проводник ОС)</span>
                  </button>

                  {directoryHandleRef.current && (
                    <button
                      type="button"
                      onClick={handleSaveToSelectedDirectory}
                      disabled={isSavingInProgress}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>В папку «{targetDirectory?.name}»</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Включить журнал аварий и системных событий</span>
                  <input
                    type="checkbox"
                    checked={includeLogsInSaveAs}
                    onChange={(e) => setIncludeLogsInSaveAs(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-white/20"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveAsOpen(false)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={isSavingInProgress}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-all"
                  title="Скачать файл через стандартный механизм загрузок браузера"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать через браузер</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

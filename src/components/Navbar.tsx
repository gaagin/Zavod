import React, { useState, useRef, useEffect } from 'react';
import { 
  useFactory 
} from '../context/FactoryContext';
import { UserRole } from '../types';
import { 
  Factory, 
  Search, 
  Sun, 
  Moon, 
  Users, 
  Radio, 
  ChevronDown, 
  Check, 
  Save,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Undo2,
  Redo2,
  FolderCheck,
  FolderPlus,
  FolderOpen,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  HardDrive,
  Laptop,
  Smartphone,
  Copy,
  ExternalLink,
  Share2,
  Zap,
  Menu,
  X,
  Activity,
  Sliders,
  ArrowLeft
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    setCurrentUserRole, 
    setCurrentUserName,
    onlineUsers, 
    connectionStatus,
    isDarkMode, 
    toggleDarkMode,
    setIsSearchOpen,
    isProjectPanelOpen,
    setIsProjectPanelOpen,
    addEventLog,
    autoSaveConfig,
    setAutoSaveConfig,
    saveStatus,
    lastSavedTime,
    lastSavedFilePath,
    lastSyncEvent,
    sendPingSync,
    folderWatchActive,
    lastFolderFileChangeNotice,
    lastFolderSyncTime,
    checkFolderNow,
    targetDirectory,
    targetProjectFilename,
    selectTargetFolder,
    hasDirectoryPermission,
    requestDirectoryAccess,
    forceSave,
    showToast,
    undo,
    redo,
    canUndo,
    canRedo,
    isMobileSummaryOpen,
    setIsMobileSummaryOpen,
    focusedContainerId,
    goBackOneLevel,
    parentFocusName,
  } = useFactory();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);
  const [autosaveMenuOpen, setAutosaveMenuOpen] = useState(false);
  const [isCheckingFolder, setIsCheckingFolder] = useState(false);
  const [isMobileNavMenuOpen, setIsMobileNavMenuOpen] = useState(false);
  const [mobileNavSections, setMobileNavSections] = useState({
    role: true,
    autosave: true,
    users: false,
    project: true,
  });

  const toggleNavSection = (key: keyof typeof mobileNavSections) =>
    setMobileNavSections(prev => ({ ...prev, [key]: !prev[key] }));

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const usersMenuRef = useRef<HTMLDivElement>(null);
  const autosaveMenuRef = useRef<HTMLDivElement>(null);

  const [timeAgoText, setTimeAgoText] = useState('только что');

  const handleCheckFolderNow = async () => {
    setIsCheckingFolder(true);
    try {
      const changed = await checkFolderNow();
      if (!changed) {
        showToast('Файл актуален', 'Изменений в файле папки не обнаружено. Схема полностью синхронизирована.', 'info');
      }
    } finally {
      setTimeout(() => setIsCheckingFolder(false), 500);
    }
  };

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

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (usersMenuRef.current && !usersMenuRef.current.contains(e.target as Node)) {
        setUsersMenuOpen(false);
      }
      if (autosaveMenuRef.current && !autosaveMenuRef.current.contains(e.target as Node)) {
        setAutosaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyShareLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      showToast('Ссылка скопирована', 'Откройте эту ссылку на втором устройстве (ПК или планшете) для совместной работы и синхронного автосохранения.', 'success');
    } catch {
      showToast('Ссылка на проект', window.location.href, 'info');
    }
  };

  const roleLabels: Record<UserRole, { label: string; desc: string; badgeColor: string }> = {
    admin: { label: 'Главный инженер', desc: 'Полный доступ к схеме, оборудованию и бэкапам', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
    operator: { label: 'Диспетчер смены', desc: 'Переключение режимов работы и регистрация инцидентов', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    maintenance: { label: 'Сервисный техник', desc: 'Проведение ТО, калибровка датчиков и наряды', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    viewer: { label: 'Аудитор (Просмотр)', desc: 'Только чтение, аналитика и экспорт документов', badgeColor: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
  };

  return (
    <>
      <header className="h-14 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-slate-700 dark:text-slate-300 px-2 sm:px-4 flex items-center justify-between z-30 select-none transition-colors">
      {/* Brand & Factory Header */}
      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5 font-bold tracking-tight">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-md flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Factory className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-none flex items-center gap-1">
              <span>ПромСхема</span>
              <span className="text-blue-500 font-mono text-[10px] sm:text-xs hidden xs:inline">.IO</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold tracking-widest uppercase border border-blue-500/20 hidden sm:inline">
                SCADA
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5 hidden sm:block">
              Диспетчеризация & Мониторинг цехов
            </div>
          </div>
        </div>

        {/* Back Button to go one level up in hierarchy (Desktop & Mobile) */}
        {focusedContainerId && (
          <button
            id="nav-back-one-level-btn"
            type="button"
            onClick={goBackOneLevel}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs shadow-md shadow-blue-500/20 border border-blue-400/30 transition-all cursor-pointer shrink-0"
            title={`Перейти на один уровень назад: к "${parentFocusName || 'предыдущему уровню'}" (Backspace или Alt+←)`}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold">Назад</span>
            {parentFocusName && (
              <span className="hidden sm:inline text-[11px] font-normal opacity-90 truncate max-w-[130px]">
                ({parentFocusName})
              </span>
            )}
          </button>
        )}

        {/* Vertical divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-0.5 hidden sm:block" />

        {/* Live sync & Online users badge */}
        <div className="relative" ref={usersMenuRef}>
          <button 
            id="online-users-btn"
            type="button"
            onClick={() => setUsersMenuOpen(!usersMenuOpen)}
            className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            title="Синхронизация в реальном времени"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="hidden md:inline text-[11px]">
              {connectionStatus === 'connected' ? 'Sync Active' : 'Connecting...'}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 sm:border-l sm:border-slate-200 dark:sm:border-white/10 sm:pl-1.5 sm:ml-0.5">
              <Users className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{onlineUsers.length}</span>
            </span>
          </button>

          {/* Active online users popover */}
          {usersMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
                onClick={() => setUsersMenuOpen(false)}
              />
              <div className="fixed inset-x-3 top-16 z-50 sm:absolute sm:top-full sm:left-0 sm:inset-x-auto sm:w-64 max-w-xs bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-3 text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>Пользователи онлайн</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono">Live WS</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {onlineUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: u.color }} 
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                          {u.name} {u.id === currentUser.id ? '(Вы)' : ''}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 shrink-0">
                        {roleLabels[u.role]?.label || u.role}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-400 dark:text-slate-500">
                  Движения курсоров и изменения блоков обновляются мгновенно.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center Search Trigger (Visible on md+ screens) */}
      <div className="flex-1 max-w-xs md:max-w-sm lg:max-w-md mx-2 sm:mx-4 hidden md:block">
        <button
          id="global-search-btn"
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-colors group shadow-2xs"
          title="Глобальный поиск оборудования, цехов, задач ТО и логов (Ctrl+K или /)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">Поиск по схеме, задачам ТО, логам...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-slate-200/70 dark:bg-white/10 border border-slate-300/70 dark:border-white/15 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 shadow-2xs shrink-0 ml-1">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Undo & Redo History Controls (Desktop only, mobile has it in bottom dock) */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5">
          <button
            id="nav-undo-btn"
            type="button"
            disabled={!canUndo}
            onClick={undo}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              canUndo
                ? 'bg-blue-50 dark:bg-blue-600/25 hover:bg-blue-100 dark:hover:bg-blue-600/40 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white border border-blue-200 dark:border-blue-500/40 shadow-2xs active:scale-95'
                : 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-500 border border-transparent'
            }`}
            title={canUndo ? 'Отменить последнее действие (Ctrl+Z)' : 'Нет действий для отмены'}
          >
            <Undo2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Отменить</span>
          </button>
          <button
            id="nav-redo-btn"
            type="button"
            disabled={!canRedo}
            onClick={redo}
            className={`p-1.5 rounded-md text-xs transition-all ${
              canRedo
                ? 'hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95'
                : 'opacity-25 cursor-not-allowed text-slate-400 dark:text-slate-600'
            }`}
            title={canRedo ? 'Повторить действие (Ctrl+Y)' : 'Нет действий для повтора'}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile & Tablet Search Button (Visible on screens < md) */}
        <button
          id="nav-mobile-search-btn"
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="md:hidden p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold shadow-2xs transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
          title="Поиск оборудования и логов (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="hidden sm:inline">Поиск</span>
        </button>

        {/* Dedicated AutoSave Status & Multi-Device Sync Widget */}
        <div className="relative" ref={autosaveMenuRef}>
          <button
            id="nav-autosave-status-btn"
            type="button"
            onClick={() => setAutosaveMenuOpen(!autosaveMenuOpen)}
            className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 ${
              saveStatus === 'saving'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : saveStatus === 'error'
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 shadow-2xs'
            }`}
            title="Статус автосохранения и одновременной синхронизации между устройствами"
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <div className="relative flex items-center justify-center shrink-0">
                <span className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline">
                {saveStatus === 'saving'
                  ? 'Сохранение...'
                  : saveStatus === 'error'
                  ? 'Ошибка'
                  : 'Автосохранено'}
              </span>

              {saveStatus === 'saved' && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono hidden xl:inline">
                  • {timeAgoText}
                </span>
              )}
            </div>

            {/* Multi-Device & Live Sync Indicator Badge */}
            {lastFolderFileChangeNotice && (Date.now() - lastFolderFileChangeNotice.timestamp < 15000) ? (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-500/50 shrink-0 animate-pulse">
                <FolderCheck className="w-2.5 h-2.5 text-emerald-500" />
                <span className="hidden sm:inline">Из папки ⚡</span>
              </span>
            ) : lastSyncEvent && (Date.now() - lastSyncEvent.timestamp < 6000) ? (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/40 shrink-0 animate-pulse">
                <Zap className="w-2.5 h-2.5 text-emerald-500" />
                <span className="hidden sm:inline">Синхронно</span>
              </span>
            ) : onlineUsers.length > 1 ? (
              <span
                className="hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono border border-blue-500/30 shrink-0"
                title={`${onlineUsers.length} устройства онлайн: синхронизация и автосохранение происходят одновременно на обоих`}
              >
                <Laptop className="w-2.5 h-2.5 text-blue-500" />
                <span>{onlineUsers.length} устр.</span>
              </span>
            ) : null}

            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 hidden xs:inline ${autosaveMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Detailed Autosave & Multi-Device Popover */}
          {autosaveMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
                onClick={() => setAutosaveMenuOpen(false)}
              />
              <div className="fixed inset-x-2 top-16 z-50 sm:absolute sm:top-full sm:right-0 sm:inset-x-auto sm:w-[420px] max-w-[calc(100vw-1rem)] max-h-[85vh] overflow-y-auto bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    saveStatus === 'saving'
                      ? 'bg-amber-400 animate-pulse'
                      : saveStatus === 'error'
                      ? 'bg-rose-500'
                      : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  }`} />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Статус автосохранения
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {new Date(lastSavedTime).toLocaleTimeString('ru-RU')} ({timeAgoText})
                </span>
              </div>

              {/* Multi-Device Simultaneous Autosaving Highlight Section */}
              <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-500/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Синхронизация между устройствами</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                          АКТИВНО
                        </span>
                      </div>
                      <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium mt-0.5">
                        {onlineUsers.length > 1
                          ? `Подключено устройств: ${onlineUsers.length} (одновременное автосохранение)`
                          : 'Готово к одновременной работе на 2 устройствах'}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white font-semibold">Да, одновременное автосохранение на двух устройствах полностью поддерживается.</strong> Все изменения со всех открытых компьютеров или планшетов мгновенно передаются через WebSocket и синхронно автосохраняются на сервере и во всех клиентских сессиях.
                </p>

                <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-white/10 rounded-lg shadow-2xs transition-all active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать ссылку для 2-го устройства</span>
                  </button>

                  <button
                    type="button"
                    onClick={sendPingSync}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg shadow-2xs transition-all active:scale-95"
                    title="Отправить мгновенный тестовый сигнал синхронизации на второе устройство"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Тест связи</span>
                  </button>
                </div>

                {/* Last Received Remote Sync Notification */}
                {lastSyncEvent && (
                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium truncate">
                      <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{lastSyncEvent.reason}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                        (от {lastSyncEvent.senderName || 'устройства'})
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono shrink-0 ml-2">
                      {new Date(lastSyncEvent.timestamp).toLocaleTimeString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>

              {/* Storage Destinations List */}
              <div className="mt-3 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Уровни автосохранения
                </div>

                {/* 1. SCADA Server */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        Центральный SCADA-сервер
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Автосохранение на сервер и мгновенная репликация
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono">
                    {connectionStatus === 'connected' ? 'Синхронизировано' : 'Подключение...'}
                  </span>
                </div>

                {/* 2. Browser LocalStorage */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-500 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        Локальный кэш браузера
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        LocalStorage (мгновенное сохранение на этом устройстве)
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono">
                    Сохранено
                  </span>
                </div>

                {/* 3. Local Folder on PC */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderCheck className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Общая папка на диске</span>
                          {folderWatchActive && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                              СЛЕЖЕНИЕ ⚡
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[210px]">
                          {targetDirectory ? `${targetDirectory.name}/${targetProjectFilename}` : 'Не выбрана (опционально)'}
                        </div>
                      </div>
                    </div>
                    {targetDirectory ? (
                      <div className="flex items-center gap-1.5">
                        {hasDirectoryPermission ? (
                          <>
                            <button
                              type="button"
                              onClick={handleCheckFolderNow}
                              disabled={isCheckingFolder}
                              title="Проверить изменения файла в папке прямо сейчас"
                              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingFolder ? 'animate-spin text-emerald-400' : ''}`} />
                            </button>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono">
                              Активно
                            </span>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              requestDirectoryAccess();
                              setAutosaveMenuOpen(false);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                            title="Браузер ожидает разрешения на запись"
                          >
                            Подтвердить
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          selectTargetFolder();
                          setAutosaveMenuOpen(false);
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-medium hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-colors"
                      >
                        Выбрать папку
                      </button>
                    )}
                  </div>

                  {targetDirectory && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5 text-[10px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Слежение за изменениями:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">в реальном времени (каждые 1.2 с)</span>
                      </div>
                      {lastFolderFileChangeNotice && (
                        <div className="text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20 truncate">
                          {lastFolderFileChangeNotice.summary}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    forceSave();
                    setAutosaveMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить сейчас</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAutosaveMenuOpen(false);
                    setIsProjectPanelOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <span>Панель проекта и файлы</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            </>
          )}
        </div>

        {/* Local Folder Indicator (If selected on this machine) */}
        {targetDirectory && (
          <button
            id="nav-folder-status-btn"
            type="button"
            onClick={() => {
              if (!hasDirectoryPermission) {
                requestDirectoryAccess();
              } else {
                setIsProjectPanelOpen(true);
              }
            }}
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              !hasDirectoryPermission
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/20 shadow-xs'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
            title={
              !hasDirectoryPermission
                ? 'Доступ к папке требует подтверждения браузера. Нажмите, чтобы разрешить запись.'
                : `Зеркалирование активно в папку: ${targetDirectory.name}/${targetProjectFilename}`
            }
          >
            {hasDirectoryPermission ? (
              <FolderCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-500 animate-pulse" />
            )}
            <span className="truncate max-w-[110px] font-sans font-medium text-slate-800 dark:text-slate-200">
              {targetDirectory.name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">/</span>
            <span className="truncate max-w-[100px] text-[11px] text-slate-600 dark:text-slate-300 font-mono">
              {targetProjectFilename}
            </span>
            {!hasDirectoryPermission && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-sans font-semibold border border-amber-500/30">
                Подтвердить доступ
              </span>
            )}
          </button>
        )}

        {/* Project & Files Right Panel Toggle Button */}
        <button
          id="open-project-panel-btn"
          type="button"
          onClick={() => setIsProjectPanelOpen(!isProjectPanelOpen)}
          className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
            isProjectPanelOpen
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40'
              : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
          }`}
          title="Открыть панель: сохранение, открытие файлов, экспорт и бэкапы"
        >
          <div className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                saveStatus === 'saving'
                  ? 'bg-amber-400 animate-pulse'
                  : autoSaveConfig.enabled
                  ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-slate-400 dark:bg-slate-500'
              }`}
            />
            <Save className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <span className="font-medium hidden sm:inline">Файлы и проект</span>
          <ChevronRight className={`w-3.5 h-3.5 hidden sm:inline transition-transform duration-200 ${isProjectPanelOpen ? 'rotate-90' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={toggleDarkMode}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-slate-200 dark:border-white/10 shrink-0"
          title={isDarkMode ? 'Включить светлую тему' : 'Включить темную тему (ночная смена)'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Role Switcher & Avatar */}
        <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-200 dark:border-white/10 pl-1 sm:pl-2.5 shrink-0">
          <div className="relative" ref={roleMenuRef}>
            {/* Desktop Role Button */}
            <button
              id="role-switcher-btn"
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all uppercase tracking-wide shrink-0"
              title="Уровень доступа и роль пользователя"
            >
              <span className="truncate max-w-[70px] sm:max-w-[130px]">
                {roleLabels[currentUser.role]?.label}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Mobile Avatar Button (Tapping directly opens role switcher) */}
            <button
              id="mobile-user-avatar-role-btn"
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="sm:hidden w-7 h-7 rounded-full bg-slate-200 text-slate-700 dark:bg-gradient-to-tr dark:from-slate-700 dark:to-slate-500 dark:text-white border border-slate-300 dark:border-white/20 flex items-center justify-center text-[10px] font-bold shadow-2xs shrink-0 active:scale-95 transition-transform"
              title={`Роль: ${roleLabels[currentUser.role]?.label}. Нажмите для смены.`}
            >
              {currentUser.name.slice(0, 2).toUpperCase()}
            </button>

            {roleMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
                  onClick={() => setRoleMenuOpen(false)}
                />
                <div className="fixed inset-x-3 top-16 z-50 sm:absolute sm:right-0 sm:inset-x-auto sm:w-72 max-w-xs mx-auto bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-2 text-slate-800 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Переключение роли доступа
                  </div>
                  <div className="space-y-1">
                    {(['admin', 'operator', 'maintenance', 'viewer'] as UserRole[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setCurrentUserRole(r);
                          setRoleMenuOpen(false);
                          addEventLog({
                            targetId: currentUser.id,
                            targetName: currentUser.name,
                            targetType: 'system',
                            eventType: 'status_change',
                            severity: 'info',
                            description: `Сменена роль пользователя на "${roleLabels[r].label}"`,
                            userName: currentUser.name,
                            userRole: r,
                          });
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                          currentUser.role === r 
                            ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white font-semibold' 
                            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="text-slate-900 dark:text-slate-200 font-medium">
                            {roleLabels[r].label}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            {roleLabels[r].desc}
                          </div>
                        </div>
                        {currentUser.role === r && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-500 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop User initials badge */}
          <div 
            className="hidden sm:flex w-7 h-7 rounded-full bg-slate-200 text-slate-700 dark:bg-gradient-to-tr dark:from-slate-700 dark:to-slate-500 dark:text-white border border-slate-300 dark:border-white/20 items-center justify-center text-[10px] font-bold shadow-2xs shrink-0"
            title={currentUser.name}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>

          {/* Mobile All-in-One Menu Toggle */}
          <button
            id="mobile-nav-toggle-btn"
            type="button"
            onClick={() => setIsMobileNavMenuOpen(!isMobileNavMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            title="Все параметры системы и скрывающиеся списки"
          >
            {isMobileNavMenuOpen ? <X className="w-4 h-4 text-blue-500" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>

    {/* Full Mobile System Menu with Collapsible Lists */}
    {isMobileNavMenuOpen && (
      <div 
        id="mobile-nav-drawer-backdrop"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsMobileNavMenuOpen(false);
        }}
      >
        <div 
          id="mobile-nav-drawer-sheet"
          className="w-full bg-white dark:bg-[#111116] border-t border-slate-200 dark:border-white/15 rounded-t-3xl shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Параметры и управление SCADA</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Все разделы системы и настройки</p>
              </div>
            </div>
            <button
              id="close-mobile-nav-drawer-btn"
              type="button"
              onClick={() => setIsMobileNavMenuOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content with Collapsible Sections */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {focusedContainerId && (
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Фокусный режим активен</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">К: {parentFocusName || 'Общий план'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    goBackOneLevel();
                    setIsMobileNavMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад на уровень</span>
                </button>
              </div>
            )}

            {/* 1. Collapsible Section: User Role Switcher & Profile */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/5">
              <button
                id="mobile-nav-sec-role-toggle"
                type="button"
                onClick={() => toggleNavSection('role')}
                className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Уровень доступа и роль</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {roleLabels[currentUser.role]?.label}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${mobileNavSections.role ? 'rotate-180' : ''}`} />
              </button>

              {mobileNavSections.role && (
                <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2 bg-white dark:bg-[#0B0B0E]">
                  {/* Name field */}
                  <div className="mb-2">
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Имя текущего пользователя:
                    </label>
                    <input
                      type="text"
                      value={currentUser.name}
                      onChange={(e) => setCurrentUserName(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    {(['admin', 'operator', 'maintenance', 'viewer'] as UserRole[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setCurrentUserRole(r);
                          addEventLog({
                            targetId: currentUser.id,
                            targetName: currentUser.name,
                            targetType: 'system',
                            eventType: 'status_change',
                            severity: 'info',
                            description: `Сменена роль пользователя на "${roleLabels[r].label}"`,
                            userName: currentUser.name,
                            userRole: r,
                          });
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start justify-between border ${
                          currentUser.role === r 
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-medium' 
                            : 'bg-slate-50/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {roleLabels[r].label}
                            {currentUser.role === r && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500 text-white font-mono">
                                Активно
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {roleLabels[r].desc}
                          </div>
                        </div>
                        {currentUser.role === r && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Collapsible Section: AutoSave & Storage */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/5">
              <button
                id="mobile-nav-sec-autosave-toggle"
                type="button"
                onClick={() => toggleNavSection('autosave')}
                className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-emerald-500" />
                  <span>Автосохранение и папка на диске</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    autoSaveConfig.enabled 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                      : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                  }`}>
                    {autoSaveConfig.enabled ? `${autoSaveConfig.intervalSeconds}с` : 'Выкл'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${mobileNavSections.autosave ? 'rotate-180' : ''}`} />
              </button>

              {mobileNavSections.autosave && (
                <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-3 bg-white dark:bg-[#0B0B0E]">
                  {/* Status row */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        saveStatus === 'saving'
                          ? 'bg-amber-400 animate-pulse'
                          : saveStatus === 'error'
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {saveStatus === 'saving'
                          ? 'Идет запись...'
                          : saveStatus === 'error'
                          ? 'Ошибка записи'
                          : 'Сохранено актуально'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {timeAgoText}
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="mobile-nav-force-save-btn"
                      type="button"
                      onClick={() => forceSave()}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Сохранить сейчас</span>
                    </button>
                    <button
                      id="mobile-nav-check-folder-btn"
                      type="button"
                      disabled={isCheckingFolder}
                      onClick={handleCheckFolderNow}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingFolder ? 'animate-spin' : ''}`} />
                      <span>Проверить папку</span>
                    </button>
                  </div>

                  {/* Directory Access */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Папка проекта:</span>
                      <span className="text-[11px] font-mono text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                        {targetDirectory?.name || 'SCADA-Files'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={selectTargetFolder}
                      className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>Выбрать локальную папку...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Collapsible Section: Multi-Device Sync & Online Users */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/5">
              <button
                id="mobile-nav-sec-users-toggle"
                type="button"
                onClick={() => toggleNavSection('users')}
                className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-blue-500" />
                  <span>Онлайн синхронизация и устройства</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    {onlineUsers.length} устр.
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${mobileNavSections.users ? 'rotate-180' : ''}`} />
              </button>

              {mobileNavSections.users && (
                <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2.5 bg-white dark:bg-[#0B0B0E]">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="text-slate-500 dark:text-slate-400">Статус WebSocket:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Live WS Подключено
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {onlineUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {u.name} {u.id === currentUser.id ? '(Вы)' : ''}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono">
                          {roleLabels[u.role]?.label || u.role}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={sendPingSync}
                      className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Тест пинга</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Ссылка для второго устр.</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Collapsible Section: Panels, Views & Project */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/5">
              <button
                id="mobile-nav-sec-project-toggle"
                type="button"
                onClick={() => toggleNavSection('project')}
                className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FolderCheck className="w-4 h-4 text-purple-500" />
                  <span>Панели и быстрые действия</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${mobileNavSections.project ? 'rotate-180' : ''}`} />
              </button>

              {mobileNavSections.project && (
                <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2 bg-white dark:bg-[#0B0B0E]">
                  <button
                    id="mobile-nav-open-files-btn"
                    type="button"
                    onClick={() => {
                      setIsProjectPanelOpen(true);
                      setIsMobileNavMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4 text-blue-500" />
                      <span>Панель «Файлы и проект»</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    id="mobile-nav-open-summary-btn"
                    type="button"
                    onClick={() => {
                      setIsMobileSummaryOpen(true);
                      setIsMobileNavMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <span>Сводка завода и цехи (KPIs)</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    id="mobile-nav-open-search-btn"
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(true);
                      setIsMobileNavMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-500" />
                      <span>Глобальный поиск по схеме</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Ctrl+K</span>
                  </button>

                  <button
                    id="mobile-nav-toggle-theme-btn"
                    type="button"
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium"
                  >
                    <div className="flex items-center gap-2">
                      {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                      <span>{isDarkMode ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{isDarkMode ? 'Ночная' : 'Дневная'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

};

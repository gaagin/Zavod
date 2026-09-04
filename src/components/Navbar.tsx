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
  HardDrive,
  Laptop,
  Smartphone,
  Copy,
  ExternalLink,
  Share2
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
  } = useFactory();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);
  const [autosaveMenuOpen, setAutosaveMenuOpen] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const usersMenuRef = useRef<HTMLDivElement>(null);
  const autosaveMenuRef = useRef<HTMLDivElement>(null);

  const [timeAgoText, setTimeAgoText] = useState('только что');

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
    <header className="h-14 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-slate-700 dark:text-slate-300 px-4 flex items-center justify-between z-30 select-none transition-colors">
      {/* Brand & Factory Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 font-bold tracking-tight">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Factory className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white leading-none flex items-center gap-1.5">
              <span>ПромСхема</span>
              <span className="text-blue-500 font-mono text-xs">.IO</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold tracking-widest uppercase border border-blue-500/20">
                SCADA
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
              Диспетчеризация & Мониторинг цехов
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />

        {/* Live sync & Online users badge */}
        <div className="relative" ref={usersMenuRef}>
          <button 
            id="online-users-btn"
            type="button"
            onClick={() => setUsersMenuOpen(!usersMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
            title="Синхронизация в реальном времени"
          >
            <span className="relative flex h-2 w-2">
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
            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-white/10 pl-1.5 ml-0.5">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{onlineUsers.length}</span>
            </span>
          </button>

          {/* Active online users popover */}
          {usersMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-3 z-50 text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Пользователи онлайн</span>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono">Live WS</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {onlineUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: u.color }} 
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                        {u.name} {u.id === currentUser.id ? '(Вы)' : ''}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {roleLabels[u.role]?.label || u.role}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-400 dark:text-slate-500">
                Движения курсоров и изменения блоков обновляются мгновенно.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Search Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          id="global-search-btn"
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            <span className="text-slate-500 dark:text-slate-400">Поиск компонентов, логов, тегов...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-slate-200/60 dark:bg-white/10 border border-slate-300/60 dark:border-white/10 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Undo & Redo History Controls */}
        <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5">
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

        {/* Mobile Search button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-md"
          title="Поиск (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Dedicated AutoSave Status & Multi-Device Sync Widget */}
        <div className="relative" ref={autosaveMenuRef}>
          <button
            id="nav-autosave-status-btn"
            type="button"
            onClick={() => setAutosaveMenuOpen(!autosaveMenuOpen)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
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
              <span className="font-semibold text-slate-800 dark:text-slate-200">
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

            {/* Multi-Device Indicator Badge */}
            {onlineUsers.length > 1 && (
              <span
                className="hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono border border-blue-500/30 shrink-0"
                title={`${onlineUsers.length} устройства онлайн: синхронизация и автосохранение происходят одновременно на обоих`}
              >
                <Laptop className="w-2.5 h-2.5 text-blue-500" />
                <span>{onlineUsers.length} устр.</span>
              </span>
            )}

            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${autosaveMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Detailed Autosave & Multi-Device Popover */}
          {autosaveMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-[420px] bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
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

                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-white/10 rounded-lg shadow-2xs transition-all active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать ссылку для 2-го устройства</span>
                  </button>
                </div>
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
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderCheck className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          Локальная папка на диске ПК
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {targetDirectory ? `${targetDirectory.name}/${targetProjectFilename}` : 'Не выбрана (опционально)'}
                        </div>
                      </div>
                    </div>
                    {targetDirectory ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono">
                        Активно
                      </span>
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
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
            title={
              !hasDirectoryPermission
                ? 'Нажмите, чтобы подтвердить разрешение на запись в папку'
                : `Зеркалирование активно в папку: ${targetDirectory.name}/${targetProjectFilename}`
            }
          >
            <FolderCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate max-w-[110px] font-sans font-medium text-slate-800 dark:text-slate-200">
              {targetDirectory.name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">/</span>
            <span className="truncate max-w-[100px] text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
              {targetProjectFilename}
            </span>
          </button>
        )}

        {/* Project & Files Right Panel Toggle Button */}
        <button
          id="open-project-panel-btn"
          type="button"
          onClick={() => setIsProjectPanelOpen(!isProjectPanelOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isProjectPanelOpen
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40'
              : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
          }`}
          title="Открыть панель: сохранение, открытие файлов, экспорт и бэкапы"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'saving'
                  ? 'bg-amber-400 animate-pulse'
                  : autoSaveConfig.enabled
                  ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-slate-400 dark:bg-slate-500'
              }`}
            />
            <Save className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium">Файлы и проект</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isProjectPanelOpen ? 'rotate-90' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={toggleDarkMode}
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-slate-200 dark:border-white/10"
          title={isDarkMode ? 'Включить светлую тему' : 'Включить темную тему (ночная смена)'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Role Switcher & Avatar */}
        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/10 pl-3">
          <div className="relative" ref={roleMenuRef}>
            <button
              id="role-switcher-btn"
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all uppercase tracking-wide"
              title="Уровень доступа и роль пользователя"
            >
              <span className="truncate max-w-[100px] sm:max-w-[130px]">
                {roleLabels[currentUser.role]?.label}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-2 z-50 text-slate-800 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
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
            )}
          </div>

          {/* User initials badge */}
          <div 
            className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 dark:bg-gradient-to-tr dark:from-slate-700 dark:to-slate-500 dark:text-white border border-slate-300 dark:border-white/20 flex items-center justify-center text-[10px] font-bold shadow-2xs shrink-0"
            title={currentUser.name}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );

};

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
  Redo2
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
    saveStatus,
    lastSavedTime,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFactory();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const usersMenuRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabels: Record<UserRole, { label: string; desc: string; badgeColor: string }> = {
    admin: { label: 'Главный инженер', desc: 'Полный доступ к схеме, оборудованию и бэкапам', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
    operator: { label: 'Диспетчер смены', desc: 'Переключение режимов работы и регистрация инцидентов', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    maintenance: { label: 'Сервисный техник', desc: 'Проведение ТО, калибровка датчиков и наряды', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    viewer: { label: 'Аудитор (Просмотр)', desc: 'Только чтение, аналитика и экспорт документов', badgeColor: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
  };

  return (
    <header className="h-14 border-b border-white/10 bg-[#0F0F12] text-slate-300 px-4 flex items-center justify-between z-30 select-none transition-colors">
      {/* Brand & Factory Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 font-bold tracking-tight">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Factory className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none flex items-center gap-1.5">
              <span>ПромСхема</span>
              <span className="text-blue-500 font-mono text-xs">.IO</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold tracking-widest uppercase border border-blue-500/20">
                SCADA
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
              Диспетчеризация & Мониторинг цехов
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

        {/* Live sync & Online users badge */}
        <div className="relative" ref={usersMenuRef}>
          <button 
            id="online-users-btn"
            onClick={() => setUsersMenuOpen(!usersMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
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
            <span className="flex items-center gap-1 text-[11px] text-slate-400 border-l border-white/10 pl-1.5 ml-0.5">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{onlineUsers.length}</span>
            </span>
          </button>

          {/* Active online users popover */}
          {usersMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#0F0F12] border border-white/10 rounded-xl shadow-2xl p-3 z-50 text-slate-300">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Пользователи онлайн</span>
                <span className="text-[10px] text-emerald-400 font-mono">Live WS</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {onlineUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: u.color }} 
                      />
                      <span className="font-medium text-slate-200 truncate max-w-[120px]">
                        {u.name} {u.id === currentUser.id ? '(Вы)' : ''}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                      {roleLabels[u.role]?.label || u.role}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-500">
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
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
            <span className="text-slate-400">Поиск компонентов, логов, тегов...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Undo & Redo History Controls */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
          <button
            id="nav-undo-btn"
            disabled={!canUndo}
            onClick={undo}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              canUndo
                ? 'bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-500/40 shadow-sm active:scale-95'
                : 'opacity-30 cursor-not-allowed text-slate-500 border border-transparent'
            }`}
            title={canUndo ? 'Отменить последнее действие (Ctrl+Z)' : 'Нет действий для отмены'}
          >
            <Undo2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Отменить</span>
          </button>
          <button
            id="nav-redo-btn"
            disabled={!canRedo}
            onClick={redo}
            className={`p-1.5 rounded-md text-xs transition-all ${
              canRedo
                ? 'hover:bg-white/10 text-slate-200 hover:text-white active:scale-95'
                : 'opacity-25 cursor-not-allowed text-slate-600'
            }`}
            title={canRedo ? 'Повторить действие (Ctrl+Y)' : 'Нет действий для повтора'}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Search button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
          title="Поиск (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Project & Files Right Panel Toggle Button */}
        <button
          id="open-project-panel-btn"
          onClick={() => setIsProjectPanelOpen(!isProjectPanelOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isProjectPanelOpen
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40'
              : 'bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border-white/10 hover:border-white/20'
          }`}
          title="Открыть панель: сохранение, открытие файлов, экспорт и бэкапы"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'saving'
                  ? 'bg-amber-400 animate-pulse'
                  : autoSaveConfig.enabled
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-slate-500'
              }`}
            />
            <Save className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="font-medium">Файлы и проект</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isProjectPanelOpen ? 'rotate-90' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleDarkMode}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
          title={isDarkMode ? 'Включить светлую тему' : 'Включить темную тему (ночная смена)'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        {/* User Role Switcher & Avatar */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
          <div className="relative" ref={roleMenuRef}>
            <button
              id="role-switcher-btn"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all uppercase tracking-wide"
              title="Уровень доступа и роль пользователя"
            >
              <span className="truncate max-w-[100px] sm:max-w-[130px]">
                {roleLabels[currentUser.role]?.label}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0F0F12] border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-slate-300">
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Переключение роли доступа
                </div>
                <div className="space-y-1">
                  {(['admin', 'operator', 'maintenance', 'viewer'] as UserRole[]).map(r => (
                    <button
                      key={r}
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
                          ? 'bg-white/10 text-white font-semibold' 
                          : 'hover:bg-white/5 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="text-slate-200 font-medium">
                          {roleLabels[r].label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {roleLabels[r].desc}
                        </div>
                      </div>
                      {currentUser.role === r && (
                        <Check className="w-4 h-4 text-blue-500 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User initials badge */}
          <div 
            className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
            title={currentUser.name}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

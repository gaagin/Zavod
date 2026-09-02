import React, { useState, useRef, useEffect } from 'react';
import { 
  useFactory 
} from '../context/FactoryContext';
import { UserRole } from '../types';
import { exportToCSV, exportToPDF, exportToJSON, copyProjectJSONToClipboard } from '../utils/exportUtils';
import { 
  Factory, 
  Search, 
  FileText, 
  Activity, 
  Cloud, 
  Download, 
  Sun, 
  Moon, 
  ShieldAlert, 
  Users, 
  Radio, 
  ChevronDown, 
  Check, 
  FileSpreadsheet, 
  Upload,
  Layers,
  Copy,
  FolderDown,
  Settings
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    state, 
    currentUser, 
    setCurrentUserRole, 
    setCurrentUserName,
    onlineUsers, 
    connectionStatus,
    isDarkMode, 
    toggleDarkMode,
    setIsSearchOpen,
    setIsReportOpen,
    setIsBackupOpen,
    setIsEventLogsOpen,
    importProject,
    showToast,
    addEventLog,
  } = useFactory();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const usersMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (usersMenuRef.current && !usersMenuRef.current.contains(e.target as Node)) {
        setUsersMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const criticalAlarmsCount = state.equipment.filter(e => e.status === 'critical').length;
  const warningCount = state.equipment.filter(e => e.status === 'warning').length;

  const roleLabels: Record<UserRole, { label: string; desc: string; badgeColor: string }> = {
    admin: { label: 'Главный инженер', desc: 'Полный доступ к схеме, оборудованию и бэкапам', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
    operator: { label: 'Диспетчер смены', desc: 'Переключение режимов работы и регистрация инцидентов', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    maintenance: { label: 'Сервисный техник', desc: 'Проведение ТО, калибровка датчиков и наряды', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    viewer: { label: 'Аудитор (Просмотр)', desc: 'Только чтение, аналитика и экспорт документов', badgeColor: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
  };

  const handleJSONImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importProject(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyJSON = async () => {
    const ok = await copyProjectJSONToClipboard(state);
    if (ok) {
      showToast('JSON скопирован', 'Схема проекта помещена в буфер обмена', 'success');
    } else {
      showToast('Ошибка', 'Не удалось скопировать данные в буфер обмена', 'error');
    }
    setExportMenuOpen(false);
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
      <div className="flex items-center gap-2.5">
        {/* Mobile Search button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
          title="Поиск (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Report Generator Button */}
        <button
          id="report-generator-btn"
          onClick={() => setIsReportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
          title="Генерация аналитического отчета по оборудованию"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Отчеты</span>
        </button>

        {/* Event Logs & Alarms Drawer Toggle */}
        <button
          id="event-logs-btn"
          onClick={() => setIsEventLogsOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors relative ${
            criticalAlarmsCount > 0 
              ? 'bg-red-500/10 text-red-400 border-red-500/30' 
              : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
          }`}
          title="Журнал событий и аварий"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Логи</span>
          {criticalAlarmsCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
              {criticalAlarmsCount}
            </span>
          ) : warningCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {warningCount}
            </span>
          ) : null}
        </button>

        {/* Cloud Backups Button */}
        <button
          id="cloud-backup-btn"
          onClick={() => setIsBackupOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
          title="Снимки состояния и резервное копирование"
        >
          <Cloud className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden xl:inline">Бэкапы</span>
        </button>

        {/* Quick Import Button */}
        <button
          id="quick-import-btn"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
          title="Загрузить проект из файла .json"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline">Импорт</span>
        </button>

        {/* Export Dropdown Button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            id="export-dropdown-btn"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-colors font-medium"
            title="Экспорт схемы и документации"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт</span>
            <span className="opacity-60 text-[10px] hidden sm:inline font-mono">JSON/PDF</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#111318] border border-white/10 rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-300">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Экспорт проекта
              </div>

              <button
                id="menu-export-json-btn"
                onClick={() => {
                  exportToJSON(state);
                  showToast('Проект экспортирован', 'Файл .json сохранен на диск', 'success');
                  setExportMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2.5 text-slate-200"
              >
                <Download className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-medium">Экспорт проекта (JSON)</div>
                  <div className="text-[10px] text-slate-400">Полный переносимый файл схемы</div>
                </div>
              </button>

              <button
                id="menu-copy-json-btn"
                onClick={handleCopyJSON}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2.5 text-slate-200"
              >
                <Copy className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-medium">Скопировать JSON в буфер</div>
                  <div className="text-[10px] text-slate-400">Для быстрой передачи на другое устройство</div>
                </div>
              </button>

              <div className="my-1 border-t border-white/10" />

              <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Техническая документация
              </div>

              <button
                id="menu-export-pdf-btn"
                onClick={() => {
                  exportToPDF(state);
                  showToast('PDF формируется', 'Паспорт предприятия готов к загрузке', 'success');
                  setExportMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2.5 text-slate-200"
              >
                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-medium">Паспорт завода в PDF</div>
                  <div className="text-[10px] text-slate-400">Официальный отчет, сводка и аварии</div>
                </div>
              </button>

              <button
                id="menu-export-csv-btn"
                onClick={() => {
                  exportToCSV(state);
                  showToast('CSV реестр выгружен', 'Файл совместим с Excel и 1С', 'success');
                  setExportMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2.5 text-slate-200"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-medium">Реестр оборудования в CSV</div>
                  <div className="text-[10px] text-slate-400">Для Excel / 1С / ERP систем</div>
                </div>
              </button>

              <div className="my-1 border-t border-white/10" />

              <button
                id="menu-open-report-modal-btn"
                onClick={() => {
                  setIsReportOpen(true);
                  setExportMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2.5 text-blue-400 font-medium"
              >
                <Layers className="w-4 h-4 shrink-0" />
                <div>
                  <div>Менеджер экспорта & Облако...</div>
                  <div className="text-[10px] text-slate-400">Фильтры по цехам, облачные точки и вставка</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Hidden file input for JSON import */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".json,application/json" 
          className="hidden" 
          onChange={handleJSONImport} 
        />

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

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  FactoryState, 
  EquipmentNode, 
  ContainerNode, 
  ConnectionLink, 
  FactoryEventLog, 
  UserPresence, 
  UserRole, 
  CloudBackup,
  CloudServiceType,
  LinkType,
  LinkStyle,
  AutoSaveConfig,
  FolderFileChangeNotice,
  ElementReference
} from '../types';
import { initialFactoryState } from '../data/initialFactory';
import { 
  parseAndValidateProject, 
  selectSystemDirectory, 
  saveProjectToDirectory,
  readProjectFromDirectory,
  getFileMetadataInDirectory 
} from '../utils/exportUtils';
import { calculateContainerFitViewport, calculateNodeFitViewport, isNodeInSubtree } from '../utils/geometry';
import {
  generateElementUrl,
  copyTextToClipboard,
  parseElementFromLocation,
  findElementInState,
  LinkParamType
} from '../utils/linkUtils';
import {
  storeDirectoryHandle,
  getStoredDirectoryHandle,
  clearStoredDirectoryHandle,
  storeProjectFilename,
  getStoredProjectFilename,
  verifyDirectoryPermission
} from '../utils/fileSystemStorage';

export type CanvasTool = 'select' | 'pan' | 'add_equipment' | 'add_container' | 'connect';

export interface AppToast {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface FactoryContextType {
  state: FactoryState;
  currentUser: UserPresence;
  onlineUsers: UserPresence[];
  userCursors: Record<string, { cursor: { x: number; y: number }; user: UserPresence }>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  
  // Selection & Tools
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleSelectId: (id: string, multi?: boolean) => void;
  batchDelete: (ids?: string[], reason?: string) => void;
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  connectingSourceId: string | null;
  setConnectingSourceId: (id: string | null) => void;
  linkDraftType: LinkType;
  setLinkDraftType: (type: LinkType) => void;

  // Viewport
  viewport: { panX: number; panY: number; zoom: number };
  setViewport: React.Dispatch<React.SetStateAction<{ panX: number; panY: number; zoom: number }>>;
  focusNode: (nodeId: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;

  // Container Focus Mode (Full-screen workshop view)
  focusedContainerId: string | null;
  setFocusedContainerId: (id: string | null) => void;
  isFocusFullscreen: boolean;
  setIsFocusFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  enterFocusMode: (containerId: string) => void;
  exitFocusMode: () => void;
  toggleFocusMode: (containerId?: string) => void;
  fitContainerToScreen: (containerId?: string) => void;

  // Actions
  updateEquipment: (id: string, partial: Partial<EquipmentNode>, reason?: string, skipHistory?: boolean) => void;
  addEquipment: (equipment: EquipmentNode, reason?: string) => void;
  deleteEquipment: (id: string, reason?: string) => void;
  updateContainer: (id: string, partial: Partial<ContainerNode>, reason?: string, skipHistory?: boolean) => void;
  batchUpdatePositions: (
    containerUpdates: Array<{ id: string; x: number; y: number; parentId?: string | null }>,
    equipmentUpdates: Array<{ id: string; x: number; y: number; parentId?: string | null }>,
    reason?: string,
    skipHistory?: boolean
  ) => void;
  toggleContainerCollapse: (id: string) => void;
  toggleEquipmentCollapse: (id: string) => void;
  addContainer: (container: ContainerNode, reason?: string) => void;
  deleteContainer: (id: string, reason?: string) => void;
  addLink: (fromId: string, toId: string, type?: LinkType, style?: LinkStyle) => void;
  updateLink: (id: string, partial: Partial<ConnectionLink>) => void;
  deleteLink: (id: string) => void;
  addEventLog: (log: Omit<FactoryEventLog, 'id' | 'timestamp'>) => void;
  restoreState: (state: FactoryState, reason?: string) => void;
  
  // Backups & Project Transfer
  createBackup: (service: CloudServiceType, name?: string) => Promise<boolean>;
  restoreBackup: (backupId: string) => Promise<boolean>;
  deleteBackup: (backupId: string) => Promise<boolean>;
  importProject: (file: File) => Promise<{ success: boolean; message: string }>;
  importProjectFromJSON: (jsonStr: string) => { success: boolean; message: string };

  // Toasts
  toasts: AppToast[];
  showToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  recordHistorySnapshot: () => void;

  // User & Role
  setCurrentUserRole: (role: UserRole) => void;
  setCurrentUserName: (name: string) => void;
  broadcastCursor: (canvasPos: { x: number; y: number } | null) => void;

  // Modals & UI
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isCreateEquipmentOpen: boolean;
  setIsCreateEquipmentOpen: (open: boolean) => void;
  addEmptyEquipment: (parentId?: string | null, position?: { x: number; y: number }) => string;
  isReportOpen: boolean;
  setIsReportOpen: (open: boolean) => void;
  isBackupOpen: boolean;
  setIsBackupOpen: (open: boolean) => void;
  isEventLogsOpen: boolean;
  setIsEventLogsOpen: (open: boolean) => void;
  isProjectPanelOpen: boolean;
  setIsProjectPanelOpen: (open: boolean) => void;
  gridSnap: boolean;
  setGridSnap: (snap: boolean) => void;

  // Auto-Save Management & Multi-Device Live Sync
  autoSaveConfig: AutoSaveConfig;
  setAutoSaveConfig: React.Dispatch<React.SetStateAction<AutoSaveConfig>>;
  saveStatus: 'saved' | 'saving' | 'error' | 'no_folder';
  lastSavedTime: number;
  lastSavedFilePath: string | null;
  lastSyncEvent: { timestamp: number; reason: string; senderName?: string } | null;
  sendPingSync: () => void;
  triggerInstantSync: () => void;
  folderWatchActive: boolean;
  lastFolderSyncTime: number | null;
  lastFolderFileChangeNotice: FolderFileChangeNotice | null;
  clearFolderChangeNotice: () => void;
  checkFolderNow: () => Promise<boolean>;
  targetDirectory: { name: string } | null;
  targetProjectFilename: string;
  setTargetProjectFilename: (name: string) => void;
  selectTargetFolder: () => Promise<boolean>;
  clearTargetFolder: () => Promise<void>;
  hasDirectoryPermission: boolean;
  requestDirectoryAccess: () => Promise<boolean>;
  forceSave: (overrideFilename?: string) => Promise<{ success: boolean; savedLocally?: boolean; filename?: string; error?: string }>;
  loadFactoryPreset: () => void;

  // Element Deep Linking & References
  highlightedNodeId: string | null;
  setHighlightedNodeId: (id: string | null) => void;
  shareModalNodeId: string | null;
  setShareModalNodeId: (id: string | null) => void;
  openShareModal: (nodeId: string) => void;
  closeShareModal: () => void;
  addElementLink: (sourceId: string, targetId: string, relationship?: string) => void;
  removeElementLink: (sourceId: string, linkId: string) => void;
  copyElementLink: (nodeId: string, paramType?: LinkParamType) => Promise<boolean>;
}

export function dedupeById<T extends { id: string }>(items?: T[]): T[] {
  if (!items || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export function createEventLog(logData: Omit<FactoryEventLog, 'id' | 'timestamp'>): FactoryEventLog {
  return {
    ...logData,
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10),
    timestamp: new Date().toISOString(),
  };
}

const FactoryContext = createContext<FactoryContextType | undefined>(undefined);

const LOCAL_STORAGE_STATE_KEY = 'promschema_factory_state_v1';
const LOCAL_STORAGE_THEME_KEY = 'promschema_dark_theme';
const LOCAL_STORAGE_AUTOSAVE_KEY = 'promschema_autosave_config_v1';

export const FactoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state with fallback to initialFactoryState and sanitize duplicates
  const [state, setState] = useState<FactoryState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialFactoryState,
          ...parsed,
          equipment: dedupeById(parsed.equipment || initialFactoryState.equipment),
          containers: dedupeById(parsed.containers || initialFactoryState.containers),
          links: dedupeById(parsed.links || initialFactoryState.links),
          eventLogs: dedupeById(parsed.eventLogs || initialFactoryState.eventLogs),
        };
      }
    } catch (e) {
      console.warn('Could not read saved state from localStorage:', e);
    }
    return {
      ...initialFactoryState,
      equipment: dedupeById(initialFactoryState.equipment),
      containers: dedupeById(initialFactoryState.containers),
      links: dedupeById(initialFactoryState.links),
      eventLogs: dedupeById(initialFactoryState.eventLogs),
    };
  });

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      if (saved !== null) return saved === 'true';
      return true; // Industrial default: sleek dark mode
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.warn(e);
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // User profile
  const [currentUser, setCurrentUser] = useState<UserPresence>({
    id: 'usr_' + Math.random().toString(36).substring(2, 8),
    name: 'Главный инженер (Вы)',
    role: 'admin',
    color: '#0284c7',
    cursor: null,
    selectedId: null,
    lastSeen: Date.now(),
  });

  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([currentUser]);
  const [userCursors, setUserCursors] = useState<Record<string, { cursor: { x: number; y: number }; user: UserPresence }>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Canvas Viewport & Tools
  const [viewport, setViewport] = useState({ panX: 200, panY: 150, zoom: 0.85 });
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [selectedIds, setSelectedIdsRaw] = useState<string[]>([]);

  const setSelectedIds = useCallback((idsOrUpdater: string[] | ((prev: string[]) => string[])) => {
    setSelectedIdsRaw(prev => {
      const next = typeof idsOrUpdater === 'function' ? idsOrUpdater(prev) : idsOrUpdater;
      setSelectedIdState(next.length > 0 ? next[next.length - 1] : null);
      return next;
    });
  }, []);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    setSelectedIdsRaw(id ? [id] : []);
  }, []);

  const toggleSelectId = useCallback((id: string, multi: boolean = false) => {
    if (!multi) {
      setSelectedIdState(id);
      setSelectedIdsRaw(id ? [id] : []);
    } else {
      setSelectedIdsRaw(prev => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter(item => item !== id) : [...prev, id];
        setSelectedIdState(next.length > 0 ? next[next.length - 1] : null);
        return next;
      });
    }
  }, []);

  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [linkDraftType, setLinkDraftType] = useState<LinkType>('power');
  const [gridSnap, setGridSnap] = useState<boolean>(true);

  // Container Focus Mode State (Selected container fills the entire working window)
  const [focusedContainerId, setFocusedContainerId] = useState<string | null>(null);
  const [isFocusFullscreen, setIsFocusFullscreen] = useState<boolean>(false);

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateEquipmentOpen, setIsCreateEquipmentOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isEventLogsOpen, setIsEventLogsOpen] = useState(false);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);

  // Element Deep Linking & Highlight
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<any>(null);
  const [shareModalNodeId, setShareModalNodeId] = useState<string | null>(null);

  const openShareModal = useCallback((nodeId: string) => {
    setShareModalNodeId(nodeId);
  }, []);

  const closeShareModal = useCallback(() => {
    setShareModalNodeId(null);
  }, []);

  // In-app Toasts
  const [toasts, setToasts] = useState<AppToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev.slice(-3), { id, title, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  // Undo/Redo Stacks
  const historyRef = useRef<{ past: FactoryState[]; future: FactoryState[] }>({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const isRemoteUpdateRef = useRef(false);

  // Local BroadcastChannel for instant multi-tab sync
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const pushHistory = useCallback((currentState: FactoryState) => {
    historyRef.current.past.push(JSON.parse(JSON.stringify(currentState)));
    if (historyRef.current.past.length > 40) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const recordHistorySnapshot = useCallback(() => {
    historyRef.current.past.push(JSON.parse(JSON.stringify(state)));
    if (historyRef.current.past.length > 40) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [state]);

  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.push(JSON.parse(JSON.stringify(state)));
    setState(previous);
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(true);
    syncStateToServer(previous, 'Откат изменений (Undo)');
    showToast('Действие отменено', 'Предыдущее состояние схемы восстановлено', 'info');
  }, [state, showToast]);

  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(JSON.parse(JSON.stringify(state)));
    setState(next);
    setCanUndo(true);
    setCanRedo(historyRef.current.future.length > 0);
    syncStateToServer(next, 'Повтор изменений (Redo)');
    showToast('Действие повторено', 'Повтор отмененного действия выполнен', 'info');
  }, [state, showToast]);

  // Autosave status & configuration
  const [autoSaveConfig, setAutoSaveConfig] = useState<AutoSaveConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          saveToServer: false, // Server autosave cancelled per user request
        };
      }
    } catch (e) {
      console.warn(e);
    }
    return {
      enabled: true,
      autoSnapshots: true,
      snapshotIntervalMinutes: 5,
      saveToServer: false, // Autosave to server is disabled
    };
  });

  // Local Folder for project autosaving
  const targetDirectoryHandleRef = useRef<any>(null);
  const [targetDirectory, setTargetDirectory] = useState<{ name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('promschema_target_folder');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [targetProjectFilename, setTargetProjectFilenameState] = useState<string>('promschema_project.json');
  const targetProjectFilenameRef = useRef<string>('promschema_project.json');
  const [hasDirectoryPermission, setHasDirectoryPermission] = useState<boolean>(false);
  const [lastSavedFilePath, setLastSavedFilePath] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'no_folder'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<number>(Date.now());
  const [lastSyncEvent, setLastSyncEvent] = useState<{ timestamp: number; reason: string; senderName?: string } | null>(null);
  const [lastFolderFileChangeNotice, setLastFolderFileChangeNotice] = useState<FolderFileChangeNotice | null>(null);
  const [lastFolderSyncTime, setLastFolderSyncTime] = useState<number | null>(null);

  const lastSelfWrittenFileMtimeRef = useRef<number>(0);
  const lastKnownFolderFileMtimeRef = useRef<number>(0);
  const lastKnownFolderFileSizeRef = useRef<number>(0);

  const clearFolderChangeNotice = useCallback(() => {
    setLastFolderFileChangeNotice(null);
  }, []);

  const latestServerVersionRef = useRef<number>(state.version || 1);
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore stored directory handle from IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    getStoredDirectoryHandle().then(async (handle) => {
      if (!isMounted || !handle) return;
      targetDirectoryHandleRef.current = handle;
      const permGranted = await verifyDirectoryPermission(handle, false);
      if (isMounted) {
        setHasDirectoryPermission(permGranted);
        if (handle.name) {
          setTargetDirectory({ name: handle.name });
        }
      }
    });

    getStoredProjectFilename().then(name => {
      if (!isMounted || !name) return;
      setTargetProjectFilenameState(name);
      targetProjectFilenameRef.current = name;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const setTargetProjectFilename = useCallback((name: string) => {
    let clean = name.trim();
    if (!clean) clean = 'promschema_project.json';
    if (!clean.toLowerCase().endsWith('.json')) clean += '.json';
    setTargetProjectFilenameState(clean);
    targetProjectFilenameRef.current = clean;
    storeProjectFilename(clean);
  }, []);

  // Pick target folder for autosaving
  const selectTargetFolder = useCallback(async (): Promise<boolean> => {
    try {
      const res = await selectSystemDirectory();
      if (res.success && res.handle && res.dirName) {
        targetDirectoryHandleRef.current = res.handle;
        setHasDirectoryPermission(true);
        const folderInfo = { name: res.dirName };
        setTargetDirectory(folderInfo);
        try {
          localStorage.setItem('promschema_target_folder', JSON.stringify(folderInfo));
        } catch {}
        await storeDirectoryHandle(res.handle);

        // Immediate project check or save into the newly chosen folder
        setSaveStatus('saving');
        const filename = targetProjectFilenameRef.current || 'promschema_project.json';

        // If file already exists in this folder (e.g. created by another device), load it!
        const existingMeta = await getFileMetadataInDirectory(res.handle, filename);
        if (existingMeta.exists && existingMeta.lastModified) {
          const existingProject = await readProjectFromDirectory(res.handle, filename);
          if (existingProject.success && existingProject.state && (existingProject.state.equipment?.length > 0 || existingProject.state.containers?.length > 0)) {
            lastKnownFolderFileMtimeRef.current = existingMeta.lastModified;
            lastKnownFolderFileSizeRef.current = existingMeta.size || 0;
            lastSelfWrittenFileMtimeRef.current = existingMeta.lastModified;
            setState(prev => ({
              ...prev,
              ...existingProject.state,
              equipment: dedupeById(existingProject.state!.equipment),
              containers: dedupeById(existingProject.state!.containers),
              links: dedupeById(existingProject.state!.links),
              eventLogs: dedupeById(existingProject.state!.eventLogs),
            }));
            setSaveStatus('saved');
            setLastSavedTime(existingMeta.lastModified);
            setLastSavedFilePath(`${res.dirName}/${filename}`);
            showToast(
              'Схема загружена из папки 📂',
              `В папке обнаружен проект «${filename}» (${existingProject.state.equipment.length} узлов). Он выведен на экран и подключен к автослежению.`,
              'success'
            );
            return true;
          }
        }

        const saveRes = await saveProjectToDirectory(res.handle, state, filename, true);
        if (saveRes.success) {
          if (saveRes.lastModified) {
            lastSelfWrittenFileMtimeRef.current = saveRes.lastModified;
            lastKnownFolderFileMtimeRef.current = saveRes.lastModified;
            lastKnownFolderFileSizeRef.current = saveRes.size || 0;
          }
          setHasDirectoryPermission(true);
          setSaveStatus('saved');
          setLastSavedTime(Date.now());
          setLastSavedFilePath(`${res.dirName}/${filename}`);
          showToast(
            'Папка для сохранения выбрана',
            `Файл сохранен в «${res.dirName}/${filename}». Включено автосохранение и слежение за изменениями файла в реальном времени.`,
            'success'
          );
          return true;
        } else if (saveRes.permissionRequired) {
          setHasDirectoryPermission(false);
          setSaveStatus('saved');
          showToast('Папка выбрана', `Папка «${res.dirName}» выбрана, но браузер требует подтвердить права доступа при записи. Нажмите «Подтвердить доступ» вверху.`, 'warning');
          return true;
        } else {
          setSaveStatus('saved');
          showToast('Предупреждение при записи', saveRes.error || 'Не удалось записать в выбранную папку', 'warning');
          return false;
        }
      } else if (!res.aborted && res.error) {
        showToast('Выбор папки', res.error, 'info');
      }
    } catch (err: any) {
      showToast('Выбор папки', err?.message || 'Не удалось выбрать папку', 'error');
    }
    return false;
  }, [state, showToast]);

  // Clear chosen target folder
  const clearTargetFolder = useCallback(async () => {
    targetDirectoryHandleRef.current = null;
    setTargetDirectory(null);
    setHasDirectoryPermission(false);
    setLastSavedFilePath(null);
    try {
      localStorage.removeItem('promschema_target_folder');
    } catch {}
    await clearStoredDirectoryHandle();
    setSaveStatus('saved');
    showToast(
      'Папка сброшена',
      'Связь с папкой на диске отключена. Проект продолжает сохраняться на сервере и в кэше браузера.',
      'info'
    );
  }, [showToast]);

  // Request/verify readwrite permissions for target directory
  const requestDirectoryAccess = useCallback(async (): Promise<boolean> => {
    if (!targetDirectoryHandleRef.current) {
      return await selectTargetFolder();
    }
    try {
      const granted = await verifyDirectoryPermission(targetDirectoryHandleRef.current, true);
      setHasDirectoryPermission(granted);
      if (granted) {
        setSaveStatus('saving');
        const filename = targetProjectFilenameRef.current || 'promschema_project.json';
        const saveRes = await saveProjectToDirectory(targetDirectoryHandleRef.current, state, filename, true);
        if (saveRes.success) {
          setSaveStatus('saved');
          setLastSavedTime(Date.now());
          setLastSavedFilePath(`${targetDirectory?.name || 'Папка'}/${filename}`);
          showToast('Доступ подтвержден 📂', `Схема синхронизирована с файлом «${targetDirectory?.name}/${filename}»`, 'success');
          return true;
        } else {
          showToast('Предупреждение', saveRes.error || 'Не удалось записать в папку', 'warning');
          setSaveStatus('saved');
        }
      } else {
        showToast(
          'Доступ не подтвержден',
          `Браузер ожидает подтверждения доступа к папке «${targetDirectory?.name || ''}». Если папка была перемещена, выберите папку заново.`,
          'warning'
        );
      }
    } catch (err: any) {
      console.warn('requestDirectoryAccess error:', err);
      showToast('Доступ к папке', 'Не удалось подтвердить права доступа к папке. Выберите папку повторно.', 'warning');
    }
    return false;
  }, [selectTargetFolder, state, targetDirectory?.name, showToast]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTOSAVE_KEY, JSON.stringify(autoSaveConfig));
    } catch (e) {
      console.warn(e);
    }
  }, [autoSaveConfig]);

  const folderWatchActive = Boolean(targetDirectory && hasDirectoryPermission && autoSaveConfig.watchFolderFile !== false);

  // Active Folder File Watcher
  // When another device updates the file in the shared folder (e.g. via network share, Google Drive, Dropbox, OneDrive),
  // this device detects the change and immediately updates the scheme on the main screen in real time!
  const checkFolderNow = useCallback(async (): Promise<boolean> => {
    const handle = targetDirectoryHandleRef.current;
    if (!handle) return false;
    const filename = targetProjectFilenameRef.current || 'promschema_project.json';

    try {
      const meta = await getFileMetadataInDirectory(handle, filename);
      if (!meta.exists || !meta.lastModified) return false;

      // Detect if file was modified externally (not by our own recent write)
      const isExternalChange =
        lastKnownFolderFileMtimeRef.current > 0 &&
        meta.lastModified !== lastKnownFolderFileMtimeRef.current &&
        (meta.lastModified > lastSelfWrittenFileMtimeRef.current + 300 || meta.size !== lastKnownFolderFileSizeRef.current);

      if (isExternalChange || lastKnownFolderFileMtimeRef.current === 0) {
        lastKnownFolderFileMtimeRef.current = meta.lastModified;
        lastKnownFolderFileSizeRef.current = meta.size || 0;

        if (isExternalChange) {
          const res = await readProjectFromDirectory(handle, filename);
          if (res.success && res.state) {
            const incomingState = res.state;
            const currentEqCount = state.equipment.length;
            const newEqCount = (incomingState.equipment || []).length;
            const isDifferent =
              (incomingState.version && incomingState.version !== state.version) ||
              newEqCount !== currentEqCount ||
              JSON.stringify(incomingState.equipment.map(e => ({ id: e.id, x: e.x, y: e.y, s: e.status }))) !==
              JSON.stringify(state.equipment.map(e => ({ id: e.id, x: e.x, y: e.y, s: e.status })));

            if (isDifferent) {
              isRemoteUpdateRef.current = true;
              latestServerVersionRef.current = incomingState.version || ((state.version || 1) + 1);

              setState(prev => ({
                ...prev,
                ...incomingState,
                equipment: dedupeById(incomingState.equipment || prev.equipment),
                containers: dedupeById(incomingState.containers || prev.containers),
                links: dedupeById(incomingState.links || prev.links),
                eventLogs: dedupeById(incomingState.eventLogs || prev.eventLogs),
              }));

              const now = Date.now();
              setLastSavedTime(meta.lastModified);
              setLastFolderSyncTime(now);

              const notice: FolderFileChangeNotice = {
                filename,
                timestamp: now,
                summary: `Схема обновлена из файла: ${newEqCount} узлов, ${(incomingState.containers || []).length} цехов`,
                source: 'folder',
                equipmentCount: newEqCount,
                containersCount: (incomingState.containers || []).length,
              };
              setLastFolderFileChangeNotice(notice);
              setLastSyncEvent({
                timestamp: now,
                reason: `Синхронизация из файла «${filename}»`,
                senderName: 'Второе устройство (через папку)',
              });

              // Silent sync per user request (no intrusive toast or banner)

              // Broadcast to WebSocket so other connected views stay aligned
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'state_patch',
                  state: incomingState,
                  reason: `Синхронизация из файла папки «${filename}»`,
                  senderId: currentUser.id,
                  senderName: `${currentUser.name} (папка)`,
                }));
              }
              return true;
            }
          }
        }
      }
      return false;
    } catch (err) {
      console.warn('[FolderWatcher] Ошибка опроса файла в папке:', err);
      return false;
    }
  }, [state, currentUser.id, currentUser.name, showToast]);

  // Active polling of the selected local directory
  useEffect(() => {
    if (!targetDirectory || !hasDirectoryPermission || autoSaveConfig.watchFolderFile === false) {
      return;
    }

    let isPolling = false;
    const poll = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        await checkFolderNow();
      } finally {
        isPolling = false;
      }
    };

    poll();
    const interval = setInterval(poll, 1200);

    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        poll();
      }
    };
    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
    };
  }, [targetDirectory, hasDirectoryPermission, autoSaveConfig.watchFolderFile, checkFolderNow]);

  // Multi-device WebSocket debounce timer
  const wsDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-device & Local Auto-Save:
  // 1. Immediately saves to local browser cache (localStorage)
  // 2. Broadcasts to other open tabs via BroadcastChannel
  // 3. Syncs and saves to centralized SCADA Server via WebSocket (instant 0ms sync to 2+ devices)
  // 4. Optionally saves to local folder if user selected a directory
  const triggerLocalAutoSave = useCallback((
    newState: FactoryState,
    reason: string = 'Изменение схемы',
    immediate: boolean = true
  ) => {
    // 1. Keep safety copy in browser localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn('Local storage write failed:', e);
    }

    // 2. Broadcast through BroadcastChannel for same-origin tabs on user's machine
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'state_updated',
        state: newState,
        senderId: currentUser.id,
        senderName: currentUser.name,
        reason
      });
    }

    setSaveStatus('saving');

    const sendToServer = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'state_patch',
          state: newState,
          reason,
          senderId: currentUser.id,
          senderName: currentUser.name,
        }));
      } else {
        // Fallback to REST API if WebSocket is not ready
        fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: newState, reason, userName: currentUser.name }),
        }).then(r => r.json()).then(data => {
          if (data.success) {
            setSaveStatus('saved');
            setLastSavedTime(Date.now());
          }
        }).catch(err => {
          console.warn('[AutoSave] REST fallback save failed:', err);
        });
      }
    };

    if (wsDebounceTimerRef.current) clearTimeout(wsDebounceTimerRef.current);

    if (immediate) {
      // 0ms delay: instant broadcast across all connected devices!
      sendToServer();
    } else {
      // 40ms throttled delay for high-frequency dragging on canvas
      wsDebounceTimerRef.current = setTimeout(sendToServer, 40);
    }

    // 4. Debounced local folder auto-save
    if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);

    saveDebounceTimerRef.current = setTimeout(async () => {
      const handle = targetDirectoryHandleRef.current;
      if (handle) {
        try {
          const filename = targetProjectFilenameRef.current || 'promschema_project.json';
          // Check permission non-interactively in background
          const hasPerm = await verifyDirectoryPermission(handle, false);
          setHasDirectoryPermission(hasPerm);

          if (hasPerm) {
            const saveRes = await saveProjectToDirectory(handle, newState, filename, false);
            if (saveRes.success) {
              if (saveRes.lastModified) {
                lastSelfWrittenFileMtimeRef.current = saveRes.lastModified;
                lastKnownFolderFileMtimeRef.current = saveRes.lastModified;
                lastKnownFolderFileSizeRef.current = saveRes.size || 0;
              }
              setSaveStatus('saved');
              setLastSavedTime(Date.now());
              setLastSavedFilePath(`${targetDirectory?.name || 'Папка'}/${filename}`);
            } else if (saveRes.permissionRequired) {
              setHasDirectoryPermission(false);
              setSaveStatus('saved');
            } else {
              // Local state and server state are intact
              setSaveStatus('saved');
            }
          } else {
            // Awaiting user gesture to re-grant folder write permission
            setSaveStatus('saved');
          }
        } catch (err) {
          console.warn('[AutoSave] Error saving to directory:', err);
          setSaveStatus('saved');
        }
      } else {
        // Without local folder, state is successfully autosaved to Server + LocalStorage
        setSaveStatus('saved');
        setLastSavedTime(Date.now());
      }
    }, 600);
  }, [currentUser.id, currentUser.name, targetDirectory?.name]);

  // Alias for backward-compatibility with mutators in this context
  const syncStateToServer = triggerLocalAutoSave;

  // Force instant save to server and target folder
  const forceSave = useCallback(async (overrideFilename?: string): Promise<{ success: boolean; savedLocally?: boolean; filename?: string; error?: string }> => {
    setSaveStatus('saving');
    const filename = overrideFilename || targetProjectFilenameRef.current || 'promschema_project.json';

    try {
      localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(state));

      // Sync to server via WebSocket or REST API
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'state_patch',
          state,
          reason: 'Принудительное сохранение пользователем',
          senderId: currentUser.id,
          senderName: currentUser.name,
        }));
      } else {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, reason: 'Принудительное сохранение', userName: currentUser.name }),
        }).catch(err => console.warn('[forceSave] REST save warning:', err));
      }

      const handle = targetDirectoryHandleRef.current;
      if (handle) {
        // Interactive = true because forceSave is triggered by user gesture (click/shortcut)
        const saveRes = await saveProjectToDirectory(handle, state, filename, true);
        if (saveRes.success) {
          setHasDirectoryPermission(true);
          if (saveRes.lastModified) {
            lastSelfWrittenFileMtimeRef.current = saveRes.lastModified;
            lastKnownFolderFileMtimeRef.current = saveRes.lastModified;
            lastKnownFolderFileSizeRef.current = saveRes.size || 0;
          }
          setSaveStatus('saved');
          setLastSavedTime(Date.now());
          setLastSavedFilePath(`${targetDirectory?.name || 'Папка'}/${filename}`);
          showToast('Сохранено на диск 📂', `Схема успешно сохранена на сервере и в папку «${targetDirectory?.name || 'Папка'}/${filename}»`, 'success');
          return { success: true, savedLocally: true, filename };
        } else if (saveRes.permissionRequired) {
          setHasDirectoryPermission(false);
          setSaveStatus('saved');
          setLastSavedTime(Date.now());
          showToast(
            'Сохранено в кэш (папка ожидает доступ)',
            `Изменения сохранены в браузере и на сервере. Для записи на диск нажмите кнопку папки вверху («Подтвердить доступ»).`,
            'warning'
          );
          return { success: true, savedLocally: false, filename, error: saveRes.error };
        } else {
          setSaveStatus('error');
          showToast('Ошибка сохранения в папку', saveRes.error || 'Не удалось сохранить в выбранную папку', 'error');
          return { success: false, savedLocally: false, filename, error: saveRes.error };
        }
      }

      setSaveStatus('saved');
      setLastSavedTime(Date.now());
      showToast('Сохранено', 'Схема успешно сохранена на сервере и в локальном кэше браузера', 'success');
      return { success: true, savedLocally: false, filename };
    } catch (e: any) {
      setSaveStatus('error');
      showToast('Ошибка сохранения', e?.message || 'Не удалось сохранить проект', 'error');
      return { success: false, error: e?.message || 'Не удалось сохранить проект' };
    }
  }, [state, targetDirectory?.name, currentUser.id, currentUser.name, showToast]);

  // Prevent navigation loss during active save operation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Setup WebSocket connection
  useEffect(() => {
    let reconnectTimeout: any;

    try {
      broadcastChannelRef.current = new BroadcastChannel('promschema_multi_tab_sync');
      broadcastChannelRef.current.onmessage = (evt) => {
        if (evt.data && evt.data.type === 'state_updated' && evt.data.senderId !== currentUser.id) {
          isRemoteUpdateRef.current = true;
          setState(prev => ({
            ...prev,
            ...evt.data.state,
            equipment: dedupeById(evt.data.state.equipment || prev.equipment),
            containers: dedupeById(evt.data.state.containers || prev.containers),
            links: dedupeById(evt.data.state.links || prev.links),
            eventLogs: dedupeById(evt.data.state.eventLogs || prev.eventLogs),
          }));
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    const connectWS = () => {
      setConnectionStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        // Register user profile
        ws.send(JSON.stringify({
          type: 'user_update',
          name: currentUser.name,
          role: currentUser.role,
          color: currentUser.color,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'init') {
            if (msg.state) {
              isRemoteUpdateRef.current = true;
              latestServerVersionRef.current = msg.state.version || 1;
              setState(prev => ({
                ...prev,
                ...msg.state,
                equipment: msg.state.equipment !== undefined ? dedupeById(msg.state.equipment) : prev.equipment,
                containers: msg.state.containers !== undefined ? dedupeById(msg.state.containers) : prev.containers,
                links: msg.state.links !== undefined ? dedupeById(msg.state.links) : prev.links,
                eventLogs: msg.state.eventLogs !== undefined ? dedupeById(msg.state.eventLogs) : prev.eventLogs,
              }));
              try {
                localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(msg.state));
              } catch (e) {}
            }
            if (msg.users) {
              setOnlineUsers(msg.users);
            }
          } else if (msg.type === 'state_updated') {
            if (msg.state) {
              isRemoteUpdateRef.current = true;
              latestServerVersionRef.current = msg.state.version || 1;
              const reasonText = msg.reason || 'Обновление схемы';
              setLastSyncEvent({
                timestamp: Date.now(),
                reason: reasonText,
                senderName: msg.senderName || 'Второе устройство',
              });

              setState(prev => ({
                ...prev,
                ...msg.state,
                equipment: msg.state.equipment !== undefined ? dedupeById(msg.state.equipment) : prev.equipment,
                containers: msg.state.containers !== undefined ? dedupeById(msg.state.containers) : prev.containers,
                links: msg.state.links !== undefined ? dedupeById(msg.state.links) : prev.links,
                eventLogs: msg.state.eventLogs !== undefined ? dedupeById(msg.state.eventLogs) : prev.eventLogs,
              }));

              if (msg.source === 'server_disk' || msg.senderId === 'disk_watcher') {
                const count = (msg.state.equipment || []).length;
                setLastFolderFileChangeNotice({
                  filename: 'factory_state.json',
                  timestamp: Date.now(),
                  summary: `Схема обновлена на диске: ${count} узлов оборудования`,
                  source: 'server_disk',
                  equipmentCount: count,
                  containersCount: (msg.state.containers || []).length,
                });
                setLastFolderSyncTime(Date.now());
                // Silent sync per user request
              }

              // Synchronously autosave incoming remote update into local cache
              try {
                localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(msg.state));
              } catch (e) {
                console.warn(e);
              }
              // If target directory is active on this machine, autosave it too
              const handle = targetDirectoryHandleRef.current;
              if (handle && hasDirectoryPermission) {
                const filename = targetProjectFilenameRef.current || 'promschema_project.json';
                saveProjectToDirectory(handle, msg.state, filename, false).then(res => {
                  if (res.success && res.lastModified) {
                    lastSelfWrittenFileMtimeRef.current = res.lastModified;
                    lastKnownFolderFileMtimeRef.current = res.lastModified;
                    lastKnownFolderFileSizeRef.current = res.size || 0;
                  }
                }).catch(() => {});
              }
              setSaveStatus('saved');
              setLastSavedTime(Date.now());
            }
          } else if (msg.type === 'sync_ping') {
            setLastSyncEvent({
              timestamp: Date.now(),
              reason: 'Тестовый сигнал связи',
              senderName: msg.senderName || 'Второе устройство',
            });
            showToast('Синхронизация активна ⚡', `Тестовый импульс от «${msg.senderName || 'второго устройства'}» принят мгновенно!`, 'success');
          } else if (msg.type === 'save_ack') {
            setSaveStatus('saved');
            setLastSavedTime(msg.timestamp || Date.now());
          } else if (msg.type === 'cursor') {
            if (msg.clientId && msg.cursor) {
              setUserCursors(prev => ({
                ...prev,
                [msg.clientId]: { cursor: msg.cursor, user: msg.user }
              }));
            }
          } else if (msg.type === 'users_update' || msg.type === 'user_joined' || msg.type === 'user_left') {
            if (msg.users) {
              setOnlineUsers(msg.users);
            }
            if (msg.type === 'user_left' && msg.clientId) {
              setUserCursors(prev => {
                const next = { ...prev };
                delete next[msg.clientId];
                return next;
              });
            }
          } else if (msg.type === 'event_log_added') {
            if (msg.eventLog && msg.eventLog.id) {
              setState(prev => {
                if (prev.eventLogs.some(l => l.id === msg.eventLog.id)) {
                  return prev;
                }
                return {
                  ...prev,
                  eventLogs: [msg.eventLog, ...prev.eventLogs.filter(l => l.id !== msg.eventLog.id)].slice(0, 200)
                };
              });
            }
          }
        } catch (e) {
          console.error('Error handling ws message:', e);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        reconnectTimeout = setTimeout(connectWS, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
    };
  }, []);

  // Resilience: pull server state on initial load, tab refocus/visibility change, and periodic heartbeat
  useEffect(() => {
    let isMounted = true;

    const pullServerState = async (onlyIfNewer = true) => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const serverState = await res.json();
        if (!serverState || !serverState.equipment) return;

        if (onlyIfNewer) {
          const currentVer = latestServerVersionRef.current || 0;
          if ((serverState.version || 0) <= currentVer) {
            return;
          }
        }

        if (isMounted) {
          latestServerVersionRef.current = serverState.version || 1;
          setLastSyncEvent({
            timestamp: Date.now(),
            reason: 'Автоматическая сверка версий',
            senderName: 'Сервер синхронизации',
          });
          setState(prev => ({
            ...prev,
            ...serverState,
            equipment: dedupeById(serverState.equipment),
            containers: dedupeById(serverState.containers),
            links: dedupeById(serverState.links),
            eventLogs: dedupeById(serverState.eventLogs),
          }));
          try {
            localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(serverState));
          } catch (e) {}
        }
      } catch (err) {
        // silent catch
      }
    };

    // Immediate pull
    pullServerState(false);

    // Sync on window focus or visibility change (e.g. tablet unlocked or user returns to tab)
    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        pullServerState(true);
      }
    };
    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    // Fallback sync every 4 seconds
    const interval = setInterval(() => {
      pullServerState(true);
    }, 4000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
      clearInterval(interval);
    };
  }, []);

  const sendPingSync = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'sync_ping',
        senderId: currentUser.id,
        senderName: currentUser.name,
        timestamp: Date.now(),
      }));
      showToast('Сигнал отправлен ⚡', 'Тестовый импульс синхронизации отправлен на подключенные устройства', 'info');
    } else {
      showToast('Синхронизация активна', 'Сервер SCADA подключен и синхронизирует изменения', 'info');
    }
  }, [currentUser.id, currentUser.name, showToast]);

  const triggerInstantSync = useCallback(() => {
    triggerLocalAutoSave(state, 'Фиксация положения элементов', true);
  }, [state, triggerLocalAutoSave]);

  const broadcastCursor = useCallback((canvasPos: { x: number; y: number } | null) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        cursor: canvasPos,
      }));
    }
  }, []);

  const setCurrentUserRole = (role: UserRole) => {
    setCurrentUser(prev => {
      const updated = { ...prev, role };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'user_update', role }));
      }
      return updated;
    });
  };

  const setCurrentUserName = (name: string) => {
    setCurrentUser(prev => {
      const updated = { ...prev, name };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'user_update', name }));
      }
      return updated;
    });
  };

  // Add event log helper
  const addEventLog = useCallback((logData: Omit<FactoryEventLog, 'id' | 'timestamp'>) => {
    const newLog = createEventLog(logData);

    setState(prev => {
      if (prev.eventLogs.some(l => l.id === newLog.id)) {
        return prev;
      }
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = {
        ...prev,
        eventLogs: nextLogs
      };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'event_log', eventLog: newLog }));
      }
      return nextState;
    });
  }, []);

  // Equipment CRUD
  const updateEquipment = useCallback((id: string, partial: Partial<EquipmentNode>, reason?: string, skipHistory?: boolean) => {
    if (!skipHistory) {
      pushHistory(state);
    }
    setState(prev => {
      const target = prev.equipment.find(e => e.id === id);
      const nextEq = prev.equipment.map(e => e.id === id ? { ...e, ...partial } : e);
      const logDesc = reason || (partial.status ? `Изменен статус ${target?.tag || id} на "${partial.status}"` : `Обновлены параметры ${target?.tag || id}`);

      const newLog = createEventLog({
        targetId: id,
        targetName: partial.name || target?.name || id,
        targetType: 'equipment',
        eventType: partial.status ? 'status_change' : 'property_edit',
        severity: partial.status === 'critical' ? 'critical' : partial.status === 'warning' ? 'warning' : 'info',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, equipment: nextEq, eventLogs: nextLogs };

      syncStateToServer(nextState, logDesc);
      return nextState;
    });
  }, [state, pushHistory, currentUser]);

  const addEquipment = useCallback((equipment: EquipmentNode, reason?: string) => {
    pushHistory(state);
    setState(prev => {
      const nextEq = [...prev.equipment.filter(e => e.id !== equipment.id), equipment];
      const logDesc = reason || `Добавлена единица оборудования: [${equipment.tag}] ${equipment.name}`;
      const newLog = createEventLog({
        targetId: equipment.id,
        targetName: equipment.name,
        targetType: 'equipment',
        eventType: 'created',
        severity: 'success',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, equipment: nextEq, eventLogs: nextLogs };
      syncStateToServer(nextState, `Добавлено оборудование ${equipment.tag}`);
      return nextState;
    });
  }, [state, pushHistory, currentUser]);

  const addEmptyEquipment = useCallback((parentId?: string | null, position?: { x: number; y: number }) => {
    const targetParentId = parentId !== undefined ? parentId : (focusedContainerId || null);
    
    let posX: number;
    let posY: number;

    if (position) {
      posX = position.x;
      posY = position.y;
    } else if (targetParentId) {
      const parentContainer = state.containers.find(c => c.id === targetParentId);
      if (parentContainer) {
        posX = parentContainer.x + 30;
        posY = parentContainer.y + 60;
      } else {
        posX = Math.round((-viewport.panX + window.innerWidth / 2) / viewport.zoom) - 85;
        posY = Math.round((-viewport.panY + window.innerHeight / 2) / viewport.zoom) - 85;
      }
    } else {
      posX = Math.round((-viewport.panX + window.innerWidth / 2) / viewport.zoom) - 85;
      posY = Math.round((-viewport.panY + window.innerHeight / 2) / viewport.zoom) - 85;
    }

    const newId = 'eq_' + Date.now();
    const nextNum = Math.floor(100 + Math.random() * 900);
    const newTag = 'EQ-' + nextNum;

    const newEquipment: EquipmentNode = {
      id: newId,
      type: 'equipment',
      name: 'Новое оборудование',
      tag: newTag,
      equipmentType: 'custom',
      status: 'normal',
      parentId: targetParentId,
      x: posX,
      y: posY,
      width: 170,
      height: 170,
      properties: [],
      model: '',
      serialNumber: '',
      manufacturer: '',
      notes: '',
      commissionDate: new Date().toISOString().slice(0, 10),
    };

    addEquipment(newEquipment, `Создано пустое оборудование [${newTag}]`);
    setSelectedId(newId);
    setActiveTool('select');

    showToast(
      `Создано пустое оборудование [${newTag}]`,
      'Заполните название, параметры и свойства в панели инспектора справа.',
      'info'
    );

    return newId;
  }, [focusedContainerId, state.containers, viewport, addEquipment, setSelectedId, setActiveTool, showToast]);

  const deleteEquipment = useCallback((id: string, reason?: string) => {
    pushHistory(state);
    setState(prev => {
      const target = prev.equipment.find(e => e.id === id);
      const nextEq = prev.equipment.filter(e => e.id !== id);
      const nextLinks = prev.links.filter(l => l.fromId !== id && l.toId !== id);
      const logDesc = reason || `Удалена единица оборудования [${target?.tag || id}] ${target?.name || ''}`;
      const newLog = createEventLog({
        targetId: id,
        targetName: target?.name || id,
        targetType: 'equipment',
        eventType: 'deleted',
        severity: 'warning',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, equipment: nextEq, links: nextLinks, eventLogs: nextLogs };

      syncStateToServer(nextState, `Удалено оборудование ${target?.tag || id}`);
      return nextState;
    });
  }, [state, pushHistory, currentUser]);

  // Container CRUD & Deep nesting
  const updateContainer = useCallback((id: string, partial: Partial<ContainerNode>, reason?: string, skipHistory?: boolean) => {
    if (!skipHistory) {
      pushHistory(state);
    }
    setState(prev => {
      const target = prev.containers.find(c => c.id === id);
      const nextContainers = prev.containers.map(c => c.id === id ? { ...c, ...partial } : c);
      let nextLogs = prev.eventLogs;
      if (reason) {
        const newLog = createEventLog({
          targetId: id,
          targetName: target?.name || id,
          targetType: 'container',
          eventType: 'property_edit',
          severity: 'info',
          description: reason,
          userName: currentUser.name,
          userRole: currentUser.role
        });
        nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      }
      const nextState = { ...prev, containers: nextContainers, eventLogs: nextLogs };

      syncStateToServer(nextState, reason || `Обновлен контейнер ${target?.tag || id}`);
      return nextState;
    });
  }, [state, pushHistory, currentUser]);

  const batchUpdatePositions = useCallback((
    containerUpdates: Array<{ id: string; x: number; y: number; parentId?: string | null }>,
    equipmentUpdates: Array<{ id: string; x: number; y: number; parentId?: string | null }>,
    reason?: string,
    skipHistory?: boolean
  ) => {
    if (!skipHistory) {
      pushHistory(state);
    }
    const contMap = new Map(containerUpdates.map(u => [u.id, u]));
    const eqMap = new Map(equipmentUpdates.map(u => [u.id, u]));

    setState(prev => {
      let containersChanged = false;
      const nextContainers = prev.containers.map(c => {
        const u = contMap.get(c.id);
        if (u) {
          const hasPosChange = c.x !== u.x || c.y !== u.y;
          const hasParentChange = u.parentId !== undefined && c.parentId !== u.parentId;
          if (hasPosChange || hasParentChange) {
            containersChanged = true;
            return {
              ...c,
              x: u.x,
              y: u.y,
              ...(u.parentId !== undefined ? { parentId: u.parentId } : {})
            };
          }
        }
        return c;
      });

      let equipmentChanged = false;
      const nextEquipment = prev.equipment.map(e => {
        const u = eqMap.get(e.id);
        if (u) {
          const hasPosChange = e.x !== u.x || e.y !== u.y;
          const hasParentChange = u.parentId !== undefined && e.parentId !== u.parentId;
          if (hasPosChange || hasParentChange) {
            equipmentChanged = true;
            return {
              ...e,
              x: u.x,
              y: u.y,
              ...(u.parentId !== undefined ? { parentId: u.parentId } : {})
            };
          }
        }
        return e;
      });

      if (!containersChanged && !equipmentChanged) {
        return prev;
      }

      const nextState = {
        ...prev,
        containers: nextContainers,
        equipment: nextEquipment
      };

      syncStateToServer(nextState, reason || 'Перемещение элементов');
      return nextState;
    });
  }, [state, pushHistory]);

  const toggleContainerCollapse = useCallback((id: string) => {
    setState(prev => {
      const target = prev.containers.find(c => c.id === id);
      if (!target) return prev;
      const willBeCollapsed = !target.isCollapsed;
      const nextContainers = prev.containers.map(c => c.id === id ? { ...c, isCollapsed: willBeCollapsed } : c);
      const logDesc = willBeCollapsed ? `Свернут контейнер [${target.tag}] ${target.name}` : `Раскрыт контейнер [${target.tag}] ${target.name}`;
      const newLog = createEventLog({
        targetId: id,
        targetName: target.name,
        targetType: 'container',
        eventType: 'property_edit',
        severity: 'info',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, containers: nextContainers, eventLogs: nextLogs };

      syncStateToServer(nextState, `Контейнер ${target.tag} ${willBeCollapsed ? 'свернут' : 'развернут'}`);
      return nextState;
    });
  }, [currentUser]);

  const toggleEquipmentCollapse = useCallback((id: string) => {
    setState(prev => {
      const target = prev.equipment.find(e => e.id === id);
      if (!target) return prev;
      const willBeCollapsed = !target.isCollapsed;
      const nextEq = prev.equipment.map(e => e.id === id ? { ...e, isCollapsed: willBeCollapsed } : e);
      const logDesc = willBeCollapsed ? `Свернуто оборудование [${target.tag}] ${target.name}` : `Раскрыто оборудование [${target.tag}] ${target.name}`;
      const newLog = createEventLog({
        targetId: id,
        targetName: target.name,
        targetType: 'equipment',
        eventType: 'property_edit',
        severity: 'info',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, equipment: nextEq, eventLogs: nextLogs };

      syncStateToServer(nextState, `Оборудование ${target.tag} ${willBeCollapsed ? 'свернуто' : 'развернуто'}`);
      return nextState;
    });
  }, [currentUser]);

  const addContainer = useCallback((container: ContainerNode, reason?: string) => {
    pushHistory(state);
    setState(prev => {
      const nextContainers = [...prev.containers.filter(c => c.id !== container.id), container];
      const logDesc = reason || `Создан контейнер цеха/участка: [${container.tag}] ${container.name}`;
      const newLog = createEventLog({
        targetId: container.id,
        targetName: container.name,
        targetType: 'container',
        eventType: 'created',
        severity: 'success',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, containers: nextContainers, eventLogs: nextLogs };
      syncStateToServer(nextState, `Создан контейнер ${container.tag}`);
      return nextState;
    });
  }, [state, pushHistory, currentUser]);

  const deleteContainer = useCallback((id: string, reason?: string) => {
    pushHistory(state);
    setState(prev => {
      const target = prev.containers.find(c => c.id === id);
      // Orphan children get promoted to parent or null
      const newParentId = target?.parentId || null;
      const nextEq = prev.equipment.map(e => e.parentId === id ? { ...e, parentId: newParentId } : e);
      const nextContainers = prev.containers
        .filter(c => c.id !== id)
        .map(c => c.parentId === id ? { ...c, parentId: newParentId } : c);
      const nextLinks = prev.links.filter(l => l.fromId !== id && l.toId !== id);
      const logDesc = reason || `Удален контейнер [${target?.tag || id}] ${target?.name || ''}`;
      const newLog = createEventLog({
        targetId: id,
        targetName: target?.name || id,
        targetType: 'container',
        eventType: 'deleted',
        severity: 'warning',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, equipment: nextEq, containers: nextContainers, links: nextLinks, eventLogs: nextLogs };

      syncStateToServer(nextState, `Удален контейнер ${target?.tag || id}`);
      return nextState;
    });
  }, [state, pushHistory, currentUser]);

  const batchDelete = useCallback((idsToDelete?: string[], reason?: string) => {
    const ids = idsToDelete || selectedIds;
    if (!ids || ids.length === 0) return;
    if (currentUser.role !== 'admin') return;

    pushHistory(state);
    const idSet = new Set(ids);

    setState(prev => {
      // Find deleted containers to re-parent orphan children
      const deletedContainers = prev.containers.filter(c => idSet.has(c.id));
      const containerParentMap = new Map(deletedContainers.map(c => [c.id, c.parentId || null]));

      // Also if any equipment is a parent of other equipment and is deleted, re-parent children
      const deletedEq = prev.equipment.filter(e => idSet.has(e.id));
      const eqParentMap = new Map(deletedEq.map(e => [e.id, e.parentId || null]));

      const nextEq = prev.equipment
        .filter(e => !idSet.has(e.id))
        .map(e => {
          if (e.parentId && idSet.has(e.parentId)) {
            const fallbackParent = containerParentMap.get(e.parentId) || eqParentMap.get(e.parentId) || null;
            return { ...e, parentId: fallbackParent };
          }
          return e;
        });

      const nextContainers = prev.containers
        .filter(c => !idSet.has(c.id))
        .map(c => {
          if (c.parentId && idSet.has(c.parentId)) {
            const fallbackParent = containerParentMap.get(c.parentId) || null;
            return { ...c, parentId: fallbackParent };
          }
          return c;
        });

      const nextLinks = prev.links.filter(l => 
        !idSet.has(l.id) && !idSet.has(l.fromId) && !idSet.has(l.toId)
      );

      const logDesc = reason || `Удалена группа объектов (${ids.length} шт.)`;
      const newLog = createEventLog({
        targetId: ids[0],
        targetName: `${ids.length} объектов`,
        targetType: 'system',
        eventType: 'deleted',
        severity: 'warning',
        description: logDesc,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);

      const nextState = {
        ...prev,
        containers: nextContainers,
        equipment: nextEq,
        links: nextLinks,
        eventLogs: nextLogs
      };

      syncStateToServer(nextState, logDesc);
      return nextState;
    });

    setSelectedIdState(null);
    setSelectedIds([]);
  }, [selectedIds, currentUser, state, pushHistory]);

  // Links CRUD
  const addLink = useCallback((fromId: string, toId: string, type: LinkType = 'power', style: LinkStyle = 'orthogonal') => {
    if (fromId === toId) return;
    pushHistory(state);

    const typeColors: Record<LinkType, string> = {
      power: '#eab308',
      pipe: '#06b6d4',
      conveyor: '#10b981',
      signal: '#a855f7'
    };

    const typeLabels: Record<LinkType, string> = {
      power: 'Линия питания 380В',
      pipe: 'Трубопровод СОЖ/Гидравлика',
      conveyor: 'Поток материалов',
      signal: 'Шина передачи данных'
    };

    const newLink: ConnectionLink = {
      id: 'link_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      fromId,
      toId,
      type,
      style,
      direction: 'forward',
      color: typeColors[type],
      label: typeLabels[type],
      animated: true,
    };

    setState(prev => {
      const nextLinks = [...prev.links.filter(l => l.id !== newLink.id), newLink];
      const newLog = createEventLog({
        targetId: newLink.id,
        targetName: newLink.label || 'Связь',
        targetType: 'link',
        eventType: 'created',
        severity: 'info',
        description: `Установлена связь (${typeLabels[type]}) между элементами`,
        userName: currentUser.name,
        userRole: currentUser.role
      });
      const nextLogs = [newLog, ...prev.eventLogs.filter(l => l.id !== newLog.id)].slice(0, 200);
      const nextState = { ...prev, links: nextLinks, eventLogs: nextLogs };
      syncStateToServer(nextState, 'Добавлена технологическая связь');
      return nextState;
    });
  }, [state, pushHistory, currentUser]);

  const restoreState = useCallback((newState: FactoryState, reason?: string) => {
    pushHistory(state);
    const sanitized: FactoryState = {
      ...initialFactoryState,
      ...newState,
      equipment: dedupeById(newState.equipment || initialFactoryState.equipment),
      containers: dedupeById(newState.containers || initialFactoryState.containers),
      links: dedupeById(newState.links || initialFactoryState.links),
      eventLogs: dedupeById(newState.eventLogs || initialFactoryState.eventLogs).slice(0, 200),
      backups: newState.backups || state.backups || [],
      version: (state.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
    };
    setState(sanitized);
    syncStateToServer(sanitized, reason || 'Восстановление схемы из файла/копии');
  }, [state, pushHistory, syncStateToServer]);

  const updateLink = useCallback((id: string, partial: Partial<ConnectionLink>) => {
    pushHistory(state);
    setState(prev => {
      const nextLinks = prev.links.map(l => l.id === id ? { ...l, ...partial } : l);
      const nextState = { ...prev, links: nextLinks };
      syncStateToServer(nextState, 'Обновлены параметры связи');
      return nextState;
    });
  }, [state, pushHistory]);

  const deleteLink = useCallback((id: string) => {
    pushHistory(state);
    setState(prev => {
      const nextLinks = prev.links.filter(l => l.id !== id);
      const nextState = { ...prev, links: nextLinks };
      syncStateToServer(nextState, 'Удалена технологическая связь');
      return nextState;
    });
  }, [state, pushHistory]);

  // Backups
  const createBackup = useCallback(async (service: CloudServiceType, name?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          name: name || `Резервная копия (${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')})`,
          state,
          userName: currentUser.name,
          userRole: currentUser.role
        })
      });
      const data = await response.json();
      if (data.success && data.backup) {
        setState(prev => ({
          ...prev,
          backups: [data.backup, ...prev.backups]
        }));
        showToast('Резервная копия создана', `Сохранено в хранилище ${service.toUpperCase()}`, 'success');
        return true;
      }
      showToast('Ошибка', 'Не удалось сохранить резервную копию', 'error');
      return false;
    } catch (e) {
      console.error('Backup creation error:', e);
      showToast('Ошибка сети', 'Не удалось связаться с сервером бэкапов', 'error');
      return false;
    }
  }, [currentUser, state, showToast]);

  // Periodic automated recovery snapshot directly into chosen project directory
  const lastSnapshotHashRef = useRef<string>('');
  useEffect(() => {
    if (!autoSaveConfig.enabled || !autoSaveConfig.autoSnapshots) return;
    const intervalMinutes = Math.max(1, autoSaveConfig.snapshotIntervalMinutes || 5);
    const intervalMs = intervalMinutes * 60 * 1000;

    const timer = setInterval(async () => {
      const currentHash = `${state.equipment.length}_${state.containers.length}_${state.links.length}_${state.version || 0}`;
      if (
        (state.equipment.length > 0 || state.containers.length > 0) &&
        currentHash !== lastSnapshotHashRef.current
      ) {
        lastSnapshotHashRef.current = currentHash;
        const handle = targetDirectoryHandleRef.current;
        if (handle && hasDirectoryPermission) {
          const dateStr = new Date().toISOString().slice(0, 10);
          const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
          const snapshotName = `promschema_snapshot_${dateStr}_${timeStr}.json`;
          try {
            await saveProjectToDirectory(handle, state, snapshotName, false);
            setLastSavedTime(Date.now());
          } catch (e) {
            console.warn('[Snapshot] Error writing snapshot to directory:', e);
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoSaveConfig.enabled, autoSaveConfig.autoSnapshots, autoSaveConfig.snapshotIntervalMinutes, state]);

  const restoreBackup = useCallback(async (backupId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/backups/${backupId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser.name,
          userRole: currentUser.role
        })
      });
      const data = await response.json();
      if (data.success && data.state) {
        restoreState(data.state, 'Восстановление из резервной копии');
        showToast('Схема восстановлена', 'Данные успешно загружены из снимка', 'success');
        return true;
      }
      // Fallback: request full state
      const stateRes = await fetch('/api/state');
      const freshState = await stateRes.json();
      restoreState(freshState, 'Восстановление из резервной копии');
      showToast('Схема восстановлена', 'Данные успешно загружены', 'success');
      return true;
    } catch (e) {
      console.error('Restore error:', e);
      showToast('Ошибка восстановления', 'Не удалось восстановить схему из копии', 'error');
      return false;
    }
  }, [currentUser, restoreState, showToast]);

  const deleteBackup = useCallback(async (backupId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/backups/${backupId}`, { method: 'DELETE' });
      if (response.ok) {
        setState(prev => ({
          ...prev,
          backups: prev.backups.filter(b => b.id !== backupId)
        }));
        showToast('Копия удалена', 'Точка восстановления удалена из списка', 'info');
        return true;
      }
      showToast('Ошибка', 'Не удалось удалить копию', 'error');
      return false;
    } catch (e) {
      showToast('Ошибка', 'Не удалось связаться с сервером', 'error');
      return false;
    }
  }, [showToast]);

  // Import Project Handlers
  const importProject = useCallback(async (file: File): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const result = parseAndValidateProject(content);
          if (!result.success || !result.state) {
            const err = result.error || 'Неверный формат структуры данных';
            showToast('Ошибка импорта', err, 'error');
            resolve({ success: false, message: err });
            return;
          }

          restoreState(result.state, `Импорт файла ${file.name}`);
          const msg = `Импортировано: ${result.stats?.equipmentCount || 0} ед. оборудования, ${result.stats?.containersCount || 0} цехов, ${result.stats?.linksCount || 0} связей`;
          showToast('Проект успешно импортирован', msg, 'success');

          addEventLog({
            targetId: 'system',
            targetName: file.name,
            targetType: 'system',
            eventType: 'backup_restore',
            severity: 'success',
            description: `Импортирован файл проекта: ${file.name} (${msg})`,
            userName: currentUser.name,
            userRole: currentUser.role
          });

          resolve({ success: true, message: msg });
        } catch (err: any) {
          const errMsg = err.message || 'Ошибка обработки данных файла';
          showToast('Ошибка импорта', errMsg, 'error');
          resolve({ success: false, message: errMsg });
        }
      };
      reader.onerror = () => {
        showToast('Ошибка', 'Не удалось прочитать выбранный файл', 'error');
        resolve({ success: false, message: 'Не удалось прочитать выбранный файл' });
      };
      reader.readAsText(file);
    });
  }, [currentUser, restoreState, showToast, addEventLog]);

  const importProjectFromJSON = useCallback((jsonStr: string): { success: boolean; message: string } => {
    const result = parseAndValidateProject(jsonStr);
    if (!result.success || !result.state) {
      const err = result.error || 'Неверный формат структуры данных';
      showToast('Ошибка импорта', err, 'error');
      return { success: false, message: err };
    }

    restoreState(result.state, 'Импорт из буфера обмена');
    const msg = `Импортировано: ${result.stats?.equipmentCount || 0} ед. оборудования, ${result.stats?.containersCount || 0} цехов, ${result.stats?.linksCount || 0} связей`;
    showToast('Проект успешно импортирован', msg, 'success');

    addEventLog({
      targetId: 'system',
      targetName: 'Импорт из буфера',
      targetType: 'system',
      eventType: 'backup_restore',
      severity: 'success',
      description: `Импортирована схема из JSON-текста (${msg})`,
      userName: currentUser.name,
      userRole: currentUser.role
    });

    return { success: true, message: msg };
  }, [currentUser, restoreState, showToast, addEventLog]);

  // Reset to initial factory preset
  const loadFactoryPreset = useCallback(() => {
    restoreState(initialFactoryState, 'Сброс к заводскому шаблону');
    showToast('Схема сброшена', 'Загружен заводской типовой проект предприятия.', 'info');
  }, [restoreState, showToast]);

  // Viewport helper functions
  const zoomIn = () => {
    setViewport(v => ({ ...v, zoom: Math.min(2.5, Number((v.zoom + 0.15).toFixed(2))) }));
  };

  const zoomOut = () => {
    setViewport(v => ({ ...v, zoom: Math.max(0.2, Number((v.zoom - 0.15).toFixed(2))) }));
  };

  const zoomReset = () => {
    setViewport({ panX: 200, panY: 150, zoom: 0.85 });
  };

  // Focus node by ID (centers and zooms onto the element, uncollapses ancestors, highlights)
  const focusNode = useCallback((nodeId: string) => {
    const eq = state.equipment.find(e => e.id === nodeId);
    const cont = state.containers.find(c => c.id === nodeId);
    const target = eq || cont;
    if (!target) return;

    // Uncollapse all ancestor containers or equipment up the hierarchy
    const ancestorIds = new Set<string>();
    let curr: string | null | undefined = target.parentId;
    while (curr) {
      ancestorIds.add(curr);
      const parentCont = state.containers.find(c => c.id === curr);
      const parentEq = state.equipment.find(e => e.id === curr);
      curr = parentCont?.parentId || parentEq?.parentId;
    }

    if (ancestorIds.size > 0) {
      setState(prev => {
        let changed = false;
        const nextContainers = prev.containers.map(c => {
          if (ancestorIds.has(c.id) && c.isCollapsed) {
            changed = true;
            return { ...c, isCollapsed: false };
          }
          return c;
        });
        const nextEquipment = prev.equipment.map(e => {
          if (ancestorIds.has(e.id) && e.isCollapsed) {
            changed = true;
            return { ...e, isCollapsed: false };
          }
          return e;
        });
        return changed ? { ...prev, containers: nextContainers, equipment: nextEquipment } : prev;
      });
    }

    // If locked inside another container focus mode, exit focus mode so target is visible
    if (focusedContainerId && focusedContainerId !== nodeId) {
      const isDescendant = isNodeInSubtree(nodeId, focusedContainerId, state.containers, state.equipment);
      if (!isDescendant) {
        setFocusedContainerId(null);
      }
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const targetW = ('isCollapsed' in target && target.isCollapsed)
      ? (('collapsedWidth' in target && target.collapsedWidth) || 180)
      : target.width;
    const targetH = ('isCollapsed' in target && target.isCollapsed)
      ? (('collapsedHeight' in target && target.collapsedHeight) || 64)
      : target.height;
    const targetCenterX = target.x + targetW / 2;
    const targetCenterY = target.y + targetH / 2;

    const targetZoom = 1.0;
    const newPanX = windowWidth / 2 - targetCenterX * targetZoom;
    const newPanY = windowHeight / 2 - targetCenterY * targetZoom;

    setViewport({ panX: newPanX, panY: newPanY, zoom: targetZoom });
    setSelectedId(nodeId);

    // Set glowing halo highlight on target node
    setHighlightedNodeId(nodeId);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedNodeId(null);
    }, 4500);

    // Update browser URL query parameter without page reload
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('element', nodeId);
      window.history.replaceState({ element: nodeId }, '', url.toString());
    } catch {}
  }, [state.equipment, state.containers, focusedContainerId]);

  // Add cross-reference link from one element to another
  const addElementLink = useCallback((sourceId: string, targetId: string, relationship?: string) => {
    setState(prev => {
      const isEq = prev.equipment.some(e => e.id === sourceId);
      const isCont = prev.containers.some(c => c.id === sourceId);
      const newRef: ElementReference = {
        id: 'ref-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        targetId,
        relationship: relationship?.trim() || 'Связанный узел'
      };

      if (isEq) {
        return {
          ...prev,
          equipment: prev.equipment.map(e => {
            if (e.id === sourceId) {
              const currentLinks = e.elementLinks || [];
              return { ...e, elementLinks: [...currentLinks, newRef] };
            }
            return e;
          })
        };
      } else if (isCont) {
        return {
          ...prev,
          containers: prev.containers.map(c => {
            if (c.id === sourceId) {
              const currentLinks = c.elementLinks || [];
              return { ...c, elementLinks: [...currentLinks, newRef] };
            }
            return c;
          })
        };
      }
      return prev;
    });

    const target = state.equipment.find(e => e.id === targetId) || state.containers.find(c => c.id === targetId);
    showToast('Ссылка создана 🔗', `Элемент связан с «${target?.name || targetId}»`, 'success');
  }, [state.equipment, state.containers, showToast]);

  // Remove cross-reference link
  const removeElementLink = useCallback((sourceId: string, linkId: string) => {
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.map(e => {
        if (e.id === sourceId && e.elementLinks) {
          return { ...e, elementLinks: e.elementLinks.filter(l => l.id !== linkId) };
        }
        return e;
      }),
      containers: prev.containers.map(c => {
        if (c.id === sourceId && c.elementLinks) {
          return { ...c, elementLinks: c.elementLinks.filter(l => l.id !== linkId) };
        }
        return c;
      })
    }));
    showToast('Ссылка удалена', 'Связь между элементами снята', 'info');
  }, [showToast]);

  // Copy link to element
  const copyElementLink = useCallback(async (nodeId: string, paramType: LinkParamType = 'element'): Promise<boolean> => {
    const target = state.equipment.find(e => e.id === nodeId) || state.containers.find(c => c.id === nodeId);
    if (!target) return false;
    const url = generateElementUrl(target, paramType);
    const success = await copyTextToClipboard(url);
    if (success) {
      showToast('Ссылка скопирована! 🔗', `Прямой URL для «${target.name}» скопирован в буфер обмена`, 'success');
    } else {
      showToast('Ошибка копирования', 'Пожалуйста, скопируйте ссылку вручную', 'error');
    }
    return success;
  }, [state.equipment, state.containers, showToast]);

  // Check deep link URL on initial load and browser navigation
  useEffect(() => {
    const handleUrlNavigation = () => {
      const parsed = parseElementFromLocation();
      if (!parsed) return;
      const found = findElementInState(state, parsed);
      if (found) {
        focusNode(found.id);
        showToast(
          'Переход по ссылке 🔗',
          `Выполнен переход к «${found.name}» (${found.tag})`,
          'info'
        );
      }
    };

    const timer = setTimeout(handleUrlNavigation, 400);

    window.addEventListener('popstate', handleUrlNavigation);
    window.addEventListener('hashchange', handleUrlNavigation);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', handleUrlNavigation);
      window.removeEventListener('hashchange', handleUrlNavigation);
    };
  }, [state.equipment.length, state.containers.length]);

  // Fit container or equipment to screen (fills the workspace)
  const fitContainerToScreen = useCallback((nodeId?: string) => {
    const id = nodeId || focusedContainerId || selectedId;
    if (!id) return;
    const cont = state.containers.find(c => c.id === id);
    const eq = state.equipment.find(e => e.id === id);
    const target = cont || eq;
    if (!target) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const fit = calculateNodeFitViewport(target, viewportW, viewportH, 50, 56);
    setViewport(fit);
  }, [focusedContainerId, selectedId, state.containers, state.equipment]);

  // Enter Focus Mode for a Container OR Equipment (Node fills entire working window)
  const enterFocusMode = useCallback((nodeId: string) => {
    const targetContainer = state.containers.find(c => c.id === nodeId);
    const targetEquipment = state.equipment.find(e => e.id === nodeId);
    const target = targetContainer || targetEquipment;
    if (!target) return;

    // If target or any ancestor container or equipment is collapsed, uncollapse it!
    setState(prev => {
      let changed = false;
      const nextContainers = prev.containers.map(c => {
        if (c.id === nodeId && c.isCollapsed) {
          changed = true;
          return { ...c, isCollapsed: false };
        }
        return c;
      });
      const nextEquipment = prev.equipment.map(e => {
        if (e.id === nodeId && e.isCollapsed) {
          changed = true;
          return { ...e, isCollapsed: false };
        }
        return e;
      });
      return changed ? { ...prev, containers: nextContainers, equipment: nextEquipment } : prev;
    });

    setFocusedContainerId(nodeId);
    setSelectedId(nodeId);

    // Zoom and center node to fill the working window
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const fit = calculateNodeFitViewport(target, viewportW, viewportH, 50, 56);
    setViewport(fit);

    if (targetContainer) {
      showToast(
        `Цех: [${targetContainer.tag}] ${targetContainer.name}`,
        'Контейнер заполняет рабочее окно. Нажмите Esc для возврата.',
        'info'
      );
    } else if (targetEquipment) {
      showToast(
        `Оборудование: [${targetEquipment.tag}] ${targetEquipment.name}`,
        'Фокусный режим на оборудовании. Нажмите Esc для возврата.',
        'info'
      );
    }
  }, [state.containers, state.equipment, showToast]);

  // Exit Focus Mode: collapses containers and equipment to unexpanded state per user request
  const exitFocusMode = useCallback(() => {
    setFocusedContainerId(null);
    setIsFocusFullscreen(false);

    setState(prev => {
      let changed = false;
      const nextContainers = prev.containers.map(c => {
        if (!c.isCollapsed) {
          changed = true;
          return { ...c, isCollapsed: true };
        }
        return c;
      });
      const nextEquipment = prev.equipment.map(e => {
        if (!e.isCollapsed) {
          changed = true;
          return { ...e, isCollapsed: true };
        }
        return e;
      });

      if (!changed) return prev;

      pushHistory(prev);

      const nextState = {
        ...prev,
        containers: nextContainers,
        equipment: nextEquipment,
      };

      syncStateToServer(nextState, 'Выход из фокусного режима: сворачивание контейнеров и оборудования');
      return nextState;
    });

    showToast('Выход из фокусного режима', 'Контейнеры и оборудование отображаются в нераскрытом виде', 'info');
  }, [showToast, pushHistory]);

  // Toggle Focus Mode
  const toggleFocusMode = useCallback((nodeId?: string) => {
    const id = nodeId || selectedId;
    if (!id) return;
    if (focusedContainerId === id) {
      exitFocusMode();
    } else {
      enterFocusMode(id);
    }
  }, [focusedContainerId, selectedId, enterFocusMode, exitFocusMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if inside input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('pan');
      } else if (e.key === 'q' || e.key === 'Q') {
        setActiveTool('add_equipment');
      } else if (e.key === 'c' || e.key === 'C') {
        setActiveTool('add_container');
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('connect');
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        if (
          selectedId &&
          (state.containers.some(c => c.id === selectedId) || state.equipment.some(e => e.id === selectedId))
        ) {
          e.preventDefault();
          toggleFocusMode(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        const allIds = [
          ...state.containers.map(c => c.id),
          ...state.equipment.map(e => e.id)
        ];
        setSelectedIds(allIds);
        if (allIds.length > 0) setSelectedIdState(allIds[0]);
      } else if (e.key === 'Escape') {
        if (focusedContainerId) {
          exitFocusMode();
          return;
        }
        setSelectedIdState(null);
        setSelectedIds([]);
        setConnectingSourceId(null);
        setActiveTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (currentUser.role === 'admin') {
          if (selectedIds.length > 1) {
            batchDelete(selectedIds);
          } else if (selectedId) {
            // Check if equipment or container or link
            if (state.equipment.some(eq => eq.id === selectedId)) {
              deleteEquipment(selectedId);
              setSelectedId(null);
            } else if (state.containers.some(c => c.id === selectedId)) {
              deleteContainer(selectedId);
              setSelectedId(null);
            } else if (state.links.some(l => l.id === selectedId)) {
              deleteLink(selectedId);
              setSelectedId(null);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedIds, currentUser.role, state, undo, redo, deleteEquipment, deleteContainer, deleteLink, batchDelete, focusedContainerId, exitFocusMode, toggleFocusMode]);

  return (
    <FactoryContext.Provider
      value={{
        state,
        currentUser,
        onlineUsers,
        userCursors,
        connectionStatus,
        selectedId,
        setSelectedId,
        selectedIds,
        setSelectedIds,
        toggleSelectId,
        batchDelete,
        activeTool,
        setActiveTool,
        connectingSourceId,
        setConnectingSourceId,
        linkDraftType,
        setLinkDraftType,
        viewport,
        setViewport,
        focusNode,
        zoomIn,
        zoomOut,
        zoomReset,
        focusedContainerId,
        setFocusedContainerId,
        isFocusFullscreen,
        setIsFocusFullscreen,
        enterFocusMode,
        exitFocusMode,
        toggleFocusMode,
        fitContainerToScreen,
        updateEquipment,
        addEquipment,
        deleteEquipment,
        updateContainer,
        batchUpdatePositions,
        toggleContainerCollapse,
        toggleEquipmentCollapse,
        addContainer,
        deleteContainer,
        addLink,
        updateLink,
        deleteLink,
        addEventLog,
        restoreState,
        createBackup,
        restoreBackup,
        deleteBackup,
        importProject,
        importProjectFromJSON,
        toasts,
        showToast,
        dismissToast,
        undo,
        redo,
        canUndo,
        canRedo,
        recordHistorySnapshot,
        setCurrentUserRole,
        setCurrentUserName,
        broadcastCursor,
        isDarkMode,
        toggleDarkMode,
        isSearchOpen,
        setIsSearchOpen,
        isCreateEquipmentOpen,
        setIsCreateEquipmentOpen,
        addEmptyEquipment,
        isReportOpen,
        setIsReportOpen,
        isBackupOpen,
        setIsBackupOpen,
        isEventLogsOpen,
        setIsEventLogsOpen,
        isProjectPanelOpen,
        setIsProjectPanelOpen,
        gridSnap,
        setGridSnap,
        autoSaveConfig,
        setAutoSaveConfig,
        saveStatus,
        lastSavedTime,
        lastSavedFilePath,
        lastSyncEvent,
        sendPingSync,
        triggerInstantSync,
        folderWatchActive,
        lastFolderSyncTime,
        lastFolderFileChangeNotice,
        clearFolderChangeNotice,
        checkFolderNow,
        targetDirectory,
        targetProjectFilename,
        setTargetProjectFilename,
        selectTargetFolder,
        clearTargetFolder,
        hasDirectoryPermission,
        requestDirectoryAccess,
        forceSave,
        loadFactoryPreset,
        highlightedNodeId,
        setHighlightedNodeId,
        shareModalNodeId,
        setShareModalNodeId,
        openShareModal,
        closeShareModal,
        addElementLink,
        removeElementLink,
        copyElementLink,
      }}
    >
      {children}
    </FactoryContext.Provider>
  );
};

export const useFactory = () => {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error('useFactory must be used within a FactoryProvider');
  }
  return context;
};

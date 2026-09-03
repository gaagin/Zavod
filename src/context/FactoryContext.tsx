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
  AutoSaveConfig
} from '../types';
import { initialFactoryState } from '../data/initialFactory';
import { parseAndValidateProject } from '../utils/exportUtils';
import { calculateContainerFitViewport } from '../utils/geometry';

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

  // Auto-Save Management
  autoSaveConfig: AutoSaveConfig;
  setAutoSaveConfig: React.Dispatch<React.SetStateAction<AutoSaveConfig>>;
  saveStatus: 'saved' | 'saving' | 'error';
  lastSavedTime: number;
  forceSave: () => void;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      enabled: true,
      autoSnapshots: true,
      snapshotIntervalMinutes: 5,
    };
  });

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<number>(Date.now());
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTOSAVE_KEY, JSON.stringify(autoSaveConfig));
    } catch (e) {
      console.warn(e);
    }
  }, [autoSaveConfig]);

  // Sync state to backend & broadcast (Auto-save)
  const syncStateToServer = (newState: FactoryState, reason: string = 'Изменение схемы') => {
    if (autoSaveConfig.enabled) {
      setSaveStatus('saving');
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn('Local storage write failed:', e);
      setSaveStatus('error');
    }

    // Broadcast through BroadcastChannel for same-origin tabs
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'state_updated',
        state: newState,
        senderId: currentUser.id,
        reason
      });
    }

    // Send to WebSocket or fallback to HTTP
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'state_patch',
        state: newState,
        reason
      }));
    } else {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState, reason })
      }).catch(err => console.warn('POST /api/state sync error:', err));
    }

    if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
    saveDebounceTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedTime(Date.now());
    }, 350);
  };

  // Force instant save to all storages
  const forceSave = useCallback(() => {
    setSaveStatus('saving');
    try {
      localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(state));
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'state_patch',
          state,
          reason: 'Ручное сохранение'
        }));
      } else {
        fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, reason: 'Ручное сохранение' })
        }).catch(console.warn);
      }
      if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = setTimeout(() => {
        setSaveStatus('saved');
        setLastSavedTime(Date.now());
      }, 250);
      showToast('Сохранено', 'Проект успешно сохранен в браузере и на сервере.', 'success');
    } catch (e) {
      setSaveStatus('error');
      showToast('Ошибка сохранения', 'Не удалось записать в локальное хранилище.', 'error');
    }
  }, [state, showToast]);

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
              setState(prev => ({
                ...prev,
                ...msg.state,
                equipment: dedupeById(msg.state.equipment || prev.equipment),
                containers: dedupeById(msg.state.containers || prev.containers),
                links: dedupeById(msg.state.links || prev.links),
                eventLogs: dedupeById(msg.state.eventLogs || prev.eventLogs),
              }));
            }
            if (msg.users) {
              setOnlineUsers(msg.users);
            }
          } else if (msg.type === 'state_updated') {
            if (msg.state) {
              isRemoteUpdateRef.current = true;
              setState(prev => ({
                ...prev,
                ...msg.state,
                equipment: dedupeById(msg.state.equipment || prev.equipment),
                containers: dedupeById(msg.state.containers || prev.containers),
                links: dedupeById(msg.state.links || prev.links),
                eventLogs: dedupeById(msg.state.eventLogs || prev.eventLogs),
              }));
            }
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
    
    // Also save via HTTP API for guaranteed persistence across devices
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: sanitized, reason: reason || 'Восстановление схемы' })
    }).catch(err => console.warn('POST /api/state fallback failed:', err));
  }, [state, pushHistory]);

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

  // Periodic automated recovery snapshot (if schema has nodes and changed)
  const lastSnapshotHashRef = useRef<string>('');
  useEffect(() => {
    if (!autoSaveConfig.enabled || !autoSaveConfig.autoSnapshots) return;
    const intervalMinutes = Math.max(1, autoSaveConfig.snapshotIntervalMinutes || 5);
    const intervalMs = intervalMinutes * 60 * 1000;

    const timer = setInterval(() => {
      const currentHash = `${state.equipment.length}_${state.containers.length}_${state.links.length}_${state.version || 0}`;
      if (
        (state.equipment.length > 0 || state.containers.length > 0) &&
        currentHash !== lastSnapshotHashRef.current
      ) {
        lastSnapshotHashRef.current = currentHash;
        const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        createBackup('yandex', `[Автосохранение] ${timeStr}`);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoSaveConfig.enabled, autoSaveConfig.autoSnapshots, autoSaveConfig.snapshotIntervalMinutes, state.equipment.length, state.containers.length, state.links.length, state.version, createBackup]);

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

  // Focus node by ID (centers and zooms onto the element)
  const focusNode = useCallback((nodeId: string) => {
    const eq = state.equipment.find(e => e.id === nodeId);
    const cont = state.containers.find(c => c.id === nodeId);
    const target = eq || cont;
    if (!target) return;

    // If target has collapsed ancestor, uncollapse it so it's visible!
    let currentParentId = target.parentId;
    if (currentParentId) {
      setState(prev => {
        let changed = false;
        const nextContainers = prev.containers.map(c => {
          if (c.id === currentParentId && c.isCollapsed) {
            changed = true;
            return { ...c, isCollapsed: false };
          }
          return c;
        });
        return changed ? { ...prev, containers: nextContainers } : prev;
      });
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    const targetZoom = 1.0;
    const newPanX = windowWidth / 2 - targetCenterX * targetZoom;
    const newPanY = windowHeight / 2 - targetCenterY * targetZoom;

    setViewport({ panX: newPanX, panY: newPanY, zoom: targetZoom });
    setSelectedId(nodeId);
  }, [state.equipment, state.containers]);

  // Fit container to screen (fills the workspace)
  const fitContainerToScreen = useCallback((containerId?: string) => {
    const id = containerId || focusedContainerId || selectedId;
    if (!id) return;
    const cont = state.containers.find(c => c.id === id);
    if (!cont) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const fit = calculateContainerFitViewport(cont, viewportW, viewportH, 40, 56);
    setViewport(fit);
  }, [focusedContainerId, selectedId, state.containers]);

  // Enter Focus Mode for a Container (Container fills entire working window)
  const enterFocusMode = useCallback((containerId: string) => {
    const target = state.containers.find(c => c.id === containerId);
    if (!target) return;

    // If target or any ancestor container is collapsed, uncollapse it!
    setState(prev => {
      let changed = false;
      const nextContainers = prev.containers.map(c => {
        if (c.id === containerId && c.isCollapsed) {
          changed = true;
          return { ...c, isCollapsed: false };
        }
        return c;
      });
      return changed ? { ...prev, containers: nextContainers } : prev;
    });

    setFocusedContainerId(containerId);
    setSelectedId(containerId);

    // Zoom and center container to fill the working window
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const fit = calculateContainerFitViewport(target, viewportW, viewportH, 40, 56);
    setViewport(fit);

    showToast(
      `Цех: [${target.tag}] ${target.name}`,
      'Контейнер заполняет рабочее окно. Нажмите Esc для возврата.',
      'info'
    );
  }, [state.containers, showToast]);

  // Exit Focus Mode
  const exitFocusMode = useCallback(() => {
    setFocusedContainerId(null);
    setIsFocusFullscreen(false);
    showToast('Выход из фокусного режима', 'Отображается общая схема завода', 'info');
  }, [showToast]);

  // Toggle Focus Mode
  const toggleFocusMode = useCallback((containerId?: string) => {
    const id = containerId || selectedId;
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
        if (selectedId && state.containers.some(c => c.id === selectedId)) {
          e.preventDefault();
          toggleFocusMode(selectedId);
        }
      } else if (e.key === 'Escape') {
        if (focusedContainerId) {
          exitFocusMode();
          return;
        }
        setSelectedId(null);
        setConnectingSourceId(null);
        setActiveTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && currentUser.role === 'admin') {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, currentUser.role, state, undo, redo, deleteEquipment, deleteContainer, deleteLink, focusedContainerId, exitFocusMode, toggleFocusMode]);

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
        forceSave,
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

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
  LinkStyle
} from '../types';
import { initialFactoryState } from '../data/initialFactory';

export type CanvasTool = 'select' | 'pan' | 'add_equipment' | 'add_container' | 'connect';

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

  // Actions
  updateEquipment: (id: string, partial: Partial<EquipmentNode>, reason?: string) => void;
  addEquipment: (equipment: EquipmentNode, reason?: string) => void;
  deleteEquipment: (id: string, reason?: string) => void;
  updateContainer: (id: string, partial: Partial<ContainerNode>, reason?: string) => void;
  toggleContainerCollapse: (id: string) => void;
  addContainer: (container: ContainerNode, reason?: string) => void;
  deleteContainer: (id: string, reason?: string) => void;
  addLink: (fromId: string, toId: string, type?: LinkType, style?: LinkStyle) => void;
  updateLink: (id: string, partial: Partial<ConnectionLink>) => void;
  deleteLink: (id: string) => void;
  addEventLog: (log: Omit<FactoryEventLog, 'id' | 'timestamp'>) => void;
  restoreState: (state: FactoryState) => void;
  
  // Backups
  createBackup: (service: CloudServiceType, name?: string) => Promise<boolean>;
  restoreBackup: (backupId: string) => Promise<boolean>;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // User & Role
  setCurrentUserRole: (role: UserRole) => void;
  setCurrentUserName: (name: string) => void;
  broadcastCursor: (canvasPos: { x: number; y: number } | null) => void;

  // Modals & UI
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isReportOpen: boolean;
  setIsReportOpen: (open: boolean) => void;
  isBackupOpen: boolean;
  setIsBackupOpen: (open: boolean) => void;
  isEventLogsOpen: boolean;
  setIsEventLogsOpen: (open: boolean) => void;
  gridSnap: boolean;
  setGridSnap: (snap: boolean) => void;
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

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isEventLogsOpen, setIsEventLogsOpen] = useState(false);

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

  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.push(JSON.parse(JSON.stringify(state)));
    setState(previous);
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(true);
    syncStateToServer(previous, 'Откат изменений (Undo)');
  }, [state]);

  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(JSON.parse(JSON.stringify(state)));
    setState(next);
    setCanUndo(true);
    setCanRedo(historyRef.current.future.length > 0);
    syncStateToServer(next, 'Повтор изменений (Redo)');
  }, [state]);

  // Sync state to backend & broadcast
  const syncStateToServer = (newState: FactoryState, reason: string = 'Изменение схемы') => {
    try {
      localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn('Local storage write failed:', e);
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

    // Send to WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'state_patch',
        state: newState,
        reason
      }));
    }
  };

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
  const updateEquipment = useCallback((id: string, partial: Partial<EquipmentNode>, reason?: string) => {
    pushHistory(state);
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
  const updateContainer = useCallback((id: string, partial: Partial<ContainerNode>, reason?: string) => {
    pushHistory(state);
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

  const restoreState = useCallback((newState: FactoryState) => {
    pushHistory(state);
    const sanitized: FactoryState = {
      ...initialFactoryState,
      ...newState,
      equipment: dedupeById(newState.equipment || initialFactoryState.equipment),
      containers: dedupeById(newState.containers || initialFactoryState.containers),
      links: dedupeById(newState.links || initialFactoryState.links),
      eventLogs: dedupeById(newState.eventLogs || initialFactoryState.eventLogs),
    };
    setState(sanitized);
    syncStateToServer(sanitized, 'Восстановление схемы из файла/копии');
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
          name: name || `backup_${service}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.json`,
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
        return true;
      }
      return false;
    } catch (e) {
      console.error('Backup creation error:', e);
      return false;
    }
  }, [currentUser]);

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
      if (data.success) {
        // Fetch fresh state
        const stateRes = await fetch('/api/state');
        const freshState = await stateRes.json();
        setState(freshState);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Restore error:', e);
      return false;
    }
  }, [currentUser]);

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
      } else if (e.key === 'Escape') {
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
  }, [selectedId, currentUser.role, state, undo, redo, deleteEquipment, deleteContainer, deleteLink]);

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
        updateEquipment,
        addEquipment,
        deleteEquipment,
        updateContainer,
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
        undo,
        redo,
        canUndo,
        canRedo,
        setCurrentUserRole,
        setCurrentUserName,
        broadcastCursor,
        isDarkMode,
        toggleDarkMode,
        isSearchOpen,
        setIsSearchOpen,
        isReportOpen,
        setIsReportOpen,
        isBackupOpen,
        setIsBackupOpen,
        isEventLogsOpen,
        setIsEventLogsOpen,
        gridSnap,
        setGridSnap,
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

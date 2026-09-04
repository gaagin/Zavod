import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { initialFactoryState } from './src/data/initialFactory';
import { FactoryState, UserPresence, UserRole, CloudBackup } from './src/types';

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE_PATH = path.join(DATA_DIR, 'factory_state.json');

function dedupeById<T extends { id: string }>(items?: T[]): T[] {
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

// Load persisted state from disk or fallback to initial
function loadPersistedState(): FactoryState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const content = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && (Array.isArray(parsed.equipment) || Array.isArray(parsed.containers))) {
        console.log('[Server] Восстановлено автосохраненное состояние схемы с диска.');
        return {
          ...initialFactoryState,
          ...parsed,
          equipment: dedupeById(parsed.equipment || initialFactoryState.equipment),
          containers: dedupeById(parsed.containers || initialFactoryState.containers),
          links: dedupeById(parsed.links || initialFactoryState.links),
          eventLogs: dedupeById(parsed.eventLogs || initialFactoryState.eventLogs),
        };
      }
    }
  } catch (e) {
    console.warn('[Server] Не удалось загрузить автосохраненное состояние с диска:', e);
  }
  return {
    ...initialFactoryState,
    equipment: dedupeById(initialFactoryState.equipment),
    containers: dedupeById(initialFactoryState.containers),
    links: dedupeById(initialFactoryState.links),
    eventLogs: dedupeById(initialFactoryState.eventLogs),
  };
}

// In-memory & Disk Authoritative Factory State
let currentState: FactoryState = loadPersistedState();

let serverSaveTimer: NodeJS.Timeout | null = null;

// Multi-device server-side autosave: writes authoritative state to disk
function persistStateToDisk(immediate = false) {
  const doSave = () => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(currentState, null, 2), 'utf-8');
      console.log(`[Server AutoSave] Схема синхронизирована и сохранена на диск (${new Date().toLocaleTimeString('ru-RU')}). Узлов: ${currentState.equipment.length}`);
    } catch (err) {
      console.error('[Server AutoSave] Ошибка записи состояния на диск:', err);
    }
  };

  if (immediate) {
    if (serverSaveTimer) clearTimeout(serverSaveTimer);
    doSave();
  } else {
    if (serverSaveTimer) clearTimeout(serverSaveTimer);
    serverSaveTimer = setTimeout(doSave, 500);
  }
}

// Connected clients tracking
interface ConnectedClient {
  ws: WebSocket;
  id: string;
  user: UserPresence;
}

const clients = new Map<string, ConnectedClient>();

const userColors = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
];

function getRandomColor(): string {
  return userColors[Math.floor(Math.random() * userColors.length)];
}

const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(data: object, exceptClientId?: string) {
  const message = JSON.stringify(data);
  for (const [clientId, client] of clients.entries()) {
    if (exceptClientId && clientId === exceptClientId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

function getActiveUsersList(): UserPresence[] {
  return Array.from(clients.values()).map(c => c.user);
}

wss.on('connection', (ws: WebSocket) => {
  const clientId = 'user_' + Math.random().toString(36).substring(2, 9);
  const initialUser: UserPresence = {
    id: clientId,
    name: 'Инженер ' + clientId.slice(-3).toUpperCase(),
    role: 'admin',
    color: getRandomColor(),
    cursor: null,
    selectedId: null,
    lastSeen: Date.now(),
  };

  clients.set(clientId, { ws, id: clientId, user: initialUser });

  // Send initial state & user profile
  ws.send(JSON.stringify({
    type: 'init',
    clientId,
    user: initialUser,
    state: currentState,
    users: getActiveUsersList(),
  }));

  // Notify other users
  broadcast({
    type: 'user_joined',
    user: initialUser,
    users: getActiveUsersList(),
  }, clientId);

  ws.on('message', (rawMessage: string) => {
    try {
      const msg = JSON.parse(rawMessage.toString());

      if (msg.type === 'cursor') {
        const client = clients.get(clientId);
        if (client) {
          client.user.cursor = msg.cursor;
          client.user.lastSeen = Date.now();
          broadcast({
            type: 'cursor',
            clientId,
            cursor: msg.cursor,
            user: client.user,
          }, clientId);
        }
      } else if (msg.type === 'user_update') {
        const client = clients.get(clientId);
        if (client) {
          if (msg.name) client.user.name = msg.name;
          if (msg.role) client.user.role = msg.role as UserRole;
          if (msg.color) client.user.color = msg.color;
          broadcast({
            type: 'users_update',
            users: getActiveUsersList(),
          });
        }
      } else if (msg.type === 'state_patch') {
        // Delta or state update
        if (msg.state) {
          currentState = {
            ...currentState,
            ...msg.state,
            equipment: msg.state.equipment !== undefined ? dedupeById(msg.state.equipment) : currentState.equipment,
            containers: msg.state.containers !== undefined ? dedupeById(msg.state.containers) : currentState.containers,
            links: msg.state.links !== undefined ? dedupeById(msg.state.links) : currentState.links,
            eventLogs: msg.state.eventLogs !== undefined ? dedupeById(msg.state.eventLogs).slice(0, 200) : currentState.eventLogs,
            version: (currentState.version || 1) + 1,
            lastUpdated: new Date().toISOString(),
          };
          // Broadcast immediately to all other connected clients
          broadcast({
            type: 'state_updated',
            state: currentState,
            senderId: clientId,
            senderName: msg.senderName,
            reason: msg.reason || 'Изменение схемы',
            timestamp: Date.now(),
          }, clientId);
          // Confirm save to sending client
          ws.send(JSON.stringify({
            type: 'save_ack',
            timestamp: Date.now(),
            version: currentState.version,
          }));
          persistStateToDisk();
        }
      } else if (msg.type === 'sync_ping') {
        // User triggered a test sync impulse to other device
        const client = clients.get(clientId);
        broadcast({
          type: 'sync_ping',
          senderId: clientId,
          senderName: msg.senderName || client?.user?.name || 'Второе устройство',
          timestamp: Date.now(),
        }, clientId);
      } else if (msg.type === 'event_log') {
        if (msg.eventLog && msg.eventLog.id) {
          if (!currentState.eventLogs.some(l => l.id === msg.eventLog.id)) {
            currentState.eventLogs = [msg.eventLog, ...currentState.eventLogs.filter(l => l.id !== msg.eventLog.id)].slice(0, 200);
          }
          // Do not send back to sender clientId
          broadcast({
            type: 'event_log_added',
            eventLog: msg.eventLog,
          }, clientId);
          persistStateToDisk();
        }
      }
    } catch (e) {
      console.error('WebSocket message parse error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    broadcast({
      type: 'user_left',
      clientId,
      users: getActiveUsersList(),
    });
  });

  ws.on('error', (err) => {
    console.warn(`WS client error [${clientId}]:`, err.message);
  });
});

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    onlineUsers: clients.size,
    equipmentCount: currentState.equipment.length,
    containersCount: currentState.containers.length,
  });
});

app.get('/api/state', (req, res) => {
  res.json(currentState);
});

app.post('/api/state', (req, res) => {
  const incoming = (req.body && req.body.state) ? req.body.state : req.body;
  if (incoming && (incoming.equipment || incoming.containers)) {
    currentState = {
      ...currentState,
      ...incoming,
      equipment: incoming.equipment !== undefined ? dedupeById(incoming.equipment) : currentState.equipment,
      containers: incoming.containers !== undefined ? dedupeById(incoming.containers) : currentState.containers,
      links: incoming.links !== undefined ? dedupeById(incoming.links) : currentState.links,
      eventLogs: incoming.eventLogs !== undefined ? dedupeById(incoming.eventLogs).slice(0, 200) : currentState.eventLogs,
      version: (currentState.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
    };
    broadcast({
      type: 'state_updated',
      state: currentState,
      senderId: 'api',
      senderName: incoming.userName || 'REST API',
      reason: req.body.reason || 'Синхронизация через API',
      timestamp: Date.now(),
    });
    persistStateToDisk();
    res.json({ success: true, version: currentState.version, state: currentState });
  } else {
    res.status(400).json({ error: 'Invalid state format. Expected equipment or containers array.' });
  }
});

// Backup endpoints
app.get('/api/backups', (req, res) => {
  res.json(currentState.backups || []);
});

app.get('/api/backups/:id', (req, res) => {
  const backup = currentState.backups.find(b => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ error: 'Backup not found' });
  }
  try {
    const state = backup.payloadJson ? JSON.parse(backup.payloadJson) : null;
    res.json({ backup, state });
  } catch (e) {
    res.json({ backup, state: null });
  }
});

app.post('/api/backups', (req, res) => {
  const { service, provider, name, state: customState } = req.body;
  const stateToBackup = customState || currentState;
  const payloadStr = JSON.stringify({
    format: 'PromSchema.IO',
    version: stateToBackup.version || 1,
    exportedAt: new Date().toISOString(),
    state: stateToBackup
  });
  const sizeKb = Math.max(1, Math.round(Buffer.byteLength(payloadStr, 'utf8') / 1024));
  const serviceType = service || provider || 'yandex';

  const newBackup: CloudBackup = {
    id: 'bkp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    service: serviceType,
    name: name || `Резервная копия (${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')})`,
    timestamp: new Date().toISOString(),
    equipmentCount: (stateToBackup.equipment || []).length,
    containersCount: (stateToBackup.containers || []).length,
    linksCount: (stateToBackup.links || []).length,
    fileSizeKb: sizeKb,
    status: 'synced',
    payloadJson: payloadStr,
  };

  currentState.backups = [newBackup, ...(currentState.backups || [])];
  
  // Log event
  const log = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    targetId: newBackup.id,
    targetName: newBackup.name,
    targetType: 'system' as const,
    eventType: 'backup' as const,
    severity: 'success' as const,
    description: `Создана резервная копия схемы в хранилище (${String(newBackup.service).toUpperCase()})`,
    userName: req.body.userName || 'Инженер АСУ',
    userRole: (req.body.userRole || 'admin') as UserRole,
  };
  currentState.eventLogs = [log, ...currentState.eventLogs].slice(0, 200);

  broadcast({
    type: 'state_updated',
    state: currentState,
    senderId: 'api',
    reason: 'Создан бэкап',
  });
  persistStateToDisk(true);

  res.json({ success: true, backup: newBackup });
});

app.delete('/api/backups/:id', (req, res) => {
  const targetId = req.params.id;
  const beforeCount = (currentState.backups || []).length;
  currentState.backups = (currentState.backups || []).filter(b => b.id !== targetId);
  if (currentState.backups.length !== beforeCount) {
    broadcast({
      type: 'state_updated',
      state: currentState,
      senderId: 'api',
      reason: 'Удалена копия',
    });
    persistStateToDisk();
  }
  res.json({ success: true, count: currentState.backups.length });
});

app.post('/api/backups/:id/restore', (req, res) => {
  const backup = currentState.backups.find(b => b.id === req.params.id);
  if (!backup || !backup.payloadJson) {
    return res.status(404).json({ error: 'Backup not found or payload empty' });
  }

  try {
    const rawParsed = JSON.parse(backup.payloadJson);
    const restored = rawParsed.state || rawParsed;
    const existingBackups = currentState.backups;
    currentState = {
      ...initialFactoryState,
      ...restored,
      equipment: dedupeById(restored.equipment || initialFactoryState.equipment),
      containers: dedupeById(restored.containers || initialFactoryState.containers),
      links: dedupeById(restored.links || initialFactoryState.links),
      eventLogs: dedupeById(restored.eventLogs || currentState.eventLogs).slice(0, 200),
      backups: existingBackups, // keep backup history
      version: (currentState.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
    };

    // Log restore event
    const log = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      targetId: backup.id,
      targetName: backup.name,
      targetType: 'system' as const,
      eventType: 'restore' as const,
      severity: 'warning' as const,
      description: `Выполнено восстановление схемы предприятия из резервной копии "${backup.name}"`,
      userName: req.body.userName || 'Инженер АСУ',
      userRole: (req.body.userRole || 'admin') as UserRole,
    };
    currentState.eventLogs = [log, ...currentState.eventLogs].slice(0, 200);

    broadcast({
      type: 'state_updated',
      state: currentState,
      senderId: 'api',
      reason: 'Восстановление из бэкапа',
    });
    persistStateToDisk(true);

    res.json({ success: true, message: 'Restored successfully', state: currentState, version: currentState.version });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore state from backup payload' });
  }
});

// Vite middleware in dev, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server and WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

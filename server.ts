import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { initialFactoryState } from './src/data/initialFactory';
import { FactoryState, UserPresence, UserRole, CloudBackup } from './src/types';

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

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

// In-memory Authoritative Factory State
let currentState: FactoryState = {
  ...initialFactoryState,
  equipment: dedupeById(initialFactoryState.equipment),
  containers: dedupeById(initialFactoryState.containers),
  links: dedupeById(initialFactoryState.links),
  eventLogs: dedupeById(initialFactoryState.eventLogs),
};

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
            equipment: dedupeById(msg.state.equipment || currentState.equipment),
            containers: dedupeById(msg.state.containers || currentState.containers),
            links: dedupeById(msg.state.links || currentState.links),
            eventLogs: dedupeById(msg.state.eventLogs || currentState.eventLogs).slice(0, 200),
            version: (currentState.version || 1) + 1,
            lastUpdated: new Date().toISOString(),
          };
          broadcast({
            type: 'state_updated',
            state: currentState,
            senderId: clientId,
            reason: msg.reason || 'Изменение схемы',
          }, clientId);
        }
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
  if (req.body && req.body.equipment) {
    currentState = {
      ...req.body,
      version: (currentState.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
    };
    broadcast({
      type: 'state_updated',
      state: currentState,
      senderId: 'api',
      reason: 'Синхронизация через API',
    });
    res.json({ success: true, version: currentState.version });
  } else {
    res.status(400).json({ error: 'Invalid state format' });
  }
});

// Backup endpoints
app.get('/api/backups', (req, res) => {
  res.json(currentState.backups);
});

app.post('/api/backups', (req, res) => {
  const { service, name } = req.body;
  const payloadStr = JSON.stringify(currentState);
  const sizeKb = Math.round(Buffer.byteLength(payloadStr, 'utf8') / 1024);

  const newBackup: CloudBackup = {
    id: 'bkp_' + Date.now(),
    service: service || 'google_drive',
    name: name || `backup_${Date.now()}.json`,
    timestamp: new Date().toISOString(),
    equipmentCount: currentState.equipment.length,
    containersCount: currentState.containers.length,
    linksCount: currentState.links.length,
    fileSizeKb: sizeKb,
    status: 'synced',
    payloadJson: payloadStr,
  };

  currentState.backups = [newBackup, ...currentState.backups];
  
  // Log event
  const log = {
    id: 'log_' + Date.now(),
    timestamp: new Date().toISOString(),
    targetId: newBackup.id,
    targetName: newBackup.name,
    targetType: 'system' as const,
    eventType: 'backup' as const,
    severity: 'success' as const,
    description: `Создана резервная копия схемы в облако (${newBackup.service.toUpperCase()})`,
    userName: req.body.userName || 'Системный администратор',
    userRole: (req.body.userRole || 'admin') as UserRole,
  };
  currentState.eventLogs = [log, ...currentState.eventLogs];

  broadcast({
    type: 'state_updated',
    state: currentState,
    senderId: 'api',
    reason: 'Создан бэкап',
  });

  res.json({ success: true, backup: newBackup });
});

app.post('/api/backups/:id/restore', (req, res) => {
  const backup = currentState.backups.find(b => b.id === req.params.id);
  if (!backup || !backup.payloadJson) {
    return res.status(404).json({ error: 'Backup not found or payload empty' });
  }

  try {
    const restored = JSON.parse(backup.payloadJson);
    const existingBackups = currentState.backups;
    currentState = {
      ...restored,
      backups: existingBackups, // keep backup history
      version: (currentState.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
    };

    // Log restore event
    const log = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      targetId: backup.id,
      targetName: backup.name,
      targetType: 'system' as const,
      eventType: 'restore' as const,
      severity: 'warning' as const,
      description: `Выполнено восстановление схемы предприятия из резервной копии "${backup.name}"`,
      userName: req.body.userName || 'Системный администратор',
      userRole: (req.body.userRole || 'admin') as UserRole,
    };
    currentState.eventLogs = [log, ...currentState.eventLogs];

    broadcast({
      type: 'state_updated',
      state: currentState,
      senderId: 'api',
      reason: 'Восстановление из бэкапа',
    });

    res.json({ success: true, message: 'Restored successfully', version: currentState.version });
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

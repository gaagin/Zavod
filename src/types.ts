export type EquipmentStatus = 
  | 'normal'       // В норме
  | 'warning'      // Предупреждение
  | 'critical'     // Авария
  | 'maintenance'  // Техобслуживание
  | 'idle'         // Простой
  | 'standby';     // Резерв

export type EquipmentType =
  | 'cnc'          // ЧПУ станок
  | 'pump'         // Насос / Станция
  | 'motor'        // Электродвигатель
  | 'conveyor'     // Конвейер
  | 'transformer'  // Трансформатор
  | 'robot'        // Робот-манипулятор
  | 'compressor'   // Компрессор
  | 'furnace'      // Печь / Термоблок
  | 'sensor'       // Датчик / АСУ
  | 'cabinet'      // Шкаф управления (ШУ/PLC)
  | 'custom';      // Другое оборудование

export interface CustomProperty {
  id: string;
  name: string;
  value: string | number;
  type: 'text' | 'number' | 'date' | 'boolean';
  unit?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskType = 'maintenance' | 'repair' | 'inspection' | 'setup' | 'other';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface EquipmentTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type?: TaskType;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  createdBy?: string;
  checklist?: TaskChecklistItem[];
  linkUrl?: string; // Внешняя ссылка на регламент, тикет, документацию или внешний сервис
  url?: string;     // Алиас внешней ссылки
}

export interface EquipmentNode {
  id: string;
  type: 'equipment';
  name: string;
  tag: string;
  equipmentType: EquipmentType;
  status: EquipmentStatus;
  parentId?: string | null; // Id родительского контейнера или родительского оборудования
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed?: boolean;
  collapsedWidth?: number;
  collapsedHeight?: number;
  properties: CustomProperty[];
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  barcode?: string;      // Barkod
  barkod?: string;       // Barkod alias
  stockCode?: string;    // Stok kod
  stokKod?: string;      // Stok kod alias
  powerKw?: number;
  voltageV?: number;
  commissionDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  notes?: string;
  color?: string;
  linkUrl?: string;      // Ссылка на внешний ресурс, документацию, SCADA или веб-интерфейс
  url?: string;          // Алиас ссылки
  elementLinks?: ElementReference[];
  tasks?: EquipmentTask[];
}

export interface ElementReference {
  id: string;
  targetId: string;
  relationship?: string;
  notes?: string;
}

export interface ContainerNode {
  id: string;
  type: 'container';
  name: string;
  tag: string;
  parentId?: string | null; // Для глубокой вложенности (контейнер в контейнере)
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed: boolean;
  collapsedWidth: number;
  collapsedHeight: number;
  color: string;
  description?: string;
  manager?: string;
  linkUrl?: string;      // Ссылка на внешний ресурс, документацию цеха, SCADA или дашборд
  url?: string;          // Алиас ссылки
  elementLinks?: ElementReference[];
}

export type CanvasNode = EquipmentNode | ContainerNode;

export interface ElementClipboardData {
  equipment: EquipmentNode[];
  containers: ContainerNode[];
  links: ConnectionLink[];
  copiedAt?: number;
}

export type LinkType = 'power' | 'pipe' | 'conveyor' | 'signal';
export type LinkStyle = 'orthogonal' | 'curved' | 'straight';
export type LinkDirection = 'forward' | 'bidirectional' | 'none';

export interface ConnectionLink {
  id: string;
  fromId: string;
  toId: string;
  type: LinkType;
  style: LinkStyle;
  direction: LinkDirection;
  label?: string;
  color?: string;
  animated?: boolean;
  linkUrl?: string;      // Ссылка на документацию трассы, схему или спецификацию
  url?: string;          // Алиас ссылки
}

export type UserRole = 'admin' | 'operator' | 'maintenance' | 'viewer';

export interface UserPresence {
  id: string;
  name: string;
  role: UserRole;
  color: string;
  cursor?: { x: number; y: number } | null;
  selectedId?: string | null;
  lastSeen: number;
}

export type EventSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface FactoryEventLog {
  id: string;
  timestamp: string;
  targetId: string;
  targetName: string;
  targetType: 'equipment' | 'container' | 'link' | 'system';
  eventType: 'status_change' | 'property_edit' | 'maintenance' | 'alert' | 'created' | 'deleted' | 'backup' | 'restore';
  severity: EventSeverity;
  description: string;
  userName: string;
  userRole: UserRole;
}

export type CloudServiceType = 'google_drive' | 'yandex_disk' | 'dropbox' | 'aws_s3';

export interface CloudBackup {
  id: string;
  service: CloudServiceType;
  name: string;
  timestamp: string;
  equipmentCount: number;
  containersCount: number;
  linksCount: number;
  fileSizeKb: number;
  status: 'synced' | 'pending' | 'failed';
  payloadJson: string;
}

export interface FactoryState {
  equipment: EquipmentNode[];
  containers: ContainerNode[];
  links: ConnectionLink[];
  eventLogs: FactoryEventLog[];
  backups: CloudBackup[];
  version: number;
  lastUpdated: string;
}

export interface AutoSaveConfig {
  enabled: boolean;
  autoSnapshots: boolean;
  snapshotIntervalMinutes: number;
  saveToServer: boolean;
  targetFolderName?: string;
  targetFilename?: string;
  watchFolderFile?: boolean;
}

export interface FolderFileChangeNotice {
  filename: string;
  timestamp: number;
  summary: string;
  source: 'folder' | 'server_disk' | 'remote_device';
  equipmentCount?: number;
  containersCount?: number;
}



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

export interface EquipmentNode {
  id: string;
  type: 'equipment';
  name: string;
  tag: string;
  equipmentType: EquipmentType;
  status: EquipmentStatus;
  parentId?: string | null; // Id родительского контейнера
  x: number;
  y: number;
  width: number;
  height: number;
  properties: CustomProperty[];
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  powerKw?: number;
  voltageV?: number;
  commissionDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  notes?: string;
  color?: string;
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
}

export type CanvasNode = EquipmentNode | ContainerNode;

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
}


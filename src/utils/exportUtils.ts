import { jsPDF } from 'jspdf';
import { FactoryState, EquipmentNode, ContainerNode, ConnectionLink, FactoryEventLog } from '../types';

/**
 * Returns full path of an equipment or container in the hierarchy
 * e.g., "Цех №1 > Линия А > Шкаф АСУ"
 */
export function getHierarchyPath(nodeId: string, containers: ContainerNode[]): string {
  const containerMap = new Map(containers.map(c => [c.id, c]));
  const path: string[] = [];
  let currentId: string | null | undefined = nodeId;

  while (currentId) {
    const cont = containerMap.get(currentId);
    if (cont) {
      path.unshift(cont.name);
      currentId = cont.parentId;
    } else {
      break;
    }
  }

  return path.length > 0 ? path.join(' / ') : 'Корень завода';
}

/**
 * Helper to download any string content as a file with fallback
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string): boolean {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
    return true;
  } catch (err) {
    console.error('File download failed:', err);
    return false;
  }
}

/**
 * Export equipment registry to CSV format (Excel-compatible with UTF-8 BOM)
 */
export function exportToCSV(factory: FactoryState, targetContainerId?: string): boolean {
  const headers = [
    'ID',
    'Инв. Номер (Тэг)',
    'Наименование',
    'Тип оборудования',
    'Статус',
    'Расположение (Цех / Участок)',
    'Модель',
    'Серийный номер',
    'Производитель',
    'Мощность (кВт)',
    'Напряжение (В)',
    'Дата ввода',
    'Посл. ТО',
    'След. ТО',
    'Дополнительные параметры',
    'Примечания'
  ];

  const statusLabels: Record<string, string> = {
    normal: 'В норме',
    warning: 'Предупреждение',
    critical: 'Авария',
    maintenance: 'Техобслуживание',
    idle: 'Простой',
    standby: 'Резерв'
  };

  const typeLabels: Record<string, string> = {
    cnc: 'ЧПУ станок',
    pump: 'Насос / Станция',
    motor: 'Электродвигатель',
    conveyor: 'Конвейер',
    transformer: 'Трансформатор',
    robot: 'Робот-манипулятор',
    compressor: 'Компрессор',
    furnace: 'Печь / Термоблок',
    sensor: 'Датчик / АСУ',
    cabinet: 'Шкаф управления',
    custom: 'Оборудование'
  };

  const filteredEquipment = (factory.equipment || []).filter(eq => {
    if (!targetContainerId || targetContainerId === 'all') return true;
    let currentParent = eq.parentId;
    while (currentParent) {
      if (currentParent === targetContainerId) return true;
      const parentCont = (factory.containers || []).find(c => c.id === currentParent);
      currentParent = parentCont ? parentCont.parentId : null;
    }
    return false;
  });

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
    return `"${str}"`;
  };

  const rows = filteredEquipment.map(eq => {
    const location = eq.parentId ? getHierarchyPath(eq.parentId, factory.containers || []) : 'Корень предприятия';
    const customPropsStr = (eq.properties || [])
      .map(p => `${p.name}: ${p.value}${p.unit ? ' ' + p.unit : ''}`)
      .join('; ');

    const fields = [
      eq.id,
      eq.tag,
      eq.name,
      typeLabels[eq.equipmentType] || eq.equipmentType,
      statusLabels[eq.status] || eq.status,
      location,
      eq.model || '',
      eq.serialNumber || '',
      eq.manufacturer || '',
      eq.powerKw !== undefined ? String(eq.powerKw) : '',
      eq.voltageV !== undefined ? String(eq.voltageV) : '',
      eq.commissionDate || '',
      eq.lastMaintenanceDate || '',
      eq.nextMaintenanceDate || '',
      customPropsStr,
      eq.notes || ''
    ];

    return fields.map(escapeCSV).join(';');
  });

  // UTF-8 BOM for correct Excel rendering of Russian Cyrillic
  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(';'), ...rows].join('\r\n');
  const filename = `reestr_oborudovaniya_${new Date().toISOString().slice(0, 10)}.csv`;
  return triggerFileDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Standardized Project Export Schema format
 */
export interface SerializedProjectFile {
  format: 'PromSchema.IO';
  version: number;
  exportedAt: string;
  summary: {
    equipmentCount: number;
    containersCount: number;
    linksCount: number;
    eventsCount: number;
  };
  state: FactoryState;
}

/**
 * Export full JSON project to downloadable file
 */
export function exportToJSON(factory: FactoryState): boolean {
  const projectData: SerializedProjectFile = {
    format: 'PromSchema.IO',
    version: factory.version || 1,
    exportedAt: new Date().toISOString(),
    summary: {
      equipmentCount: (factory.equipment || []).length,
      containersCount: (factory.containers || []).length,
      linksCount: (factory.links || []).length,
      eventsCount: (factory.eventLogs || []).length,
    },
    state: factory
  };

  const jsonStr = JSON.stringify(projectData, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `promschema_project_${dateStr}.json`;
  return triggerFileDownload(jsonStr, filename, 'application/json');
}

/**
 * Copy JSON project to clipboard with fallback
 */
export async function copyProjectJSONToClipboard(factory: FactoryState): Promise<boolean> {
  const projectData: SerializedProjectFile = {
    format: 'PromSchema.IO',
    version: factory.version || 1,
    exportedAt: new Date().toISOString(),
    summary: {
      equipmentCount: (factory.equipment || []).length,
      containersCount: (factory.containers || []).length,
      linksCount: (factory.links || []).length,
      eventsCount: (factory.eventLogs || []).length,
    },
    state: factory
  };
  const jsonStr = JSON.stringify(projectData, null, 2);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(jsonStr);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard writeText failed, using fallback:', e);
  }

  // Fallback textarea method
  try {
    const textArea = document.createElement('textarea');
    textArea.value = jsonStr;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

/**
 * Robust parser & validator for imported project JSON files
 */
export function parseAndValidateProject(rawText: string): {
  success: boolean;
  state?: FactoryState;
  error?: string;
  stats?: {
    equipmentCount: number;
    containersCount: number;
    linksCount: number;
  };
} {
  try {
    if (!rawText || !rawText.trim()) {
      return { success: false, error: 'Файл пуст или не содержит данных' };
    }

    const parsed = JSON.parse(rawText);

    // Unpack various wrapping layers
    let target: any = parsed;
    if (parsed.state) {
      target = parsed.state;
    } else if (parsed.payloadJson && typeof parsed.payloadJson === 'string') {
      try {
        const nested = JSON.parse(parsed.payloadJson);
        target = nested.state || nested;
      } catch (e) {
        // ignore
      }
    } else if (parsed.project) {
      target = parsed.project;
    } else if (parsed.data) {
      target = parsed.data;
    }

    // Support bare array of equipment items
    if (Array.isArray(target)) {
      target = { equipment: target, containers: [], links: [] };
    }

    if (!target || typeof target !== 'object') {
      return { success: false, error: 'Неверный формат структуры данных' };
    }

    const rawEquipment = Array.isArray(target.equipment) ? target.equipment : [];
    const rawContainers = Array.isArray(target.containers) ? target.containers : [];
    const rawLinks = Array.isArray(target.links) ? target.links : [];
    const rawLogs = Array.isArray(target.eventLogs) ? target.eventLogs : [];
    const rawBackups = Array.isArray(target.backups) ? target.backups : [];

    if (rawEquipment.length === 0 && rawContainers.length === 0) {
      return { 
        success: false, 
        error: 'В файле не обнаружено оборудования или цехов для импорта' 
      };
    }

    // Sanitize & normalize equipment
    const seenEq = new Set<string>();
    const sanitizedEquipment: EquipmentNode[] = [];
    rawEquipment.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      const id = String(item.id || `eq_import_${idx}_${Date.now()}`);
      if (seenEq.has(id)) return;
      seenEq.add(id);

      sanitizedEquipment.push({
        id,
        type: 'equipment',
        tag: String(item.tag || `EQ-${idx + 1}`),
        name: String(item.name || 'Оборудование'),
        equipmentType: item.equipmentType || 'custom',
        status: item.status || 'normal',
        x: Number.isFinite(Number(item.x)) ? Number(item.x) : 100 + (idx % 5) * 180,
        y: Number.isFinite(Number(item.y)) ? Number(item.y) : 100 + Math.floor(idx / 5) * 140,
        width: Number.isFinite(Number(item.width)) ? Number(item.width) : 160,
        height: Number.isFinite(Number(item.height)) ? Number(item.height) : 100,
        parentId: item.parentId ? String(item.parentId) : null,
        model: item.model ? String(item.model) : undefined,
        serialNumber: item.serialNumber ? String(item.serialNumber) : undefined,
        manufacturer: item.manufacturer ? String(item.manufacturer) : undefined,
        powerKw: Number.isFinite(Number(item.powerKw)) ? Number(item.powerKw) : undefined,
        voltageV: Number.isFinite(Number(item.voltageV)) ? Number(item.voltageV) : undefined,
        commissionDate: item.commissionDate ? String(item.commissionDate) : undefined,
        lastMaintenanceDate: item.lastMaintenanceDate ? String(item.lastMaintenanceDate) : undefined,
        nextMaintenanceDate: item.nextMaintenanceDate ? String(item.nextMaintenanceDate) : undefined,
        properties: Array.isArray(item.properties) ? item.properties : [],
        notes: item.notes ? String(item.notes) : undefined,
        color: item.color ? String(item.color) : undefined,
      });
    });

    // Sanitize & normalize containers
    const seenCont = new Set<string>();
    const sanitizedContainers: ContainerNode[] = [];
    rawContainers.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      const id = String(item.id || `cont_import_${idx}_${Date.now()}`);
      if (seenCont.has(id)) return;
      seenCont.add(id);

      sanitizedContainers.push({
        id,
        type: 'container',
        tag: String(item.tag || `C-${idx + 1}`),
        name: String(item.name || `Цех №${idx + 1}`),
        x: Number.isFinite(Number(item.x)) ? Number(item.x) : 50 + (idx % 3) * 450,
        y: Number.isFinite(Number(item.y)) ? Number(item.y) : 50 + Math.floor(idx / 3) * 350,
        width: Number.isFinite(Number(item.width)) ? Math.max(200, Number(item.width)) : 400,
        height: Number.isFinite(Number(item.height)) ? Math.max(150, Number(item.height)) : 300,
        parentId: item.parentId ? String(item.parentId) : null,
        isCollapsed: Boolean(item.isCollapsed),
        collapsedWidth: Number.isFinite(Number(item.collapsedWidth)) ? Number(item.collapsedWidth) : 200,
        collapsedHeight: Number.isFinite(Number(item.collapsedHeight)) ? Number(item.collapsedHeight) : 60,
        color: item.color || '#3b82f6',
        description: item.description ? String(item.description) : undefined,
        manager: item.manager ? String(item.manager) : undefined,
      });
    });

    // Sanitize & normalize links
    const seenLinks = new Set<string>();
    const sanitizedLinks: ConnectionLink[] = [];
    rawLinks.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      const id = String(item.id || `link_import_${idx}_${Date.now()}`);
      const fromId = String(item.fromId || '');
      const toId = String(item.toId || '');
      if (seenLinks.has(id)) return;
      seenLinks.add(id);

      sanitizedLinks.push({
        id,
        fromId,
        toId,
        type: item.type || item.linkType || 'power',
        style: item.style || 'orthogonal',
        direction: item.direction || 'forward',
        label: item.label ? String(item.label) : undefined,
        animated: Boolean(item.animated),
        color: item.color,
      });
    });

    // Sanitize event logs
    const sanitizedLogs: FactoryEventLog[] = [];
    const seenLogs = new Set<string>();
    rawLogs.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      const id = String(item.id || `log_import_${idx}_${Date.now()}`);
      if (seenLogs.has(id)) return;
      seenLogs.add(id);

      sanitizedLogs.push({
        id,
        timestamp: item.timestamp || new Date().toISOString(),
        targetId: item.targetId || 'system',
        targetName: item.targetName || 'Элемент',
        targetType: item.targetType || 'system',
        eventType: item.eventType || 'status_change',
        severity: item.severity || 'info',
        description: item.description || 'Импортированная запись журнала',
        userName: item.userName || 'Система',
        userRole: item.userRole || 'admin'
      });
    });

    const validatedState: FactoryState = {
      equipment: sanitizedEquipment,
      containers: sanitizedContainers,
      links: sanitizedLinks,
      eventLogs: sanitizedLogs.slice(0, 200),
      backups: rawBackups,
      version: Number(target.version || 1) + 1,
      lastUpdated: new Date().toISOString()
    };

    return {
      success: true,
      state: validatedState,
      stats: {
        equipmentCount: sanitizedEquipment.length,
        containersCount: sanitizedContainers.length,
        linksCount: sanitizedLinks.length,
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Синтаксическая ошибка JSON: ${err.message || 'Не удалось разобрать файл'}`
    };
  }
}

/**
 * Export comprehensive Industrial Equipment Report to PDF
 * Uses High-Resolution Canvas rendering for 100% crystal-clear Russian Cyrillic typography
 */
export async function exportToPDF(factory: FactoryState, targetContainerId?: string): Promise<boolean> {
  try {
    const filteredEquipment = (factory.equipment || []).filter(eq => {
      if (!targetContainerId || targetContainerId === 'all') return true;
      let currentParent = eq.parentId;
      while (currentParent) {
        if (currentParent === targetContainerId) return true;
        const parentCont = (factory.containers || []).find(c => c.id === currentParent);
        currentParent = parentCont ? parentCont.parentId : null;
      }
      return false;
    });

    const totalEquipment = filteredEquipment.length;
    const normalCount = filteredEquipment.filter(e => e.status === 'normal').length;
    const warningCount = filteredEquipment.filter(e => e.status === 'warning').length;
    const criticalCount = filteredEquipment.filter(e => e.status === 'critical').length;
    const maintenanceCount = filteredEquipment.filter(e => e.status === 'maintenance').length;
    const totalPower = filteredEquipment.reduce((sum, e) => sum + (e.powerKw || 0), 0);
    const operationalRate = totalEquipment > 0 ? Math.round((normalCount / totalEquipment) * 100) : 100;

    // We render an A4 page onto an HTML5 Canvas (1240 x 1754 at ~150 DPI)
    // Canvas supports all browser-native Russian fonts flawlessly!
    const canvasWidth = 1240;
    const canvasHeight = 1754;

    const renderPage = (items: EquipmentNode[], pageNum: number, totalPages: number): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Header Banner
      ctx.fillStyle = '#0F172A'; // Slate-900
      ctx.fillRect(0, 0, canvasWidth, 180);

      // Accent top line
      ctx.fillStyle = '#0284C7'; // Sky-600
      ctx.fillRect(0, 0, canvasWidth, 10);

      // Header Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillText('ПАСПОРТ ОБОРУДОВАНИЯ И АУДИТ ПРЕДПРИЯТИЯ', 60, 75);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '20px "Segoe UI", Roboto, Arial, sans-serif';
      const dateStr = new Date().toLocaleDateString('ru-RU', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      ctx.fillText(`Система диспетчеризации ПромСхема.IO  |  Дата отчета: ${dateStr}`, 60, 115);
      ctx.fillText(`Всего единиц: ${totalEquipment}  |  Готовность оборудования: ${operationalRate}%  |  Суммарная нагрузка: ${totalPower.toFixed(1)} кВт`, 60, 145);

      let curY = 230;

      // Only on first page: render KPI metric blocks & workshops overview
      if (pageNum === 1) {
        const cardW = 260;
        const cardH = 110;
        const cards = [
          { title: 'В ШТАТНОЙ НОРМЕ', count: normalCount, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          { title: 'ПРЕДУПРЕЖДЕНИЕ', count: warningCount, color: '#D97706', bg: '#FEFCE8', border: '#FEF08A' },
          { title: 'АВАРИЙНЫЙ СТАТУС', count: criticalCount, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
          { title: 'ТЕХОБСЛУЖИВАНИЕ', count: maintenanceCount, color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
        ];

        cards.forEach((c, idx) => {
          const cx = 60 + idx * (cardW + 26);
          ctx.fillStyle = c.bg;
          ctx.beginPath();
          ctx.roundRect(cx, curY, cardW, cardH, 12);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = c.border;
          ctx.stroke();

          ctx.fillStyle = c.color;
          ctx.font = 'bold 15px "Segoe UI", Roboto, Arial, sans-serif';
          ctx.fillText(c.title, cx + 20, curY + 36);

          ctx.font = 'bold 38px "Segoe UI", Roboto, Arial, sans-serif';
          ctx.fillText(String(c.count), cx + 20, curY + 86);
        });

        curY += 160;

        // Container structure title
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 24px "Segoe UI", Roboto, Arial, sans-serif';
        ctx.fillText('1. Структура производственных цехов и участков', 60, curY);
        curY += 30;

        const mainContainers = (factory.containers || []).slice(0, 4);
        mainContainers.forEach((cont, i) => {
          const childCount = (factory.equipment || []).filter(e => e.parentId === cont.id).length;
          const path = cont.parentId ? getHierarchyPath(cont.parentId, factory.containers || []) : 'Главный корпус';

          ctx.fillStyle = '#F8FAFC';
          ctx.beginPath();
          ctx.roundRect(60, curY, 1120, 46, 8);
          ctx.fill();
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#1E293B';
          ctx.font = 'bold 18px "Segoe UI", Roboto, Arial, sans-serif';
          ctx.fillText(`[${cont.tag}] ${cont.name}`, 80, curY + 30);

          ctx.fillStyle = '#64748B';
          ctx.font = '16px "Segoe UI", Roboto, Arial, sans-serif';
          ctx.fillText(`Родитель: ${path}  |  Оборудования внутри: ${childCount} ед.`, 680, curY + 30);

          curY += 56;
        });

        curY += 20;
      }

      // Section 2: Table Header
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillText(pageNum === 1 ? '2. Реестр технологического оборудования' : '2. Реестр оборудования (продолжение)', 60, curY);
      curY += 30;

      // Table Header Row
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(60, curY, 1120, 44);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillText('ТЭГ / ИНВ.№', 75, curY + 28);
      ctx.fillText('НАИМЕНОВАНИЕ / МОДЕЛЬ', 240, curY + 28);
      ctx.fillText('ЦЕХ / ЛОКАЦИЯ', 620, curY + 28);
      ctx.fillText('СТАТУС', 880, curY + 28);
      ctx.fillText('МОЩНОСТЬ', 1030, curY + 28);
      curY += 46;

      // Rows
      items.forEach((eq, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        ctx.fillStyle = rowBg;
        ctx.fillRect(60, curY, 1120, 42);

        // Border bottom
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(60, curY + 41, 1120, 1);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 16px "Segoe UI", Roboto, monospace';
        ctx.fillText(eq.tag, 75, curY + 26);

        ctx.font = '15px "Segoe UI", Roboto, Arial, sans-serif';
        const nameStr = eq.name.length > 36 ? eq.name.slice(0, 34) + '...' : eq.name;
        ctx.fillText(nameStr, 240, curY + 26);

        const loc = eq.parentId ? getHierarchyPath(eq.parentId, factory.containers || []) : 'Завод';
        const locStr = loc.length > 26 ? loc.slice(0, 24) + '...' : loc;
        ctx.fillStyle = '#64748B';
        ctx.fillText(locStr, 620, curY + 26);

        // Status pill
        const statusMap: Record<string, { label: string; color: string; bg: string }> = {
          normal: { label: 'НОРМА', color: '#16A34A', bg: '#DCFCE7' },
          warning: { label: 'ВНИМАНИЕ', color: '#D97706', bg: '#FEF3C7' },
          critical: { label: 'АВАРИЯ', color: '#DC2626', bg: '#FEE2E2' },
          maintenance: { label: 'ТО', color: '#4F46E5', bg: '#E0E7FF' },
        };
        const s = statusMap[eq.status] || { label: eq.status, color: '#475569', bg: '#F1F5F9' };

        ctx.fillStyle = s.bg;
        ctx.beginPath();
        ctx.roundRect(880, curY + 8, 120, 26, 6);
        ctx.fill();

        ctx.fillStyle = s.color;
        ctx.font = 'bold 13px "Segoe UI", Roboto, Arial, sans-serif';
        ctx.fillText(s.label, 900, curY + 25);

        ctx.fillStyle = '#334155';
        ctx.font = '15px "Segoe UI", Roboto, monospace';
        ctx.fillText(eq.powerKw ? `${eq.powerKw} кВт` : '—', 1030, curY + 26);

        curY += 42;
      });

      // Footer
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(60, canvasHeight - 70, 1120, 1);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillText(`ПромСхема.IO  •  Страница ${pageNum} из ${totalPages}`, 60, canvasHeight - 35);
      ctx.fillText('Конфиденциальный технический документ предприятия', 750, canvasHeight - 35);

      return canvas;
    };

    // Calculate pages
    const itemsPerPageFirst = 14;
    const itemsPerPageNext = 28;

    const pagesItems: EquipmentNode[][] = [];
    if (filteredEquipment.length <= itemsPerPageFirst) {
      pagesItems.push(filteredEquipment);
    } else {
      pagesItems.push(filteredEquipment.slice(0, itemsPerPageFirst));
      let remaining = filteredEquipment.slice(itemsPerPageFirst);
      while (remaining.length > 0) {
        pagesItems.push(remaining.slice(0, itemsPerPageNext));
        remaining = remaining.slice(itemsPerPageNext);
      }
    }

    const totalPages = pagesItems.length;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    pagesItems.forEach((items, idx) => {
      if (idx > 0) {
        doc.addPage();
      }
      const pageCanvas = renderPage(items, idx + 1, totalPages);
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`promschema_audit_report_${dateStr}.pdf`);
    return true;
  } catch (err) {
    console.error('PDF export failed:', err);
    return false;
  }
}

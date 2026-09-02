import { jsPDF } from 'jspdf';
import { FactoryState, EquipmentNode, ContainerNode } from '../types';

/**
 * Returns full path of an equipment or container in the hierarchy
 * e.g., "Цех №1 > Линия А > Шкаф АСУ"
 */
export function getHierarchyPath(nodeId: string, containers: ContainerNode[]): string {
  const containerMap = new Map(containers.map(c => [c.id, c]));
  const path: string[] = [];
  let currentId: string | null | undefined = nodeId;

  // If node is an equipment, find its parent first
  // (caller might pass parentId)
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
 * Export equipment registry to CSV format
 */
export function exportToCSV(factory: FactoryState, targetContainerId?: string): void {
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

  const filteredEquipment = factory.equipment.filter(eq => {
    if (!targetContainerId || targetContainerId === 'all') return true;
    let currentParent = eq.parentId;
    while (currentParent) {
      if (currentParent === targetContainerId) return true;
      const parentCont = factory.containers.find(c => c.id === currentParent);
      currentParent = parentCont ? parentCont.parentId : null;
    }
    return false;
  });

  const rows = filteredEquipment.map(eq => {
    const location = eq.parentId ? getHierarchyPath(eq.parentId, factory.containers) : 'Корень предприятия';
    const customPropsStr = eq.properties
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
      eq.powerKw !== undefined ? eq.powerKw.toString() : '',
      eq.voltageV !== undefined ? eq.voltageV.toString() : '',
      eq.commissionDate || '',
      eq.lastMaintenanceDate || '',
      eq.nextMaintenanceDate || '',
      customPropsStr,
      eq.notes || ''
    ];

    return fields.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';');
  });

  // UTF-8 BOM for correct Excel rendering of Cyrillic
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `reestr_oborudovaniya_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export comprehensive Industrial Equipment Report to PDF
 */
export function exportToPDF(factory: FactoryState, targetContainerId?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const filteredEquipment = factory.equipment.filter(eq => {
    if (!targetContainerId || targetContainerId === 'all') return true;
    let currentParent = eq.parentId;
    while (currentParent) {
      if (currentParent === targetContainerId) return true;
      const parentCont = factory.containers.find(c => c.id === currentParent);
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
  const operationalRate = totalEquipment > 0 ? Math.round(((normalCount) / totalEquipment) * 100) : 100;

  // Palette
  const darkNavy = [15, 23, 42]; // slate-900
  const bluePrimary = [2, 132, 199]; // sky-600
  const grayText = [71, 85, 105]; // slate-600

  // Header Banner
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTORY EQUIPMENT STATUS & AUDIT REPORT', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`PromSchema Industrial Control System  |  Date: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}`, 14, 22);
  doc.text(`Total Units: ${totalEquipment}  |  Operational Rate: ${operationalRate}%`, 14, 27);

  // Status Metric Cards
  const startY = 38;
  const cardWidth = 44;
  const cardHeight = 22;

  const cards = [
    { label: 'OPERATIONAL', count: normalCount, color: [22, 163, 74], bg: [240, 253, 244] },
    { label: 'WARNING', count: warningCount, color: [217, 119, 6], bg: [254, 252, 232] },
    { label: 'CRITICAL ALARM', count: criticalCount, color: [220, 38, 38], bg: [254, 242, 242] },
    { label: 'MAINTENANCE', count: maintenanceCount, color: [79, 70, 229], bg: [238, 242, 255] },
  ];

  cards.forEach((c, idx) => {
    const x = 14 + idx * (cardWidth + 4.5);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(c.color[0], c.color[1], c.color[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.label, x + 4, startY + 7);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(c.count), x + 4, startY + 16);
  });

  // Factory Summary Section
  let currentY = 68;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('1. Plant Workshops and Deep Container Structure', 14, currentY);

  currentY += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);

  factory.containers.forEach(cont => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    const childrenCount = factory.equipment.filter(e => e.parentId === cont.id).length;
    const subContainers = factory.containers.filter(c => c.parentId === cont.id).length;
    const parentName = cont.parentId 
      ? factory.containers.find(c => c.id === cont.parentId)?.name 
      : 'Main Factory Level';

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY - 4, 182, 10, 1, 1, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, currentY - 4, 182, 10, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(`[${cont.tag}] ${cont.name}`, 18, currentY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(`Parent: ${parentName}  |  Units: ${childrenCount}  |  Sub-sections: ${subContainers}`, 110, currentY + 2);

    currentY += 12;
  });

  // Equipment Registry Table
  currentY += 4;
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('2. Equipment Registry & Status Detail', 14, currentY);

  currentY += 6;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY - 4, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('TAG', 16, currentY + 1);
  doc.text('NAME / MODEL', 38, currentY + 1);
  doc.text('STATUS', 105, currentY + 1);
  doc.text('POWER', 135, currentY + 1);
  doc.text('NEXT MAINTENANCE', 160, currentY + 1);

  currentY += 7;

  factory.equipment.forEach((eq, i) => {
    if (currentY > 275) {
      doc.addPage();
      currentY = 20;
    }

    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, currentY - 4, 182, 9, 'F');
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(eq.tag, 16, currentY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const displayName = eq.name.length > 35 ? eq.name.substring(0, 32) + '...' : eq.name;
    doc.text(displayName, 38, currentY + 2);

    // Status chip text
    const statusColor = eq.status === 'normal' ? [22, 163, 74] 
      : eq.status === 'critical' ? [220, 38, 38]
      : eq.status === 'warning' ? [217, 119, 6]
      : [79, 70, 229];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(eq.status.toUpperCase(), 105, currentY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(eq.powerKw ? `${eq.powerKw} kW` : '-', 135, currentY + 2);
    doc.text(eq.nextMaintenanceDate || 'Planned', 160, currentY + 2);

    currentY += 9;
  });

  // Critical Alarms Section
  const criticals = factory.equipment.filter(e => e.status === 'critical' || e.status === 'warning');
  if (criticals.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 6;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('3. Active Warnings and Emergency Alarms', 14, currentY);
    currentY += 6;

    criticals.forEach(c => {
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14, currentY - 4, 182, 12, 1, 1, 'F');
      doc.setDrawColor(252, 165, 165);
      doc.rect(14, currentY - 4, 182, 12, 'S');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text(`[${c.tag}] ${c.name} (${c.status.toUpperCase()})`, 18, currentY + 1);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(127, 29, 29);
      const note = c.notes || 'Sensor threshold exceeded. Immediate technician inspection required.';
      doc.text(note.length > 90 ? note.slice(0, 87) + '...' : note, 18, currentY + 6);

      currentY += 15;
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`PromSchema Visual Factory Management  |  Page ${i} of ${pageCount}`, 14, 290);
    doc.text(`Confidential Industrial Document  |  Total Load: ${totalPower.toFixed(1)} kW`, 130, 290);
  }

  doc.save(`industrial_equipment_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Export full JSON project
 */
export function exportToJSON(factory: FactoryState): void {
  const jsonStr = JSON.stringify(factory, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `factory_scheme_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

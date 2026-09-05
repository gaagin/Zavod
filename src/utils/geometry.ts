import { EquipmentNode, ContainerNode, ConnectionLink, LinkStyle } from '../types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Returns effective visual bounding box of a node.
 * For collapsed container or equipment, returns its collapsedWidth/collapsedHeight.
 */
export function getNodeRect(
  nodeId: string,
  equipment: EquipmentNode[],
  containers: ContainerNode[]
): Rect | null {
  const eq = equipment.find(e => e.id === nodeId);
  if (eq) {
    if (eq.isCollapsed) {
      return {
        x: eq.x,
        y: eq.y,
        width: eq.collapsedWidth || 180,
        height: eq.collapsedHeight || 64,
      };
    }
    return { x: eq.x, y: eq.y, width: eq.width, height: eq.height };
  }
  const cont = containers.find(c => c.id === nodeId);
  if (cont) {
    if (cont.isCollapsed) {
      return { x: cont.x, y: cont.y, width: cont.collapsedWidth, height: cont.collapsedHeight };
    }
    return { x: cont.x, y: cont.y, width: cont.width, height: cont.height };
  }
  return null;
}

/**
 * Checks if a node is currently hidden because any of its ancestor containers OR equipment is collapsed
 */
export function isNodeHiddenByCollapsedAncestor(
  parentId: string | null | undefined,
  containers: ContainerNode[],
  equipment?: EquipmentNode[]
): boolean {
  if (!parentId) return false;
  const containerMap = new Map(containers.map(c => [c.id, c]));
  const eqMap = equipment ? new Map(equipment.map(e => [e.id, e])) : null;

  let currentId: string | null | undefined = parentId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    // Check if parent is a container
    const parentContainer = containerMap.get(currentId);
    if (parentContainer) {
      if (parentContainer.isCollapsed) return true;
      currentId = parentContainer.parentId;
      continue;
    }

    // Check if parent is an equipment
    if (eqMap) {
      const parentEq = eqMap.get(currentId);
      if (parentEq) {
        if (parentEq.isCollapsed) return true;
        currentId = parentEq.parentId;
        continue;
      }
    }

    break;
  }
  return false;
}

/**
 * Find all nested child equipment recursively (including equipment in child, grandchild containers)
 */
export function getAllDescendantEquipment(
  containerId: string,
  containers: ContainerNode[],
  equipment: EquipmentNode[]
): EquipmentNode[] {
  const containerIds = getAllDescendantContainerIds(containerId, containers);
  const result: EquipmentNode[] = [];
  const seen = new Set<string>();

  for (const eq of equipment) {
    if (eq.parentId && containerIds.has(eq.parentId) && !seen.has(eq.id)) {
      seen.add(eq.id);
      result.push(eq);
    }
  }

  return result;
}

/**
 * Returns the nesting hierarchy depth of a container (0 for root, 1 for direct child, etc.)
 */
export function getContainerDepth(
  containerId: string,
  containers: ContainerNode[]
): number {
  let depth = 0;
  let current = containers.find(c => c.id === containerId);
  const visited = new Set<string>();

  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    depth++;
    current = containers.find(c => c.id === current!.parentId);
  }

  return depth;
}

/**
 * Returns a set of container IDs including the given container and all its recursive descendants
 */
export function getAllDescendantContainerIds(
  containerId: string,
  containers: ContainerNode[]
): Set<string> {
  const result = new Set<string>([containerId]);
  const queue = [containerId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = containers.filter(c => c.parentId === current);
    for (const child of children) {
      if (!result.has(child.id)) {
        result.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return result;
}

/**
 * Finds all descendant containers and equipment (both by explicit parentId hierarchy
 * AND by geometric containment within the container's bounds).
 * This ensures that nested items ALWAYS move together with their parent container!
 */
export function findAllDescendantsOfContainer(
  containerId: string,
  containers: ContainerNode[],
  equipment: EquipmentNode[]
): {
  containers: ContainerNode[];
  equipment: EquipmentNode[];
} {
  const container = containers.find(c => c.id === containerId);
  if (!container) return { containers: [], equipment: [] };

  // 1. Collect all container descendants by explicit parentId hierarchy
  const descendantContainerIds = getAllDescendantContainerIds(containerId, containers);
  descendantContainerIds.delete(containerId); // exclude self

  // Helper: check if candidateId is an ancestor of targetId
  const isAncestor = (candidateId: string, targetId: string): boolean => {
    let curr: string | null | undefined = targetId;
    const visited = new Set<string>();
    while (curr && !visited.has(curr)) {
      visited.add(curr);
      if (curr === candidateId) return true;
      const c = containers.find(item => item.id === curr);
      curr = c?.parentId;
    }
    return false;
  };

  const contBounds = {
    x: container.x,
    y: container.y,
    w: container.isCollapsed ? container.collapsedWidth : container.width,
    h: container.isCollapsed ? container.collapsedHeight : container.height,
  };

  // 2. Also collect any container geometrically located within this container's bounds
  for (const c of containers) {
    if (c.id === containerId) continue;
    if (descendantContainerIds.has(c.id)) continue;
    if (isAncestor(c.id, containerId)) continue; // prevent circular reference

    const cW = c.isCollapsed ? c.collapsedWidth : c.width;
    const cH = c.isCollapsed ? c.collapsedHeight : c.height;
    const cCenterX = c.x + cW / 2;
    const cCenterY = c.y + cH / 2;

    if (
      cCenterX >= contBounds.x &&
      cCenterX <= contBounds.x + contBounds.w &&
      cCenterY >= contBounds.y &&
      cCenterY <= contBounds.y + contBounds.h
    ) {
      descendantContainerIds.add(c.id);
      const subTreeIds = getAllDescendantContainerIds(c.id, containers);
      for (const subId of subTreeIds) {
        if (subId !== containerId) {
          descendantContainerIds.add(subId);
        }
      }
    }
  }

  const allDescendantContainers = containers.filter(c => descendantContainerIds.has(c.id));

  // 3. Collect equipment (by parentId OR geometric bounds)
  const allContIds = new Set<string>([containerId, ...descendantContainerIds]);
  const descendantEquipment: EquipmentNode[] = [];
  const seenEq = new Set<string>();

  for (const eq of equipment) {
    if (eq.parentId && allContIds.has(eq.parentId)) {
      if (!seenEq.has(eq.id)) {
        seenEq.add(eq.id);
        descendantEquipment.push(eq);
      }
      continue;
    }

    const eqCenterX = eq.x + eq.width / 2;
    const eqCenterY = eq.y + eq.height / 2;

    // Check if geometrically inside target container
    if (
      eqCenterX >= contBounds.x &&
      eqCenterX <= contBounds.x + contBounds.w &&
      eqCenterY >= contBounds.y &&
      eqCenterY <= contBounds.y + contBounds.h
    ) {
      if (!seenEq.has(eq.id)) {
        seenEq.add(eq.id);
        descendantEquipment.push(eq);
      }
      continue;
    }

    // Check if inside any descendant container
    for (const dCont of allDescendantContainers) {
      const dW = dCont.isCollapsed ? dCont.collapsedWidth : dCont.width;
      const dH = dCont.isCollapsed ? dCont.collapsedHeight : dCont.height;
      if (
        eqCenterX >= dCont.x &&
        eqCenterX <= dCont.x + dW &&
        eqCenterY >= dCont.y &&
        eqCenterY <= dCont.y + dH
      ) {
        if (!seenEq.has(eq.id)) {
          seenEq.add(eq.id);
          descendantEquipment.push(eq);
        }
        break;
      }
    }
  }

  return {
    containers: allDescendantContainers,
    equipment: descendantEquipment,
  };
}


/**
 * Returns all equipment nested recursively inside a given equipment node
 */
export function getAllDescendantEquipmentOfEquipment(
  parentEquipmentId: string,
  equipment: EquipmentNode[]
): EquipmentNode[] {
  const result: EquipmentNode[] = [];
  const queue = [parentEquipmentId];
  const seen = new Set<string>([parentEquipmentId]);

  while (queue.length > 0) {
    const curId = queue.shift()!;
    const children = equipment.filter(e => e.parentId === curId);
    for (const child of children) {
      if (!seen.has(child.id)) {
        seen.add(child.id);
        result.push(child);
        queue.push(child.id);
      }
    }
  }

  return result;
}

/**
 * Finds all descendants of an equipment (by explicit parentId AND geometric bounds)
 * So moving parent equipment moves all child equipment inside it!
 */
export function findAllDescendantsOfEquipment(
  equipmentId: string,
  equipment: EquipmentNode[]
): {
  equipment: EquipmentNode[];
} {
  const parentEq = equipment.find(e => e.id === equipmentId);
  if (!parentEq) return { equipment: [] };

  const descendantIds = new Set<string>();
  const explicit = getAllDescendantEquipmentOfEquipment(equipmentId, equipment);
  for (const item of explicit) {
    descendantIds.add(item.id);
  }

  const pW = parentEq.isCollapsed ? (parentEq.collapsedWidth || 180) : parentEq.width;
  const pH = parentEq.isCollapsed ? (parentEq.collapsedHeight || 64) : parentEq.height;

  // Geometric check for any unparented or inside equipment
  for (const eq of equipment) {
    if (eq.id === equipmentId || descendantIds.has(eq.id)) continue;
    const centerX = eq.x + eq.width / 2;
    const centerY = eq.y + eq.height / 2;
    if (
      centerX >= parentEq.x &&
      centerX <= parentEq.x + pW &&
      centerY >= parentEq.y &&
      centerY <= parentEq.y + pH
    ) {
      descendantIds.add(eq.id);
      const sub = getAllDescendantEquipmentOfEquipment(eq.id, equipment);
      for (const s of sub) {
        descendantIds.add(s.id);
      }
    }
  }

  return {
    equipment: equipment.filter(e => descendantIds.has(e.id)),
  };
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  tag: string;
  color: string;
  type: 'container' | 'equipment';
}

/**
 * Returns full breadcrumbs trail from root down to either container or equipment
 */
export function getNodeBreadcrumbs(
  nodeId: string,
  containers: ContainerNode[],
  equipment: EquipmentNode[]
): BreadcrumbItem[] {
  const trail: BreadcrumbItem[] = [];
  let currentId: string | null | undefined = nodeId;
  const visited = new Set<string>();

  const contMap = new Map(containers.map(c => [c.id, c]));
  const eqMap = new Map(equipment.map(e => [e.id, e]));

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const c = contMap.get(currentId);
    if (c) {
      trail.unshift({
        id: c.id,
        name: c.name,
        tag: c.tag,
        color: c.color,
        type: 'container',
      });
      currentId = c.parentId;
      continue;
    }

    const eq = eqMap.get(currentId);
    if (eq) {
      trail.unshift({
        id: eq.id,
        name: eq.name,
        tag: eq.tag,
        color: eq.color || '#3b82f6',
        type: 'equipment',
      });
      currentId = eq.parentId;
      continue;
    }

    break;
  }

  return trail;
}

/**
 * Checks if a node is in the focused container OR focused equipment subtree
 */
export function isNodeInSubtree(
  nodeId: string,
  focusedRootId: string,
  containers: ContainerNode[],
  equipment: EquipmentNode[]
): boolean {
  if (nodeId === focusedRootId) return true;

  // Check if focusedRootId is a container
  if (containers.some(c => c.id === focusedRootId)) {
    return isNodeInContainerSubtree(nodeId, focusedRootId, containers, equipment);
  }

  // Check if focusedRootId is an equipment
  if (equipment.some(e => e.id === focusedRootId)) {
    let curr: string | null | undefined = nodeId;
    const visited = new Set<string>();
    const eqMap = new Map(equipment.map(e => [e.id, e]));
    const contMap = new Map(containers.map(c => [c.id, c]));

    while (curr && !visited.has(curr)) {
      visited.add(curr);
      if (curr === focusedRootId) return true;

      const eq = eqMap.get(curr);
      if (eq) {
        curr = eq.parentId;
        continue;
      }

      const c = contMap.get(curr);
      if (c) {
        curr = c.parentId;
        continue;
      }

      break;
    }
    return false;
  }

  return false;
}

/**
 * Checks if an equipment or container is either the container itself or nested inside it
 */
export function isNodeInContainerSubtree(
  nodeId: string,
  containerId: string,
  containers: ContainerNode[],
  equipment: EquipmentNode[]
): boolean {
  if (nodeId === containerId) return true;

  const containerIds = getAllDescendantContainerIds(containerId, containers);
  if (containerIds.has(nodeId)) return true;

  // Follow parents of equipment until we hit a container or root
  let curr: string | null | undefined = nodeId;
  const visited = new Set<string>();
  const eqMap = new Map(equipment.map(e => [e.id, e]));

  while (curr && !visited.has(curr)) {
    visited.add(curr);
    const eq = eqMap.get(curr);
    if (!eq || !eq.parentId) break;
    if (containerIds.has(eq.parentId)) return true;
    curr = eq.parentId;
  }

  return false;
}

export function getContainerBreadcrumbs(
  containerId: string,
  containers: ContainerNode[]
): ContainerNode[] {
  const trail: ContainerNode[] = [];
  let currentId: string | null = containerId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cont = containers.find(c => c.id === currentId);
    if (!cont) break;
    trail.unshift(cont);
    currentId = cont.parentId;
  }

  return trail;
}

/**
 * Calculates panX, panY, zoom to fill the working window with any node (container or equipment)
 */
export function calculateNodeFitViewport(
  node: { x: number; y: number; width: number; height: number; isCollapsed?: boolean; collapsedWidth?: number; collapsedHeight?: number },
  viewWidth: number,
  viewHeight: number,
  padding: number = 60,
  topOffset: number = 56
): { panX: number; panY: number; zoom: number } {
  const safeW = Math.max(300, viewWidth);
  const safeH = Math.max(300, viewHeight - topOffset);

  const availableW = Math.max(100, safeW - padding * 2);
  const availableH = Math.max(100, safeH - padding * 2);

  const targetW = node.isCollapsed ? (node.collapsedWidth || 180) : node.width;
  const targetH = node.isCollapsed ? (node.collapsedHeight || 64) : node.height;

  const zoomX = availableW / Math.max(1, targetW);
  const zoomY = availableH / Math.max(1, targetH);
  const targetZoom = Number(Math.max(0.3, Math.min(2.0, Math.min(zoomX, zoomY))).toFixed(3));

  const centerX = node.x + targetW / 2;
  const centerY = node.y + targetH / 2;

  const panX = Math.round(safeW / 2 - centerX * targetZoom);
  const panY = Math.round(topOffset + safeH / 2 - centerY * targetZoom);

  return { panX, panY, zoom: targetZoom };
}

/**
 * Calculates panX, panY, zoom to fill the working window with the container's contents
 */
export function calculateContainerFitViewport(
  container: ContainerNode,
  viewWidth: number,
  viewHeight: number,
  padding: number = 40,
  topOffset: number = 56
): { panX: number; panY: number; zoom: number } {
  const safeW = Math.max(300, viewWidth);
  const safeH = Math.max(300, viewHeight - topOffset);

  const availableW = Math.max(100, safeW - padding * 2);
  const availableH = Math.max(100, safeH - padding * 2);

  const targetW = container.isCollapsed ? container.collapsedWidth : container.width;
  const targetH = container.isCollapsed ? container.collapsedHeight : container.height;

  const zoomX = availableW / Math.max(1, targetW);
  const zoomY = availableH / Math.max(1, targetH);
  const targetZoom = Number(Math.max(0.4, Math.min(2.0, Math.min(zoomX, zoomY))).toFixed(3));

  const centerX = container.x + targetW / 2;
  const centerY = container.y + targetH / 2;

  const panX = Math.round(safeW / 2 - centerX * targetZoom);
  const panY = Math.round(topOffset + safeH / 2 - centerY * targetZoom);

  return { panX, panY, zoom: targetZoom };
}

/**
 * Calculate best anchor point between two rectangles
 */
export function getBestConnectionPoints(fromRect: Rect, toRect: Rect): { from: Point; to: Point } {
  const fromCenter = { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2 };
  const toCenter = { x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2 };

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  let fromPt: Point;
  let toPt: Point;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      fromPt = { x: fromRect.x + fromRect.width, y: fromCenter.y };
      toPt = { x: toRect.x, y: toCenter.y };
    } else {
      fromPt = { x: fromRect.x, y: fromCenter.y };
      toPt = { x: toRect.x + toRect.width, y: toCenter.y };
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      fromPt = { x: fromCenter.x, y: fromRect.y + fromRect.height };
      toPt = { x: toCenter.x, y: toRect.y };
    } else {
      fromPt = { x: fromCenter.x, y: fromRect.y };
      toPt = { x: toCenter.x, y: toRect.y + toRect.height };
    }
  }

  return { from: fromPt, to: toPt };
}

/**
 * Generates SVG path string based on link style
 */
export function generateLinkPath(
  fromPt: Point,
  toPt: Point,
  style: LinkStyle = 'orthogonal'
): { pathD: string; midPoint: Point } {
  const midPoint = {
    x: (fromPt.x + toPt.x) / 2,
    y: (fromPt.y + toPt.y) / 2
  };

  if (style === 'straight') {
    return {
      pathD: `M ${fromPt.x} ${fromPt.y} L ${toPt.x} ${toPt.y}`,
      midPoint
    };
  }

  if (style === 'curved') {
    const dx = toPt.x - fromPt.x;
    const dy = toPt.y - fromPt.y;
    const curvature = Math.max(40, Math.abs(dx) * 0.4);

    let cp1: Point;
    let cp2: Point;

    if (Math.abs(dx) > Math.abs(dy)) {
      cp1 = { x: fromPt.x + (dx > 0 ? curvature : -curvature), y: fromPt.y };
      cp2 = { x: toPt.x - (dx > 0 ? curvature : -curvature), y: toPt.y };
    } else {
      cp1 = { x: fromPt.x, y: fromPt.y + (dy > 0 ? curvature : -curvature) };
      cp2 = { x: toPt.x, y: toPt.y - (dy > 0 ? curvature : -curvature) };
    }

    return {
      pathD: `M ${fromPt.x} ${fromPt.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${toPt.x} ${toPt.y}`,
      midPoint: {
        x: 0.125 * fromPt.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * toPt.x,
        y: 0.125 * fromPt.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * toPt.y
      }
    };
  }

  // Orthogonal (Step / Elbow)
  const dx = toPt.x - fromPt.x;
  const dy = toPt.y - fromPt.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    const midX = fromPt.x + dx / 2;
    return {
      pathD: `M ${fromPt.x} ${fromPt.y} L ${midX} ${fromPt.y} L ${midX} ${toPt.y} L ${toPt.x} ${toPt.y}`,
      midPoint: { x: midX, y: (fromPt.y + toPt.y) / 2 }
    };
  } else {
    const midY = fromPt.y + dy / 2;
    return {
      pathD: `M ${fromPt.x} ${fromPt.y} L ${fromPt.x} ${midY} L ${toPt.x} ${midY} L ${toPt.x} ${toPt.y}`,
      midPoint: { x: (fromPt.x + toPt.x) / 2, y: midY }
    };
  }
}

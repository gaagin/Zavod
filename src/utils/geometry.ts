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
 * For collapsed container, returns its collapsedWidth/collapsedHeight.
 */
export function getNodeRect(
  nodeId: string,
  equipment: EquipmentNode[],
  containers: ContainerNode[]
): Rect | null {
  const eq = equipment.find(e => e.id === nodeId);
  if (eq) {
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
 * Checks if a node is currently hidden because any of its ancestor containers is collapsed
 */
export function isNodeHiddenByCollapsedAncestor(
  parentId: string | null | undefined,
  containers: ContainerNode[]
): boolean {
  if (!parentId) return false;
  const containerMap = new Map(containers.map(c => [c.id, c]));

  let currentId: string | null | undefined = parentId;
  while (currentId) {
    const parent = containerMap.get(currentId);
    if (!parent) break;
    if (parent.isCollapsed) return true;
    currentId = parent.parentId;
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

  const eq = equipment.find(e => e.id === nodeId);
  if (eq && eq.parentId && containerIds.has(eq.parentId)) {
    return true;
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

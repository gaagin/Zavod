import { EquipmentNode, ContainerNode } from '../types';

export interface DraggedRect {
  id: string;
  type: 'equipment' | 'container';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CandidateRect {
  id: string;
  name: string;
  tag?: string;
  type: 'equipment' | 'container' | 'boundary';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuideAnchorPoint {
  x: number;
  y: number;
  targetId?: string;
  label?: string;
}

export interface AlignmentGuide {
  id: string;
  type: 'vertical' | 'horizontal';
  coord: number; // x for vertical, y for horizontal
  start: number; // y1 for vertical, x1 for horizontal
  end: number;   // y2 for vertical, x2 for horizontal
  alignType: 'center' | 'edge' | 'flush';
  label: string;
  targetIds: string[];
  anchorPoints: GuideAnchorPoint[];
}

export interface AlignmentSnapResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
}

interface MatchCandidate {
  diff: number;
  snappedCoord: number;
  lineCoord: number;
  alignType: 'center' | 'edge' | 'flush';
  label: string;
  targetId: string;
  targetAnchor: { x: number; y: number };
  draggedAnchor: { x: number; y: number };
}

/**
 * Computes draw.io style smart alignment guide lines and magnetic snap coordinates.
 * Snaps to edges, centers, and boundaries of other visible objects.
 */
export function calculateAlignmentGuides(
  dragged: DraggedRect,
  rawX: number,
  rawY: number,
  candidates: CandidateRect[],
  zoom: number = 1,
  gridSnap: boolean = false
): AlignmentSnapResult {
  // Adaptive snap threshold: 7px on screen, clamped between 5 and 15px in canvas coords
  const snapThreshold = Math.min(14, Math.max(5, 7 / Math.max(0.2, zoom)));

  const width = dragged.width;
  const height = dragged.height;

  // Filter out self and any candidate with invalid dimensions
  const validCandidates = candidates.filter(c => c.id !== dragged.id && c.width > 0 && c.height > 0);

  // 1. VERTICAL GUIDES (aligning along X axis: horizontal positioning)
  const dragLeft = rawX;
  const dragCenterX = rawX + width / 2;
  const dragRight = rawX + width;

  let bestXMatch: MatchCandidate | null = null;

  for (const target of validCandidates) {
    const targetLeft = target.x;
    const targetCenterX = target.x + target.width / 2;
    const targetRight = target.x + target.width;

    const targetCenterY = target.y + target.height / 2;

    const testPairs: Array<{
      dragPt: number;
      targetPt: number;
      snappedX: number;
      alignType: 'center' | 'edge' | 'flush';
      label: string;
      targetAnchor: { x: number; y: number };
      draggedAnchor: { x: number; y: number };
      priorityFactor: number;
    }> = [
      // Center to center (highest priority)
      {
        dragPt: dragCenterX,
        targetPt: targetCenterX,
        snappedX: targetCenterX - width / 2,
        alignType: 'center',
        label: 'По центру',
        targetAnchor: { x: targetCenterX, y: targetCenterY },
        draggedAnchor: { x: targetCenterX, y: rawY + height / 2 },
        priorityFactor: 0.75,
      },
      // Left to left
      {
        dragPt: dragLeft,
        targetPt: targetLeft,
        snappedX: targetLeft,
        alignType: 'edge',
        label: 'По левому краю',
        targetAnchor: { x: targetLeft, y: target.y },
        draggedAnchor: { x: targetLeft, y: rawY },
        priorityFactor: 1.0,
      },
      // Right to right
      {
        dragPt: dragRight,
        targetPt: targetRight,
        snappedX: targetRight - width,
        alignType: 'edge',
        label: 'По правому краю',
        targetAnchor: { x: targetRight, y: target.y + target.height },
        draggedAnchor: { x: targetRight, y: rawY + height },
        priorityFactor: 1.0,
      },
      // Left to right (adjacent flush)
      {
        dragPt: dragLeft,
        targetPt: targetRight,
        snappedX: targetRight,
        alignType: 'flush',
        label: 'Встык справа',
        targetAnchor: { x: targetRight, y: targetCenterY },
        draggedAnchor: { x: targetRight, y: rawY + height / 2 },
        priorityFactor: 1.1,
      },
      // Right to left (adjacent flush)
      {
        dragPt: dragRight,
        targetPt: targetLeft,
        snappedX: targetLeft - width,
        alignType: 'flush',
        label: 'Встык слева',
        targetAnchor: { x: targetLeft, y: targetCenterY },
        draggedAnchor: { x: targetLeft, y: rawY + height / 2 },
        priorityFactor: 1.1,
      },
      // Center to left
      {
        dragPt: dragCenterX,
        targetPt: targetLeft,
        snappedX: targetLeft - width / 2,
        alignType: 'edge',
        label: 'Центр к левому краю',
        targetAnchor: { x: targetLeft, y: targetCenterY },
        draggedAnchor: { x: targetLeft, y: rawY + height / 2 },
        priorityFactor: 1.2,
      },
      // Center to right
      {
        dragPt: dragCenterX,
        targetPt: targetRight,
        snappedX: targetRight - width / 2,
        alignType: 'edge',
        label: 'Центр к правому краю',
        targetAnchor: { x: targetRight, y: targetCenterY },
        draggedAnchor: { x: targetRight, y: rawY + height / 2 },
        priorityFactor: 1.2,
      },
    ];

    for (const pair of testPairs) {
      const diff = Math.abs(pair.dragPt - pair.targetPt);
      if (diff <= snapThreshold) {
        const weightedDiff = diff * pair.priorityFactor;
        if (!bestXMatch || weightedDiff < bestXMatch.diff) {
          bestXMatch = {
            diff: weightedDiff,
            snappedCoord: Math.round(pair.snappedX),
            lineCoord: Math.round(pair.targetPt),
            alignType: pair.alignType,
            label: pair.label,
            targetId: target.id,
            targetAnchor: pair.targetAnchor,
            draggedAnchor: pair.draggedAnchor,
          };
        }
      }
    }
  }

  // 2. HORIZONTAL GUIDES (aligning along Y axis: vertical positioning)
  const dragTop = rawY;
  const dragCenterY = rawY + height / 2;
  const dragBottom = rawY + height;

  let bestYMatch: MatchCandidate | null = null;

  for (const target of validCandidates) {
    const targetTop = target.y;
    const targetCenterY = target.y + target.height / 2;
    const targetBottom = target.y + target.height;

    const targetCenterX = target.x + target.width / 2;

    const testPairs: Array<{
      dragPt: number;
      targetPt: number;
      snappedY: number;
      alignType: 'center' | 'edge' | 'flush';
      label: string;
      targetAnchor: { x: number; y: number };
      draggedAnchor: { x: number; y: number };
      priorityFactor: number;
    }> = [
      // Center to center (highest priority)
      {
        dragPt: dragCenterY,
        targetPt: targetCenterY,
        snappedY: targetCenterY - height / 2,
        alignType: 'center',
        label: 'По центру',
        targetAnchor: { x: targetCenterX, y: targetCenterY },
        draggedAnchor: { x: rawX + width / 2, y: targetCenterY },
        priorityFactor: 0.75,
      },
      // Top to top
      {
        dragPt: dragTop,
        targetPt: targetTop,
        snappedY: targetTop,
        alignType: 'edge',
        label: 'По верхнему краю',
        targetAnchor: { x: target.x, y: targetTop },
        draggedAnchor: { x: rawX, y: targetTop },
        priorityFactor: 1.0,
      },
      // Bottom to bottom
      {
        dragPt: dragBottom,
        targetPt: targetBottom,
        snappedY: targetBottom - height,
        alignType: 'edge',
        label: 'По нижнему краю',
        targetAnchor: { x: target.x + target.width, y: targetBottom },
        draggedAnchor: { x: rawX + width, y: targetBottom },
        priorityFactor: 1.0,
      },
      // Top to bottom (flush)
      {
        dragPt: dragTop,
        targetPt: targetBottom,
        snappedY: targetBottom,
        alignType: 'flush',
        label: 'Встык снизу',
        targetAnchor: { x: targetCenterX, y: targetBottom },
        draggedAnchor: { x: rawX + width / 2, y: targetBottom },
        priorityFactor: 1.1,
      },
      // Bottom to top (flush)
      {
        dragPt: dragBottom,
        targetPt: targetTop,
        snappedY: targetTop - height,
        alignType: 'flush',
        label: 'Встык сверху',
        targetAnchor: { x: targetCenterX, y: targetTop },
        draggedAnchor: { x: rawX + width / 2, y: targetTop },
        priorityFactor: 1.1,
      },
      // Center to top
      {
        dragPt: dragCenterY,
        targetPt: targetTop,
        snappedY: targetTop - height / 2,
        alignType: 'edge',
        label: 'Центр к верхнему краю',
        targetAnchor: { x: targetCenterX, y: targetTop },
        draggedAnchor: { x: rawX + width / 2, y: targetTop },
        priorityFactor: 1.2,
      },
      // Center to bottom
      {
        dragPt: dragCenterY,
        targetPt: targetBottom,
        snappedY: targetBottom - height / 2,
        alignType: 'edge',
        label: 'Центр к нижнему краю',
        targetAnchor: { x: targetCenterX, y: targetBottom },
        draggedAnchor: { x: rawX + width / 2, y: targetBottom },
        priorityFactor: 1.2,
      },
    ];

    for (const pair of testPairs) {
      const diff = Math.abs(pair.dragPt - pair.targetPt);
      if (diff <= snapThreshold) {
        const weightedDiff = diff * pair.priorityFactor;
        if (!bestYMatch || weightedDiff < bestYMatch.diff) {
          bestYMatch = {
            diff: weightedDiff,
            snappedCoord: Math.round(pair.snappedY),
            lineCoord: Math.round(pair.targetPt),
            alignType: pair.alignType,
            label: pair.label,
            targetId: target.id,
            targetAnchor: pair.targetAnchor,
            draggedAnchor: pair.draggedAnchor,
          };
        }
      }
    }
  }

  // Determine final coordinates (snapped or grid / raw)
  const finalX = bestXMatch 
    ? bestXMatch.snappedCoord 
    : (gridSnap ? Math.round(rawX / 20) * 20 : Math.round(rawX));

  const finalY = bestYMatch 
    ? bestYMatch.snappedCoord 
    : (gridSnap ? Math.round(rawY / 20) * 20 : Math.round(rawY));

  const guides: AlignmentGuide[] = [];

  // Build full-span Vertical Guide
  if (bestXMatch) {
    const lineX = bestXMatch.lineCoord;
    const alignedTargetIds = new Set<string>([bestXMatch.targetId]);
    const anchorPoints: GuideAnchorPoint[] = [bestXMatch.targetAnchor];

    // Check if any other targets also share this line coordinate
    for (const target of validCandidates) {
      if (target.id === bestXMatch.targetId) continue;
      const tLeft = target.x;
      const tCenter = target.x + target.width / 2;
      const tRight = target.x + target.width;

      if (Math.abs(tCenter - lineX) <= 1.5) {
        alignedTargetIds.add(target.id);
        anchorPoints.push({ x: lineX, y: target.y + target.height / 2, targetId: target.id });
      } else if (Math.abs(tLeft - lineX) <= 1.5) {
        alignedTargetIds.add(target.id);
        anchorPoints.push({ x: lineX, y: target.y, targetId: target.id });
      } else if (Math.abs(tRight - lineX) <= 1.5) {
        alignedTargetIds.add(target.id);
        anchorPoints.push({ x: lineX, y: target.y + target.height, targetId: target.id });
      }
    }

    // Add dragged object anchor point
    anchorPoints.push(bestXMatch.draggedAnchor);

    // Calculate vertical line span
    const allYs: number[] = [finalY, finalY + height];
    for (const target of validCandidates) {
      if (alignedTargetIds.has(target.id)) {
        allYs.push(target.y, target.y + target.height);
      }
    }

    const startY = Math.min(...allYs) - 35;
    const endY = Math.max(...allYs) + 35;

    guides.push({
      id: `v-guide-${lineX}`,
      type: 'vertical',
      coord: lineX,
      start: startY,
      end: endY,
      alignType: bestXMatch.alignType,
      label: bestXMatch.label,
      targetIds: Array.from(alignedTargetIds),
      anchorPoints,
    });
  }

  // Build full-span Horizontal Guide
  if (bestYMatch) {
    const lineY = bestYMatch.lineCoord;
    const alignedTargetIds = new Set<string>([bestYMatch.targetId]);
    const anchorPoints: GuideAnchorPoint[] = [bestYMatch.targetAnchor];

    // Check if any other targets also share this line coordinate
    for (const target of validCandidates) {
      if (target.id === bestYMatch.targetId) continue;
      const tTop = target.y;
      const tCenter = target.y + target.height / 2;
      const tBottom = target.y + target.height;

      if (Math.abs(tCenter - lineY) <= 1.5) {
        alignedTargetIds.add(target.id);
        anchorPoints.push({ x: target.x + target.width / 2, y: lineY, targetId: target.id });
      } else if (Math.abs(tTop - lineY) <= 1.5) {
        alignedTargetIds.add(target.id);
        anchorPoints.push({ x: target.x, y: lineY, targetId: target.id });
      } else if (Math.abs(tBottom - lineY) <= 1.5) {
        alignedTargetIds.add(target.id);
        anchorPoints.push({ x: target.x + target.width, y: lineY, targetId: target.id });
      }
    }

    // Add dragged object anchor point
    anchorPoints.push(bestYMatch.draggedAnchor);

    // Calculate horizontal line span
    const allXs: number[] = [finalX, finalX + width];
    for (const target of validCandidates) {
      if (alignedTargetIds.has(target.id)) {
        allXs.push(target.x, target.x + target.width);
      }
    }

    const startX = Math.min(...allXs) - 35;
    const endX = Math.max(...allXs) + 35;

    guides.push({
      id: `h-guide-${lineY}`,
      type: 'horizontal',
      coord: lineY,
      start: startX,
      end: endX,
      alignType: bestYMatch.alignType,
      label: bestYMatch.label,
      targetIds: Array.from(alignedTargetIds),
      anchorPoints,
    });
  }

  return {
    x: finalX,
    y: finalY,
    guides,
  };
}

/**
 * Builds the list of candidate alignment rectangles from existing state.
 * In normal mode: includes other equipment and other containers.
 * In focus mode: includes visible equipment/sub-containers, plus the focused container's boundaries.
 */
export function buildAlignmentCandidates(
  draggedId: string,
  equipment: EquipmentNode[],
  containers: ContainerNode[],
  focusedContainerId: string | null = null,
  focusedSubtreeContainerIds: Set<string> | null = null
): CandidateRect[] {
  const result: CandidateRect[] = [];

  // Exclude descendants of dragged container if dragging a container
  const excludedIds = new Set<string>([draggedId]);
  const isDraggedContainer = containers.some(c => c.id === draggedId);
  if (isDraggedContainer) {
    const queue = [draggedId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = containers.filter(c => c.parentId === current);
      for (const child of children) {
        if (!excludedIds.has(child.id)) {
          excludedIds.add(child.id);
          queue.push(child.id);
        }
      }
    }
  }

  // If in focus mode:
  if (focusedContainerId && focusedSubtreeContainerIds) {
    const focusedCont = containers.find(c => c.id === focusedContainerId);
    if (focusedCont) {
      // Add the focused container's inner content area as candidate alignment targets
      // 1. Center of focused container
      // 2. Padding inset bounds (left, right, top, bottom)
      const PADDING = 30;
      const HEADER_H = 44;
      result.push({
        id: `boundary-${focusedCont.id}-content`,
        name: `Цех [${focusedCont.tag}]`,
        type: 'boundary',
        x: focusedCont.x + PADDING,
        y: focusedCont.y + HEADER_H + PADDING,
        width: Math.max(100, focusedCont.width - PADDING * 2),
        height: Math.max(100, focusedCont.height - HEADER_H - PADDING * 2),
      });

      // Add entire container boundary
      result.push({
        id: `boundary-${focusedCont.id}-outer`,
        name: `Внешняя граница [${focusedCont.tag}]`,
        type: 'boundary',
        x: focusedCont.x,
        y: focusedCont.y,
        width: focusedCont.width,
        height: focusedCont.height,
      });
    }

    // Add other visible equipment in this focused container subtree
    for (const eq of equipment) {
      if (excludedIds.has(eq.id)) continue;
      if (eq.parentId && focusedSubtreeContainerIds.has(eq.parentId)) {
        result.push({
          id: eq.id,
          name: eq.name,
          tag: eq.tag,
          type: 'equipment',
          x: eq.x,
          y: eq.y,
          width: eq.width,
          height: eq.height,
        });
      }
    }

    // Add other sub-containers in this subtree
    for (const c of containers) {
      if (excludedIds.has(c.id) || c.id === focusedContainerId) continue;
      if (focusedSubtreeContainerIds.has(c.id)) {
        const w = c.isCollapsed ? c.collapsedWidth : c.width;
        const h = c.isCollapsed ? c.collapsedHeight : c.height;
        result.push({
          id: c.id,
          name: c.name,
          tag: c.tag,
          type: 'container',
          x: c.x,
          y: c.y,
          width: w,
          height: h,
        });
      }
    }

    return result;
  }

  // Normal mode: all visible equipment & containers
  for (const eq of equipment) {
    if (excludedIds.has(eq.id)) continue;
    result.push({
      id: eq.id,
      name: eq.name,
      tag: eq.tag,
      type: 'equipment',
      x: eq.x,
      y: eq.y,
      width: eq.width,
      height: eq.height,
    });
  }

  for (const c of containers) {
    if (excludedIds.has(c.id)) continue;
    const w = c.isCollapsed ? c.collapsedWidth : c.width;
    const h = c.isCollapsed ? c.collapsedHeight : c.height;
    result.push({
      id: c.id,
      name: c.name,
      tag: c.tag,
      type: 'container',
      x: c.x,
      y: c.y,
      width: w,
      height: h,
    });
  }

  return result;
}

export interface ContainerExpansion {
  shouldUpdate: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  expandedEdges: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  };
}

/**
 * Checks if an element (or its moving group) reaches or exceeds the focused container boundaries,
 * and calculates the new auto-expanded dimensions and position.
 */
export function checkAndExpandContainerBounds(
  container: ContainerNode,
  elementBounds: { minX: number; minY: number; maxX: number; maxY: number },
  padding: number = 40,
  headerHeight: number = 44,
  gridSnap: boolean = true
): ContainerExpansion {
  const curX = container.x;
  const curY = container.y;
  const curW = container.isCollapsed ? container.collapsedWidth : container.width;
  const curH = container.isCollapsed ? container.collapsedHeight : container.height;

  let newX = curX;
  let newY = curY;
  let newW = curW;
  let newH = curH;

  const expandedEdges = {
    left: false,
    right: false,
    top: false,
    bottom: false,
  };

  const snapStep = gridSnap ? 20 : 10;

  // 1. Right edge expansion
  if (elementBounds.maxX > curX + newW - padding) {
    const neededW = (elementBounds.maxX + padding) - curX;
    newW = Math.max(newW, Math.ceil(neededW / snapStep) * snapStep);
    expandedEdges.right = true;
  }

  // 2. Bottom edge expansion
  if (elementBounds.maxY > curY + newH - padding) {
    const neededH = (elementBounds.maxY + padding) - curY;
    newH = Math.max(newH, Math.ceil(neededH / snapStep) * snapStep);
    expandedEdges.bottom = true;
  }

  // 3. Left edge expansion
  if (elementBounds.minX < curX + padding) {
    const shiftLeft = (curX + padding) - elementBounds.minX;
    const snapShift = Math.ceil(shiftLeft / snapStep) * snapStep;
    newX = curX - snapShift;
    newW = newW + snapShift;
    expandedEdges.left = true;
  }

  // 4. Top edge expansion
  if (elementBounds.minY < curY + headerHeight + padding) {
    const shiftTop = (curY + headerHeight + padding) - elementBounds.minY;
    const snapShift = Math.ceil(shiftTop / snapStep) * snapStep;
    newY = curY - snapShift;
    newH = newH + snapShift;
    expandedEdges.top = true;
  }

  const shouldUpdate = newX !== curX || newY !== curY || newW !== curW || newH !== curH;

  return {
    shouldUpdate,
    x: newX,
    y: newY,
    width: Math.max(300, newW),
    height: Math.max(200, newH),
    expandedEdges,
  };
}


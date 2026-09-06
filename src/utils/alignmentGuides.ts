/**
 * Alignment & Smart Guides Utility (draw.io style)
 * Provides magnetic alignment snapping for moving elements relative to all other elements,
 * calculating alignment guidelines (edges, centers, equal spacing) and coordinates.
 */

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  tag?: string;
}

export type AlignmentType = 
  | 'center' 
  | 'left' 
  | 'right' 
  | 'top' 
  | 'bottom' 
  | 'middle' 
  | 'edge-to-edge'
  | 'spacing';

export interface AlignmentMarker {
  x: number;
  y: number;
}

export interface AlignmentGuide {
  id: string;
  orientation: 'vertical' | 'horizontal';
  coordinate: number; // x for vertical, y for horizontal
  start: number;      // min y for vertical, min x for horizontal
  end: number;        // max y for vertical, max x for horizontal
  targetIds: string[];
  type: AlignmentType;
  label: string;
  markers: AlignmentMarker[];
}

export interface SnapResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
  snappedX: boolean;
  snappedY: boolean;
}

/**
 * Calculates snap threshold in world coordinates based on viewport zoom.
 * Ensures consistent ~8px screen-feel across all zoom levels.
 */
export function getSnapThreshold(zoom: number): number {
  const safeZoom = Math.max(zoom, 0.15);
  return Math.max(4, Math.min(18, 8 / safeZoom));
}

/**
 * Main alignment function:
 * Compares dragged element's edges and center against all target elements.
 * Returns snapped coordinates (if within threshold) and visual guidelines.
 */
export function computeSmartAlignment(
  dragged: { x: number; y: number; width: number; height: number },
  targets: BoundingBox[],
  zoom: number,
  enableSmartGuides: boolean = true
): SnapResult {
  if (!enableSmartGuides || targets.length === 0) {
    return {
      x: dragged.x,
      y: dragged.y,
      guides: [],
      snappedX: false,
      snappedY: false,
    };
  }

  const threshold = getSnapThreshold(zoom);

  const dWidth = dragged.width;
  const dHeight = dragged.height;
  const rawX = dragged.x;
  const rawY = dragged.y;

  // Dragged key points
  const dLeft = rawX;
  const dCenterX = rawX + dWidth / 2;
  const dRight = rawX + dWidth;

  const dTop = rawY;
  const dCenterY = rawY + dHeight / 2;
  const dBottom = rawY + dHeight;

  // --- X-AXIS ALIGNMENT (Produces Vertical Guidelines) ---
  interface XCandidate {
    delta: number;
    guideX: number;
    type: AlignmentType;
    label: string;
    target: BoundingBox;
    draggedPointY: number;
    targetPointY: number;
    priority: number; // lower is higher priority (e.g. center-center = 0, edge-edge = 1)
  }

  const xCandidates: XCandidate[] = [];

  for (const t of targets) {
    const tLeft = t.x;
    const tCenterX = t.x + t.width / 2;
    const tRight = t.x + t.width;
    const tCenterY = t.y + t.height / 2;

    // 1. Center to Center
    const cDiff = tCenterX - dCenterX;
    if (Math.abs(cDiff) <= threshold) {
      xCandidates.push({
        delta: cDiff,
        guideX: tCenterX,
        type: 'center',
        label: 'Центр X',
        target: t,
        draggedPointY: dCenterY,
        targetPointY: tCenterY,
        priority: 0,
      });
    }

    // 2. Left to Left
    const llDiff = tLeft - dLeft;
    if (Math.abs(llDiff) <= threshold) {
      xCandidates.push({
        delta: llDiff,
        guideX: tLeft,
        type: 'left',
        label: 'Левый край',
        target: t,
        draggedPointY: dTop,
        targetPointY: t.y,
        priority: 1,
      });
    }

    // 3. Right to Right
    const rrDiff = tRight - dRight;
    if (Math.abs(rrDiff) <= threshold) {
      xCandidates.push({
        delta: rrDiff,
        guideX: tRight,
        type: 'right',
        label: 'Правый край',
        target: t,
        draggedPointY: dTop,
        targetPointY: t.y,
        priority: 1,
      });
    }

    // 4. Left to Right (adjacent)
    const lrDiff = tRight - dLeft;
    if (Math.abs(lrDiff) <= threshold) {
      xCandidates.push({
        delta: lrDiff,
        guideX: tRight,
        type: 'edge-to-edge',
        label: 'Стык (лево к право)',
        target: t,
        draggedPointY: dCenterY,
        targetPointY: tCenterY,
        priority: 2,
      });
    }

    // 5. Right to Left (adjacent)
    const rlDiff = tLeft - dRight;
    if (Math.abs(rlDiff) <= threshold) {
      xCandidates.push({
        delta: rlDiff,
        guideX: tLeft,
        type: 'edge-to-edge',
        label: 'Стык (право к лево)',
        target: t,
        draggedPointY: dCenterY,
        targetPointY: tCenterY,
        priority: 2,
      });
    }

    // 6. Center to Left / Right
    const clDiff = tLeft - dCenterX;
    if (Math.abs(clDiff) <= threshold) {
      xCandidates.push({
        delta: clDiff,
        guideX: tLeft,
        type: 'center',
        label: 'Центр к краю',
        target: t,
        draggedPointY: dCenterY,
        targetPointY: tCenterY,
        priority: 3,
      });
    }
    const crDiff = tRight - dCenterX;
    if (Math.abs(crDiff) <= threshold) {
      xCandidates.push({
        delta: crDiff,
        guideX: tRight,
        type: 'center',
        label: 'Центр к краю',
        target: t,
        draggedPointY: dCenterY,
        targetPointY: tCenterY,
        priority: 3,
      });
    }
  }

  let snappedX = rawX;
  let hasSnappedX = false;
  const activeVerticalGuides: AlignmentGuide[] = [];

  if (xCandidates.length > 0) {
    // Sort by smallest absolute delta, then by priority
    xCandidates.sort((a, b) => {
      const diffDist = Math.abs(a.delta) - Math.abs(b.delta);
      if (Math.abs(diffDist) > 0.001) return diffDist;
      return a.priority - b.priority;
    });

    const bestX = xCandidates[0];
    snappedX = rawX + bestX.delta;
    hasSnappedX = true;

    // Collect all candidates matching this best guide position
    const matchingX = xCandidates.filter(c => Math.abs(c.guideX - bestX.guideX) < 1);
    const targetNodes = matchingX.map(c => c.target);

    // Calculate vertical guideline span across dragged object + all matching targets
    const allMinY = Math.min(dTop, ...targetNodes.map(t => t.y));
    const allMaxY = Math.max(dBottom, ...targetNodes.map(t => t.y + t.height));

    const markers: AlignmentMarker[] = [
      { x: bestX.guideX, y: bestX.draggedPointY },
      ...matchingX.map(c => ({ x: bestX.guideX, y: c.targetPointY })),
    ];

    activeVerticalGuides.push({
      id: `guide-v-${Math.round(bestX.guideX)}`,
      orientation: 'vertical',
      coordinate: bestX.guideX,
      start: allMinY - 24,
      end: allMaxY + 24,
      targetIds: targetNodes.map(t => t.id),
      type: bestX.type,
      label: bestX.label,
      markers,
    });
  }

  // --- Y-AXIS ALIGNMENT (Produces Horizontal Guidelines) ---
  interface YCandidate {
    delta: number;
    guideY: number;
    type: AlignmentType;
    label: string;
    target: BoundingBox;
    draggedPointX: number;
    targetPointX: number;
    priority: number;
  }

  const yCandidates: YCandidate[] = [];

  for (const t of targets) {
    const tTop = t.y;
    const tCenterY = t.y + t.height / 2;
    const tBottom = t.y + t.height;
    const tCenterX = t.x + t.width / 2;

    // 1. Center to Center
    const cDiff = tCenterY - dCenterY;
    if (Math.abs(cDiff) <= threshold) {
      yCandidates.push({
        delta: cDiff,
        guideY: tCenterY,
        type: 'middle',
        label: 'Центр Y',
        target: t,
        draggedPointX: dCenterX,
        targetPointX: tCenterX,
        priority: 0,
      });
    }

    // 2. Top to Top
    const ttDiff = tTop - dTop;
    if (Math.abs(ttDiff) <= threshold) {
      yCandidates.push({
        delta: ttDiff,
        guideY: tTop,
        type: 'top',
        label: 'Верхний край',
        target: t,
        draggedPointX: dLeft,
        targetPointX: t.x,
        priority: 1,
      });
    }

    // 3. Bottom to Bottom
    const bbDiff = tBottom - dBottom;
    if (Math.abs(bbDiff) <= threshold) {
      yCandidates.push({
        delta: bbDiff,
        guideY: tBottom,
        type: 'bottom',
        label: 'Нижний край',
        target: t,
        draggedPointX: dLeft,
        targetPointX: t.x,
        priority: 1,
      });
    }

    // 4. Top to Bottom (adjacent)
    const tbDiff = tBottom - dTop;
    if (Math.abs(tbDiff) <= threshold) {
      yCandidates.push({
        delta: tbDiff,
        guideY: tBottom,
        type: 'edge-to-edge',
        label: 'Стык (верх к низу)',
        target: t,
        draggedPointX: dCenterX,
        targetPointX: tCenterX,
        priority: 2,
      });
    }

    // 5. Bottom to Top (adjacent)
    const btDiff = tTop - dBottom;
    if (Math.abs(btDiff) <= threshold) {
      yCandidates.push({
        delta: btDiff,
        guideY: tTop,
        type: 'edge-to-edge',
        label: 'Стык (низ к верху)',
        target: t,
        draggedPointX: dCenterX,
        targetPointX: tCenterX,
        priority: 2,
      });
    }

    // 6. Center to Top / Bottom
    const ctDiff = tTop - dCenterY;
    if (Math.abs(ctDiff) <= threshold) {
      yCandidates.push({
        delta: ctDiff,
        guideY: tTop,
        type: 'middle',
        label: 'Центр к краю',
        target: t,
        draggedPointX: dCenterX,
        targetPointX: tCenterX,
        priority: 3,
      });
    }
    const cbDiff = tBottom - dCenterY;
    if (Math.abs(cbDiff) <= threshold) {
      yCandidates.push({
        delta: cbDiff,
        guideY: tBottom,
        type: 'middle',
        label: 'Центр к краю',
        target: t,
        draggedPointX: dCenterX,
        targetPointX: tCenterX,
        priority: 3,
      });
    }
  }

  let snappedY = rawY;
  let hasSnappedY = false;
  const activeHorizontalGuides: AlignmentGuide[] = [];

  if (yCandidates.length > 0) {
    yCandidates.sort((a, b) => {
      const diffDist = Math.abs(a.delta) - Math.abs(b.delta);
      if (Math.abs(diffDist) > 0.001) return diffDist;
      return a.priority - b.priority;
    });

    const bestY = yCandidates[0];
    snappedY = rawY + bestY.delta;
    hasSnappedY = true;

    const matchingY = yCandidates.filter(c => Math.abs(c.guideY - bestY.guideY) < 1);
    const targetNodes = matchingY.map(c => c.target);

    const allMinX = Math.min(dLeft, ...targetNodes.map(t => t.x));
    const allMaxX = Math.max(dRight, ...targetNodes.map(t => t.x + t.width));

    const markers: AlignmentMarker[] = [
      { x: bestY.draggedPointX, y: bestY.guideY },
      ...matchingY.map(c => ({ x: c.targetPointX, y: bestY.guideY })),
    ];

    activeHorizontalGuides.push({
      id: `guide-h-${Math.round(bestY.guideY)}`,
      orientation: 'horizontal',
      coordinate: bestY.guideY,
      start: allMinX - 24,
      end: allMaxX + 24,
      targetIds: targetNodes.map(t => t.id),
      type: bestY.type,
      label: bestY.label,
      markers,
    });
  }

  return {
    x: Math.round(snappedX),
    y: Math.round(snappedY),
    guides: [...activeVerticalGuides, ...activeHorizontalGuides],
    snappedX: hasSnappedX,
    snappedY: hasSnappedY,
  };
}

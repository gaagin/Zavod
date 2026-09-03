import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  EquipmentNode, 
  ContainerNode, 
  ConnectionLink, 
  EquipmentStatus, 
  EquipmentType,
  LinkType,
  LinkStyle
} from '../types';
import { 
  getNodeRect, 
  isNodeHiddenByCollapsedAncestor, 
  getAllDescendantEquipment, 
  getBestConnectionPoints, 
  generateLinkPath,
  getAllDescendantContainerIds,
  isNodeInContainerSubtree,
  getContainerBreadcrumbs
} from '../utils/geometry';
import { 
  Cpu, 
  Zap, 
  Droplet, 
  Boxes, 
  Flame, 
  Settings2, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  PauseCircle, 
  ShieldAlert, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Share2, 
  Trash2, 
  Gauge,
  Radio,
  ExternalLink,
  Layers,
  Maximize2,
  Minimize2,
  Focus,
  Scan,
  ArrowLeft,
  Package,
  X,
  Sliders,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer,
  Undo2
} from 'lucide-react';

export const Canvas: React.FC = () => {
  const {
    state,
    selectedId,
    setSelectedId,
    activeTool,
    setActiveTool,
    connectingSourceId,
    setConnectingSourceId,
    linkDraftType,
    viewport,
    setViewport,
    updateEquipment,
    updateContainer,
    toggleContainerCollapse,
    deleteEquipment,
    deleteContainer,
    addLink,
    deleteLink,
    addEmptyEquipment,
    setIsCreateEquipmentOpen,
    currentUser,
    userCursors,
    broadcastCursor,
    gridSnap,
    focusNode,
    focusedContainerId,
    setFocusedContainerId,
    isFocusFullscreen,
    setIsFocusFullscreen,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
    fitContainerToScreen,
    zoomIn,
    zoomOut,
    zoomReset,
    undo,
    canUndo,
    recordHistorySnapshot,
  } = useFactory();

  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<{ id: string; type: 'equipment' | 'container'; initialX: number; initialY: number; mouseStartX: number; mouseStartY: number } | null>(null);
  const [cursorPosOnCanvas, setCursorPosOnCanvas] = useState<{ x: number; y: number } | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);

  // Spacebar panning support
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  // Screen to Canvas Coordinates helper
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - viewport.panX) / viewport.zoom;
    const y = (screenY - rect.top - viewport.panY) / viewport.zoom;
    return { x, y };
  }, [viewport]);

  // Snap to 20px grid helper
  const snap = (val: number) => {
    if (!gridSnap) return Math.round(val);
    const gridSize = 20;
    return Math.round(val / gridSize) * gridSize;
  };

  // Zoom on wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(2.5, Math.max(0.2, Number((viewport.zoom * zoomFactor).toFixed(3))));

    // Zoom towards mouse pointer
    const newPanX = mouseX - (mouseX - viewport.panX) * (newZoom / viewport.zoom);
    const newPanY = mouseY - (mouseY - viewport.panY) * (newZoom / viewport.zoom);

    setViewport({ panX: newPanX, panY: newPanY, zoom: newZoom });
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      // Middle click or space pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      // Left click on empty canvas: deselect or cancel connect
      if (connectingSourceId) {
        setConnectingSourceId(null);
        setConnectingMousePos(null);
      } else {
        setSelectedId(null);
      }
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvasPt = screenToCanvas(e.clientX, e.clientY);
    setCursorPosOnCanvas(canvasPt);

    // Broadcast cursor position to other users throttled
    broadcastCursor({ x: Math.round(canvasPt.x), y: Math.round(canvasPt.y) });

    if (isPanning) {
      setViewport(v => ({
        ...v,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      }));
      return;
    }

    if (connectingSourceId) {
      setConnectingMousePos(canvasPt);
    }

    if (draggedNode && (currentUser.role === 'admin' || currentUser.role === 'operator')) {
      const dx = (e.clientX - draggedNode.mouseStartX) / viewport.zoom;
      const dy = (e.clientY - draggedNode.mouseStartY) / viewport.zoom;

      const rawNewX = draggedNode.initialX + dx;
      const rawNewY = draggedNode.initialY + dy;
      const newX = snap(rawNewX);
      const newY = snap(rawNewY);

      applyNodePositionChange(draggedNode.id, draggedNode.type, newX, newY);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedNode(null);
  };

  // Node Drag Start
  const startDragNode = (e: React.MouseEvent, id: string, type: 'equipment' | 'container', initialX: number, initialY: number) => {
    if (activeTool === 'connect') {
      handleNodeConnectClick(id);
      return;
    }

    if (e.button !== 0 || isSpacePressed || activeTool === 'pan') return;
    e.stopPropagation();

    setSelectedId(id);
    if (currentUser.role === 'admin' || currentUser.role === 'operator') {
      recordHistorySnapshot();
      setDraggedNode({
        id,
        type,
        initialX,
        initialY,
        mouseStartX: e.clientX,
        mouseStartY: e.clientY
      });
    }
  };

  // Connect Click handler
  const handleNodeConnectClick = (nodeId: string) => {
    if (currentUser.role === 'viewer') return;

    if (!connectingSourceId) {
      setConnectingSourceId(nodeId);
    } else {
      if (connectingSourceId !== nodeId) {
        addLink(connectingSourceId, nodeId, linkDraftType, 'orthogonal');
      }
      setConnectingSourceId(null);
      setConnectingMousePos(null);
      setActiveTool('select');
    }
  };

  // Unified node position update helper (used by both mouse and touch handlers)
  const applyNodePositionChange = useCallback((id: string, type: 'equipment' | 'container', newX: number, newY: number) => {
    if (type === 'equipment') {
      const eq = state.equipment.find(item => item.id === id);
      if (eq && (eq.x !== newX || eq.y !== newY)) {
        // Check if dragging into a container
        const targetCont = state.containers.find(c => 
          !c.isCollapsed &&
          newX >= c.x && newX + eq.width <= c.x + c.width &&
          newY >= c.y && newY + eq.height <= c.y + c.height
        );
        const newParentId = targetCont ? targetCont.id : null;
        updateEquipment(id, { x: newX, y: newY, parentId: newParentId }, undefined, true);
      }
    } else if (type === 'container') {
      const cont = state.containers.find(c => c.id === id);
      if (cont && (cont.x !== newX || cont.y !== newY)) {
        const shiftX = newX - cont.x;
        const shiftY = newY - cont.y;

        // Move container
        updateContainer(id, { x: newX, y: newY }, undefined, true);

        // Also move all nested equipment
        const nestedEq = state.equipment.filter(eq => eq.parentId === cont.id);
        nestedEq.forEach(eq => {
          updateEquipment(eq.id, { x: snap(eq.x + shiftX), y: snap(eq.y + shiftY) }, undefined, true);
        });

        // Also move child nested containers
        const childContainers = state.containers.filter(c => c.parentId === cont.id);
        childContainers.forEach(cc => {
          updateContainer(cc.id, { x: snap(cc.x + shiftX), y: snap(cc.y + shiftY) }, undefined, true);
        });
      }
    }
  }, [state.equipment, state.containers, updateEquipment, updateContainer, gridSnap]);

  // Touch & Mobile Interaction Engine
  const touchStateRef = useRef({
    viewport,
    state,
    activeTool,
    currentUser,
    connectingSourceId,
    gridSnap,
    recordHistorySnapshot,
  });
  touchStateRef.current = {
    viewport,
    state,
    activeTool,
    currentUser,
    connectingSourceId,
    gridSnap,
    recordHistorySnapshot,
  };

  const touchTrackingRef = useRef<{
    touchCount: number;
    touchStartX: number;
    touchStartY: number;
    hasMoved: boolean;
    draggedNodeId: string | null;
    draggedNodeType: 'equipment' | 'container' | null;
    initialNodeX: number;
    initialNodeY: number;
    isPanning: boolean;
    initialPanX: number;
    initialPanY: number;
    isPinching: boolean;
    initialPinchDist: number;
    initialPinchZoom: number;
    initialPinchMidX: number;
    initialPinchMidY: number;
    initialPinchPanX: number;
    initialPinchPanY: number;
  }>({
    touchCount: 0,
    touchStartX: 0,
    touchStartY: 0,
    hasMoved: false,
    draggedNodeId: null,
    draggedNodeType: null,
    initialNodeX: 0,
    initialNodeY: 0,
    isPanning: false,
    initialPanX: 0,
    initialPanY: 0,
    isPinching: false,
    initialPinchDist: 0,
    initialPinchZoom: 1,
    initialPinchMidX: 0,
    initialPinchMidY: 0,
    initialPinchPanX: 0,
    initialPinchPanY: 0,
  });

  const [touchDraggingNodeId, setTouchDraggingNodeId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const { viewport: curVp, state: curSt, activeTool: curTool } = touchStateRef.current;
      const t = touchTrackingRef.current;
      t.touchCount = e.touches.length;
      t.hasMoved = false;

      // If user tapped a button or interactive child inside node, let default handle it
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a')) {
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        t.touchStartX = touch.clientX;
        t.touchStartY = touch.clientY;

        const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
        if (nodeEl && curTool !== 'pan') {
          const id = nodeEl.dataset.nodeId!;
          const type = nodeEl.dataset.nodeType as 'equipment' | 'container';
          touchStateRef.current.recordHistorySnapshot();
          t.draggedNodeId = id;
          t.draggedNodeType = type;
          t.isPanning = false;
          t.isPinching = false;
          setTouchDraggingNodeId(id);

          if (type === 'equipment') {
            const eq = curSt.equipment.find(item => item.id === id);
            if (eq) {
              t.initialNodeX = eq.x;
              t.initialNodeY = eq.y;
            }
          } else if (type === 'container') {
            const cont = curSt.containers.find(item => item.id === id);
            if (cont) {
              t.initialNodeX = cont.x;
              t.initialNodeY = cont.y;
            }
          }
        } else {
          t.draggedNodeId = null;
          t.draggedNodeType = null;
          t.isPanning = true;
          t.isPinching = false;
          t.initialPanX = curVp.panX;
          t.initialPanY = curVp.panY;
        }
      } else if (e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        t.draggedNodeId = null;
        t.draggedNodeType = null;
        setTouchDraggingNodeId(null);
        t.isPanning = false;
        t.isPinching = true;
        t.initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        t.initialPinchZoom = curVp.zoom;
        t.initialPinchMidX = (t1.clientX + t2.clientX) / 2;
        t.initialPinchMidY = (t1.clientY + t2.clientY) / 2;
        t.initialPinchPanX = curVp.panX;
        t.initialPinchPanY = curVp.panY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // Prevent browser default window scrolling and elastic bounce
      e.preventDefault();

      const { viewport: curVp, currentUser: curUsr, gridSnap: curSnap } = touchStateRef.current;
      const t = touchTrackingRef.current;

      if (t.isPinching && e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (t.initialPinchDist > 0) {
          const ratio = dist / t.initialPinchDist;
          const newZoom = Math.min(2.5, Math.max(0.2, Number((t.initialPinchZoom * ratio).toFixed(3))));
          
          const curMidX = (t1.clientX + t2.clientX) / 2;
          const curMidY = (t1.clientY + t2.clientY) / 2;

          const rect = el.getBoundingClientRect();
          const midCanvasX = (t.initialPinchMidX - rect.left - t.initialPinchPanX) / t.initialPinchZoom;
          const midCanvasY = (t.initialPinchMidY - rect.top - t.initialPinchPanY) / t.initialPinchZoom;

          const newPanX = (curMidX - rect.left) - midCanvasX * newZoom;
          const newPanY = (curMidY - rect.top) - midCanvasY * newZoom;

          setViewport({ panX: newPanX, panY: newPanY, zoom: newZoom });
        }
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - t.touchStartX;
        const dy = touch.clientY - t.touchStartY;

        if (Math.hypot(dx, dy) > 4) {
          t.hasMoved = true;
        }

        if (t.draggedNodeId && t.draggedNodeType && (curUsr.role === 'admin' || curUsr.role === 'operator')) {
          if (t.hasMoved) {
            const rawX = t.initialNodeX + dx / curVp.zoom;
            const rawY = t.initialNodeY + dy / curVp.zoom;
            const newX = curSnap ? Math.round(rawX / 20) * 20 : Math.round(rawX);
            const newY = curSnap ? Math.round(rawY / 20) * 20 : Math.round(rawY);

            applyNodePositionChange(t.draggedNodeId, t.draggedNodeType, newX, newY);
          }
        } else if (t.isPanning) {
          if (t.hasMoved) {
            setViewport(v => ({
              ...v,
              panX: t.initialPanX + dx,
              panY: t.initialPanY + dy,
            }));
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const { activeTool: curTool, connectingSourceId: curSrc } = touchStateRef.current;
      const t = touchTrackingRef.current;

      if (t.isPinching) {
        if (e.touches.length < 2) {
          t.isPinching = false;
        }
      }

      if (e.touches.length === 0) {
        if (!t.hasMoved) {
          // Tap action!
          if (t.draggedNodeId) {
            if (curTool === 'connect') {
              handleNodeConnectClick(t.draggedNodeId);
            } else {
              setSelectedId(t.draggedNodeId);
            }
          } else {
            if (curSrc) {
              setConnectingSourceId(null);
              setConnectingMousePos(null);
            } else {
              setSelectedId(null);
            }
          }
        }

        t.draggedNodeId = null;
        t.draggedNodeType = null;
        setTouchDraggingNodeId(null);
        t.isPanning = false;
        t.hasMoved = false;
        t.touchCount = 0;
      }
    };

    const onTouchCancel = () => {
      const t = touchTrackingRef.current;
      t.draggedNodeId = null;
      t.draggedNodeType = null;
      setTouchDraggingNodeId(null);
      t.isPanning = false;
      t.isPinching = false;
      t.hasMoved = false;
      t.touchCount = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [applyNodePositionChange, handleNodeConnectClick, setSelectedId, setConnectingSourceId, setViewport]);

  // Focus Mode context computations
  const focusedContainer = useMemo(() => {
    if (!focusedContainerId) return null;
    return state.containers.find(c => c.id === focusedContainerId) || null;
  }, [focusedContainerId, state.containers]);

  // Breadcrumbs path from factory root to current focused container
  const breadcrumbs = useMemo(() => {
    if (!focusedContainerId) return [];
    return getContainerBreadcrumbs(focusedContainerId, state.containers);
  }, [focusedContainerId, state.containers]);

  const focusedSubtreeContainerIds = useMemo(() => {
    if (!focusedContainerId) return null;
    return getAllDescendantContainerIds(focusedContainerId, state.containers);
  }, [focusedContainerId, state.containers]);

  const focusedEquipment = useMemo(() => {
    if (!focusedContainerId) return [];
    return getAllDescendantEquipment(focusedContainerId, state.containers, state.equipment);
  }, [focusedContainerId, state.containers, state.equipment]);

  const focusedTotalKw = useMemo(() => {
    return focusedEquipment.reduce((sum, e) => sum + (e.powerKw || 0), 0);
  }, [focusedEquipment]);

  const focusedCritCount = useMemo(() => {
    return focusedEquipment.filter(e => e.status === 'critical').length;
  }, [focusedEquipment]);

  const handleToggleFullscreen = () => {
    setIsFocusFullscreen(prev => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      }
      return next;
    });
  };

  // Filter visible equipment:
  // When in focus mode, the container fills the entire working window.
  // ONLY equipment belonging to this focused container (or its child sub-containers) is rendered.
  // Outside equipment is NOT rendered at all (clean view, no dimming).
  const visibleEquipment = useMemo(() => {
    if (focusedContainerId && focusedSubtreeContainerIds) {
      return state.equipment.filter(eq => 
        Boolean(eq.parentId && focusedSubtreeContainerIds.has(eq.parentId)) &&
        !isNodeHiddenByCollapsedAncestor(eq.parentId, state.containers)
      );
    }
    return state.equipment.filter(eq => !isNodeHiddenByCollapsedAncestor(eq.parentId, state.containers));
  }, [state.equipment, state.containers, focusedContainerId, focusedSubtreeContainerIds]);

  // Filter visible containers:
  // When in focus mode, the focused container itself fills the entire working window.
  // Only its child sub-containers nested inside are rendered on the floor.
  // Outside containers are NOT rendered at all (clean view, no dimming).
  const visibleContainers = useMemo(() => {
    if (focusedContainerId && focusedSubtreeContainerIds) {
      return state.containers.filter(c => 
        c.id !== focusedContainerId && 
        focusedSubtreeContainerIds.has(c.id) &&
        !isNodeHiddenByCollapsedAncestor(c.parentId, state.containers)
      );
    }
    return state.containers.filter(c => !isNodeHiddenByCollapsedAncestor(c.parentId, state.containers));
  }, [state.containers, focusedContainerId, focusedSubtreeContainerIds]);

  // Icons for equipment types
  const getEquipmentIcon = (type: EquipmentType) => {
    switch (type) {
      case 'cnc': return <Cpu className="w-4 h-4 text-sky-500" />;
      case 'pump': return <Droplet className="w-4 h-4 text-cyan-500" />;
      case 'motor': return <RotateCw className="w-4 h-4 text-emerald-500" />;
      case 'conveyor': return <Boxes className="w-4 h-4 text-teal-500" />;
      case 'transformer': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'robot': return <Settings2 className="w-4 h-4 text-purple-500" />;
      case 'compressor': return <Gauge className="w-4 h-4 text-blue-500" />;
      case 'furnace': return <Flame className="w-4 h-4 text-orange-500" />;
      case 'cabinet': return <Radio className="w-4 h-4 text-indigo-500" />;
      default: return <Cpu className="w-4 h-4 text-slate-400" />;
    }
  };

  // Status visual styles
  const getStatusStyles = (status: EquipmentStatus) => {
    switch (status) {
      case 'normal':
        return {
          border: 'border-emerald-500/60',
          badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          label: 'В норме',
          icon: CheckCircle2,
          pulse: false,
        };
      case 'warning':
        return {
          border: 'border-amber-500/70 ring-2 ring-amber-500/20',
          badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          label: 'Внимание',
          icon: AlertTriangle,
          pulse: true,
        };
      case 'critical':
        return {
          border: 'border-red-500 ring-2 ring-red-500/40 animate-pulse',
          badgeBg: 'bg-red-500/20 text-red-400 border-red-500/50',
          label: 'АВАРИЯ',
          icon: ShieldAlert,
          pulse: true,
        };
      case 'maintenance':
        return {
          border: 'border-indigo-500/60',
          badgeBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
          label: 'Техобслуживание',
          icon: Wrench,
          pulse: false,
        };
      case 'idle':
        return {
          border: 'border-white/20',
          badgeBg: 'bg-white/10 text-slate-300 border-white/20',
          label: 'Простой',
          icon: PauseCircle,
          pulse: false,
        };
      case 'standby':
        return {
          border: 'border-purple-500/60',
          badgeBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          label: 'Резерв',
          icon: CheckCircle2,
          pulse: false,
        };
    }
  };

  return (
    <div
      ref={containerRef}
      id="factory-canvas-container"
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      style={isFocusFullscreen ? { height: 'var(--app-height, 100dvh)' } : undefined}
      className={`${
        isFocusFullscreen
          ? 'fixed inset-0 z-40 w-full h-full h-[100dvh]'
          : 'relative w-full h-full'
      } overflow-hidden bg-[#09090B] select-none transition-all touch-none ${
        isPanning || isSpacePressed || activeTool === 'pan' 
          ? 'cursor-grab active:cursor-grabbing' 
          : activeTool === 'connect' 
          ? 'cursor-crosshair' 
          : 'cursor-default'
      }`}
    >
      {/* Background Dot Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern
            id="dot-grid"
            width={24 * viewport.zoom}
            height={24 * viewport.zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewport.panX}, ${viewport.panY})`}
          >
            <circle cx="2" cy="2" r="1.2" className="fill-white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Main Transform Layer */}
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        }}
      >
        {/* SVG Links Layer */}
        <svg
          className="absolute top-0 left-0 overflow-visible pointer-events-none"
          style={{ width: 1, height: 1 }}
        >
          <defs>
            {/* Arrowhead Markers */}
            <marker
              id="arrow-power"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#eab308" />
            </marker>
            <marker
              id="arrow-pipe"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
            </marker>
            <marker
              id="arrow-conveyor"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker
              id="arrow-signal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
            </marker>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
          </defs>

          {/* Render Connection Links */}
          {state.links.map(link => {
            const fromRect = getNodeRect(link.fromId, state.equipment, state.containers);
            const toRect = getNodeRect(link.toId, state.equipment, state.containers);

            if (!fromRect || !toRect) return null;

            // Check if hidden by collapsed parent
            const fromHidden = isNodeHiddenByCollapsedAncestor(
              state.equipment.find(e => e.id === link.fromId)?.parentId || state.containers.find(c => c.id === link.fromId)?.parentId,
              state.containers
            );
            const toHidden = isNodeHiddenByCollapsedAncestor(
              state.equipment.find(e => e.id === link.toId)?.parentId || state.containers.find(c => c.id === link.toId)?.parentId,
              state.containers
            );

            if (fromHidden || toHidden) return null;

            // If in focus mode: only show links where BOTH nodes belong to this focused container subtree
            if (focusedContainerId) {
              const fromIn = isNodeInContainerSubtree(link.fromId, focusedContainerId, state.containers, state.equipment);
              const toIn = isNodeInContainerSubtree(link.toId, focusedContainerId, state.containers, state.equipment);
              if (!fromIn || !toIn) return null;
            }

            const { from: ptFrom, to: ptTo } = getBestConnectionPoints(fromRect, toRect);
            const { pathD, midPoint } = generateLinkPath(ptFrom, ptTo, link.style);

            const isSelected = selectedId === link.id;
            const markerId = `arrow-${link.type || 'default'}`;

            return (
              <g 
                key={link.id} 
                className="pointer-events-auto group cursor-pointer transition-opacity duration-200"
              >
                {/* Thick invisible hit-target for easy clicking */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(link.id);
                  }}
                />

                {/* Base Link Shadow / Glow */}
                {isSelected && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="8"
                    opacity="0.5"
                  />
                )}

                {/* Main Path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={link.color || '#64748b'}
                  strokeWidth={isSelected ? '3.5' : '2.5'}
                  strokeDasharray={link.animated ? (link.type === 'pipe' ? '8 4' : link.type === 'conveyor' ? '6 6' : link.type === 'signal' ? '3 3' : undefined) : undefined}
                  className={link.animated ? 'animate-[dash_1.5s_linear_infinite]' : ''}
                  markerEnd={`url(#${markerId})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(link.id);
                  }}
                />

                {/* Link Label Tag */}
                {link.label && (
                  <g
                    transform={`translate(${midPoint.x}, ${midPoint.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(link.id);
                    }}
                  >
                    <rect
                      x="-60"
                      y="-11"
                      width="120"
                      height="22"
                      rx="6"
                      className="fill-[#0F0F12] stroke-white/20 shadow-md"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      className="text-[10px] font-semibold fill-slate-300 pointer-events-none select-none"
                    >
                      {link.label.length > 20 ? link.label.slice(0, 18) + '...' : link.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Interactive Connection Drawing Line */}
          {connectingSourceId && connectingMousePos && (
            (() => {
              const srcRect = getNodeRect(connectingSourceId, state.equipment, state.containers);
              if (!srcRect) return null;
              const srcCenter = { x: srcRect.x + srcRect.width / 2, y: srcRect.y + srcRect.height / 2 };
              return (
                <line
                  x1={srcCenter.x}
                  y1={srcCenter.y}
                  x2={connectingMousePos.x}
                  y2={connectingMousePos.y}
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
              );
            })()
          )}
        </svg>

        {/* Containers Layer (Deep nesting supported) */}
        {visibleContainers.map(container => {
          const isSelected = selectedId === container.id;
          const isThisFocused = focusedContainerId === container.id;
          const descendantEquipment = getAllDescendantEquipment(container.id, state.containers, state.equipment);
          const okCount = descendantEquipment.filter(e => e.status === 'normal').length;
          const warnCount = descendantEquipment.filter(e => e.status === 'warning').length;
          const critCount = descendantEquipment.filter(e => e.status === 'critical').length;
          const totalKw = descendantEquipment.reduce((acc, e) => acc + (e.powerKw || 0), 0);

          if (container.isCollapsed) {
            // Collapsed view: compact summary pill
            return (
              <div
                key={container.id}
                id={`container-${container.id}`}
                data-node-id={container.id}
                data-node-type="container"
                style={{
                  transform: `translate(${container.x}px, ${container.y}px)`,
                  width: container.collapsedWidth,
                  height: container.collapsedHeight,
                  borderColor: container.color,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(container.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  enterFocusMode(container.id);
                }}
                onMouseDown={(e) => startDragNode(e, container.id, 'container', container.x, container.y)}
                className={`absolute rounded-2xl border-2 bg-[#0F0F12]/95 backdrop-blur-md shadow-xl p-3 transition-all touch-none ${
                  touchDraggingNodeId === container.id ? 'ring-4 ring-blue-400 scale-[1.02] shadow-2xl z-30' : ''
                } ${
                  isThisFocused 
                    ? 'ring-4 ring-blue-500/80 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.35)] z-20' 
                    : isSelected ? 'ring-2 ring-blue-500 shadow-2xl' : 'hover:border-white/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleContainerCollapse(container.id);
                      }}
                      className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                      title="Развернуть цех"
                    >
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                    </button>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: container.color }}
                    >
                      {container.tag}
                    </span>
                    <span className="font-bold text-xs text-white truncate">
                      {container.name}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      enterFocusMode(container.id);
                    }}
                    className="p-1 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 ml-auto"
                    title="Развернуть в фокусный режим на весь экран (F)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Collapsed Metrics Strip */}
                <div className="flex items-center justify-between pt-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                      {okCount} ОК
                    </span>
                    {warnCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                        {warnCount} Вним
                      </span>
                    )}
                    {critCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold animate-pulse">
                        {critCount} АВАРИЯ
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-400">
                    {totalKw.toFixed(0)} кВт
                  </span>
                </div>
              </div>
            );
          }

          // Expanded view: Full container layout
          return (
            <div
              key={container.id}
              id={`container-${container.id}`}
              style={{
                transform: `translate(${container.x}px, ${container.y}px)`,
                width: container.width,
                height: container.height,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(container.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                toggleFocusMode(container.id);
              }}
              className={`absolute rounded-2xl border-2 transition-all bg-[#0F0F12]/30 backdrop-blur-xs ${
                isThisFocused
                  ? 'ring-4 ring-blue-500/80 border-blue-400 shadow-[0_0_60px_rgba(59,130,246,0.35)] z-20'
                  : isSelected 
                  ? 'ring-2 ring-blue-500 border-blue-500/60 shadow-2xl' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Container Header Bar (Draggable) */}
              <div
                data-node-id={container.id}
                data-node-type="container"
                onMouseDown={(e) => startDragNode(e, container.id, 'container', container.x, container.y)}
                className={`h-11 px-3 flex items-center justify-between border-b border-white/10 rounded-t-2xl cursor-move bg-white/5 transition-colors touch-none ${
                  touchDraggingNodeId === container.id ? 'bg-blue-500/20' : ''
                }`}
                style={{ borderLeft: `6px solid ${container.color}` }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleContainerCollapse(container.id);
                    }}
                    className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                    title="Свернуть контейнер"
                  >
                    <ChevronDown className="w-4 h-4 text-blue-400" />
                  </button>

                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white tracking-wide"
                    style={{ backgroundColor: container.color }}
                  >
                    {container.tag}
                  </span>

                  <span className="font-bold text-xs text-white truncate">
                    {container.name}
                  </span>

                  {isThisFocused && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse">
                      <Focus className="w-3 h-3" />
                      <span>В ФОКУСЕ</span>
                    </span>
                  )}

                  {container.manager && (
                    <span className="text-[10px] text-slate-400 hidden sm:inline truncate">
                      ({container.manager})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFocusMode(container.id);
                    }}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                      isThisFocused
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                        : 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-300'
                    }`}
                    title={isThisFocused ? "Выйти из фокусного режима (Esc / F)" : "Войти в фокусный режим на весь экран (F / двойной клик)"}
                  >
                    {isThisFocused ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {descendantEquipment.length} ед.
                  </span>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteContainer(container.id);
                      }}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Удалить контейнер"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Container status badge in bottom left */}
              <div className="absolute bottom-2 left-3 flex items-center gap-2 pointer-events-none opacity-60 text-[10px] text-slate-400 font-mono">
                <span>Общая нагрузка: {totalKw.toFixed(1)} кВт</span>
                {critCount > 0 && <span className="text-red-400 font-bold">⚠️ Аварий: {critCount}</span>}
              </div>
            </div>
          );
        })}

        {/* Equipment Blocks Layer */}
        {visibleEquipment.map(equipment => {
          const isSelected = selectedId === equipment.id;
          const statusStyle = getStatusStyles(equipment.status);
          const StatusIcon = statusStyle.icon;

          return (
            <div
              key={equipment.id}
              id={`equipment-${equipment.id}`}
              data-node-id={equipment.id}
              data-node-type="equipment"
              style={{
                transform: `translate(${equipment.x}px, ${equipment.y}px)`,
                width: equipment.width,
                height: equipment.height,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'connect') {
                  handleNodeConnectClick(equipment.id);
                } else {
                  setSelectedId(equipment.id);
                }
              }}
              onMouseDown={(e) => startDragNode(e, equipment.id, 'equipment', equipment.x, equipment.y)}
              className={`absolute rounded-xl border p-3 bg-[#0F0F12] shadow-xl transition-all flex flex-col justify-between cursor-move group select-none text-slate-300 touch-none ${
                statusStyle.border
              } ${
                touchDraggingNodeId === equipment.id ? 'ring-4 ring-blue-400 scale-[1.03] shadow-2xl z-30' : ''
              } ${
                isSelected ? 'ring-2 ring-blue-500 shadow-2xl scale-[1.01]' : 'hover:border-white/30'
              } ${
                connectingSourceId === equipment.id ? 'ring-2 ring-blue-400 animate-pulse' : ''
              }`}
            >
              {/* Card Header: Tag, Icon, Name */}
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div className="p-1.5 rounded-lg bg-white/5 text-slate-300">
                      {getEquipmentIcon(equipment.equipmentType)}
                    </div>
                    <span className="font-mono text-[11px] font-bold text-white tracking-tight">
                      {equipment.tag}
                    </span>
                  </div>

                  {/* Status Pill */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle.badgeBg}`}>
                    <StatusIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{statusStyle.label}</span>
                  </div>
                </div>

                {/* Name */}
                <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                  {equipment.name}
                </h4>

                {equipment.model && (
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {equipment.model}
                  </div>
                )}
              </div>

              {/* Dynamic Telemetry / Property Chips */}
              <div className="space-y-1 my-1.5 pt-1.5 border-t border-white/10 text-[10px]">
                {equipment.powerKw !== undefined && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Мощность:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {equipment.powerKw} кВт
                    </span>
                  </div>
                )}

                {/* Display up to 2 primary custom properties on card face */}
                {equipment.properties.slice(0, 2).map(prop => (
                  <div key={prop.id} className="flex items-center justify-between text-slate-400">
                    <span className="truncate max-w-[90px]">{prop.name}:</span>
                    <span className="font-mono font-medium text-slate-200">
                      {prop.value} {prop.unit || ''}
                    </span>
                  </div>
                ))}

                {/* Empty equipment quick fill prompt */}
                {equipment.powerKw === undefined && equipment.properties.length === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(equipment.id);
                    }}
                    className="w-full py-1 px-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-dashed border-blue-500/30 text-[10px] text-blue-300 font-medium flex items-center justify-center gap-1 transition-colors group/btn"
                    title="Открыть инспектор для заполнения параметров"
                  >
                    <Sliders className="w-3 h-3 group-hover/btn:rotate-45 transition-transform" />
                    <span>Настроить свойства</span>
                  </button>
                )}
              </div>

              {/* Card Footer: Connector Anchor Target button on hover */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] text-slate-400">
                <span className="truncate">
                  {equipment.lastMaintenanceDate ? `ТО: ${equipment.lastMaintenanceDate.slice(5)}` : 'Штатно'}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeConnectClick(equipment.id);
                  }}
                  className="p-1 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white text-slate-400 transition-colors"
                  title="Создать связь от этого блока"
                >
                  <Share2 className="w-3 h-3" />
                </button>
              </div>

              {/* 4 Directional Connection Anchor Points */}
              <div 
                onClick={(e) => { e.stopPropagation(); handleNodeConnectClick(equipment.id); }}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#09090B] opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-pointer shadow-sm z-10" 
                title="Подключить сверху"
              />
              <div 
                onClick={(e) => { e.stopPropagation(); handleNodeConnectClick(equipment.id); }}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#09090B] opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-pointer shadow-sm z-10" 
                title="Подключить снизу"
              />
              <div 
                onClick={(e) => { e.stopPropagation(); handleNodeConnectClick(equipment.id); }}
                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#09090B] opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-pointer shadow-sm z-10" 
                title="Подключить слева"
              />
              <div 
                onClick={(e) => { e.stopPropagation(); handleNodeConnectClick(equipment.id); }}
                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#09090B] opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-pointer shadow-sm z-10" 
                title="Подключить справа"
              />
            </div>
          );
        })}

        {/* Remote Users Live Cursors */}
        {Object.entries(userCursors).map(([clientId, rawData]) => {
          const data = rawData as { cursor?: { x: number; y: number }; user?: { name?: string; color?: string } };
          if (!data || !data.cursor) return null;
          const user = data.user;
          return (
            <div
              key={clientId}
              style={{
                transform: `translate(${data.cursor.x}px, ${data.cursor.y}px)`,
              }}
              className="absolute pointer-events-none z-50 transition-transform duration-75 ease-out"
            >
              {/* Cursor SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill={user?.color || '#3b82f6'}>
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" stroke="#fff" strokeWidth="1.5" />
              </svg>
              {/* User Label Tag */}
              <div
                style={{ backgroundColor: user?.color || '#3b82f6' }}
                className="ml-4 -mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md whitespace-nowrap"
              >
                {user?.name || 'Инженер'}
              </div>
            </div>
          );
        })}
        {/* Empty Container State inside focus mode */}
        {focusedContainer && visibleEquipment.length === 0 && visibleContainers.length === 0 && (
          <div 
            style={{
              transform: `translate(${focusedContainer.x + 30}px, ${focusedContainer.y + 60}px)`,
              width: Math.max(340, focusedContainer.width - 60),
            }}
            className="absolute p-6 rounded-2xl bg-white/5 border border-dashed border-white/15 text-center select-none backdrop-blur-xs z-10"
          >
            <Boxes className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-60" />
            <h4 className="text-xs font-bold text-white mb-1">Участок пока пуст</h4>
            <p className="text-[11px] text-slate-400 mb-3">
              Добавьте пустое оборудование для ручной настройки свойств или воспользуйтесь мастером параметров.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => addEmptyEquipment(focusedContainer.id)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-98"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>+ Пустое оборудование</span>
              </button>
              <button
                onClick={() => setIsCreateEquipmentOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Мастер параметров...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Minimap (Bottom Right) */}
      <div 
        id="canvas-minimap"
        className="absolute bottom-6 right-6 w-48 h-36 bg-[#0F0F12]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto select-none hidden sm:block"
      >
        <div className="px-2 py-1 bg-white/5 border-b border-white/10 flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span className="truncate max-w-[100px]">{focusedContainer ? focusedContainer.tag : 'Схема завода'}</span>
          <span>{visibleEquipment.length} ед.</span>
        </div>
        <div 
          className="relative w-full h-[calc(100%-24px)] cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const targetCanvasX = (clickX / rect.width) * 2400 - 400;
            const targetCanvasY = (clickY / rect.height) * 1600 - 300;
            setViewport(v => ({
              ...v,
              panX: window.innerWidth / 2 - targetCanvasX * v.zoom,
              panY: window.innerHeight / 2 - targetCanvasY * v.zoom,
            }));
          }}
        >
          {/* Scaled nodes representation */}
          {visibleContainers.map(c => (
            <div
              key={c.id}
              style={{
                left: `${((c.x + 400) / 2400) * 100}%`,
                top: `${((c.y + 300) / 1600) * 100}%`,
                width: `${(c.width / 2400) * 100}%`,
                height: `${(c.height / 1600) * 100}%`,
                borderColor: c.color,
              }}
              className="absolute border rounded-xs opacity-60 bg-white/5 pointer-events-none"
            />
          ))}
          {visibleEquipment.map(eq => (
            <div
              key={eq.id}
              style={{
                left: `${((eq.x + 400) / 2400) * 100}%`,
                top: `${((eq.y + 300) / 1600) * 100}%`,
              }}
              className={`absolute w-1.5 h-1.5 rounded-full pointer-events-none ${
                eq.status === 'critical' ? 'bg-red-500 animate-ping' : eq.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          ))}

          {/* Viewport Indicator Rectangle */}
          <div
            style={{
              left: `${((-viewport.panX + 400) / 2400) * 100}%`,
              top: `${((-viewport.panY + 300) / 1600) * 100}%`,
              width: `${(window.innerWidth / viewport.zoom / 2400) * 100}%`,
              height: `${(window.innerHeight / viewport.zoom / 1600) * 100}%`,
            }}
            className="absolute border border-blue-500 bg-blue-500/20 rounded-xs pointer-events-none"
          />
        </div>
      </div>

      {/* Top Focus Mode Bar (Selected container fills the entire working window) */}
      {focusedContainer && (
        <div 
          id="focus-mode-hud-bar"
          className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between gap-3 p-2 px-3.5 rounded-xl bg-[#0E1015]/95 backdrop-blur-md border border-white/10 shadow-2xl text-white select-none pointer-events-auto"
          style={{ borderLeft: `5px solid ${focusedContainer.color}` }}
        >
          {/* Left: Back button & Interactive Breadcrumbs */}
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <button
              id="focus-back-btn"
              onClick={exitFocusMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-semibold border border-white/10 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
              title="Выйти к общей схеме завода (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Общий план</span>
            </button>

            <div className="h-4 w-[1px] bg-white/15 shrink-0 hidden sm:block" />

            {/* Breadcrumbs Trail */}
            <div className="flex items-center gap-1.5 text-xs overflow-hidden">
              <button
                onClick={exitFocusMode}
                className="text-slate-400 hover:text-slate-200 hover:underline transition-colors shrink-0"
                title="Перейти к общей схеме"
              >
                Завод
              </button>

              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                    {isLast ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: crumb.color }}
                        >
                          {crumb.tag}
                        </span>
                        <span className="font-bold text-xs text-white truncate max-w-[200px] sm:max-w-[320px]">
                          {crumb.name}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => enterFocusMode(crumb.id)}
                        className="text-slate-400 hover:text-slate-200 hover:underline transition-colors truncate max-w-[120px]"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right: Quick Metrics & Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Real-time stats */}
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>{focusedEquipment.length} ед. оборудования</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-blue-300 font-semibold">{focusedTotalKw.toFixed(1)} кВт</span>
              {focusedCritCount > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold animate-pulse text-[11px]">
                    {focusedCritCount} АВАРИЯ
                  </span>
                </>
              )}
            </div>

            {/* Fit to window */}
            <button
              id="focus-fit-screen-btn"
              onClick={() => fitContainerToScreen(focusedContainer.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-semibold border border-white/10 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
              title="Подогнать элементы цеха под размер рабочего окна"
            >
              <Scan className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">По размеру окна</span>
            </button>

            {/* Fullscreen Canvas Mode */}
            <button
              id="focus-fullscreen-toggle-btn"
              onClick={handleToggleFullscreen}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.02] active:scale-95 shrink-0 ${
                isFocusFullscreen
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title={isFocusFullscreen ? "Свернуть в оконный режим" : "Развернуть на весь экран монитора"}
            >
              {isFocusFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span className="hidden md:inline">{isFocusFullscreen ? 'В окно' : 'На весь экран'}</span>
            </button>

            {/* Exit Focus Mode button */}
            <button
              id="focus-exit-btn"
              onClick={exitFocusMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 hover:text-white text-xs font-semibold border border-red-500/30 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
              title="Выйти из фокусного режима (Esc / F)"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Выйти</span>
              <kbd className="px-1 py-0.2 rounded bg-black/40 text-[10px] font-mono text-red-300 border border-red-500/30">
                Esc
              </kbd>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Quick Navigation & Zoom Controls (Optimized for thumb access) */}
      <div className="md:hidden pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between">
        {/* Left: Quick Mode Switcher & Undo Pill */}
        <div className="flex items-center gap-1.5">
          <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-full bg-[#0F0F12]/95 border border-white/15 shadow-2xl backdrop-blur-md">
            {activeTool === 'select' && (
              <button
                onClick={() => setActiveTool('pan')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                title="Переключить в режим панорамы"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Двигать блоки</span>
              </button>
            )}
            {activeTool === 'pan' && (
              <button
                onClick={() => setActiveTool('select')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                title="Переключить в режим перемещения блоков"
              >
                <Hand className="w-3.5 h-3.5" />
                <span>Панорама</span>
              </button>
            )}
            {activeTool === 'connect' && (
              <button
                onClick={() => setActiveTool('select')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                title="Отменить режим связывания"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Связь</span>
              </button>
            )}
          </div>

          {/* Quick Undo Button for Mobile */}
          <div className="pointer-events-auto flex items-center p-1 rounded-full bg-[#0F0F12]/95 border border-white/15 shadow-2xl backdrop-blur-md">
            <button
              id="mobile-canvas-undo-btn"
              disabled={!canUndo}
              onClick={undo}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                canUndo
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-md active:scale-95'
                  : 'opacity-25 text-slate-500 cursor-not-allowed border border-transparent'
              }`}
              title={canUndo ? 'Отменить последнее действие' : 'Нет действий для отмены'}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden xs:inline">Отмена</span>
            </button>
          </div>
        </div>

        {/* Right: Floating Zoom & Center Controls */}
        <div className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-full bg-[#0F0F12]/95 border border-white/15 shadow-2xl backdrop-blur-md text-slate-300">
          <button
            onClick={zoomOut}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 text-slate-300 active:scale-95 transition-all"
            title="Отдалить"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={zoomReset}
            className="px-2 py-1 text-[11px] font-mono font-bold hover:bg-white/10 rounded-full text-slate-200 active:scale-95 transition-all"
            title="Сбросить масштаб (100%)"
          >
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 text-slate-300 active:scale-95 transition-all"
            title="Приблизить"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {focusedContainerId ? (
            <button
              onClick={() => fitContainerToScreen(focusedContainerId)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600/30 text-blue-300 border border-blue-500/40 active:scale-95 transition-all ml-0.5"
              title="Подогнать цех под экран"
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

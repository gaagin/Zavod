import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { usePWAInstall } from '../utils/usePWAInstall';
import { 
  Map as MapIcon, 
  List, 
  Eye, 
  Edit3, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Undo2, 
  Redo2, 
  Maximize2, 
  Sliders, 
  X, 
  Focus, 
  Download, 
  Check, 
  CheckCircle2,
  AlertTriangle,
  Wrench,
  PauseCircle,
  Smartphone
} from 'lucide-react';

export const MobileBottomBar: React.FC = () => {
  const {
    mobileInteractionMode,
    toggleMobileInteractionMode,
    mobileViewMode,
    setMobileViewMode,
    mobileSheetSnap,
    setMobileSheetSnap,
    selectedId,
    setSelectedId,
    state,
    undo,
    redo,
    canUndo,
    canRedo,
    zoomReset,
    focusNode,
    setIsSearchOpen,
    setIsCreateEquipmentOpen,
    currentUser,
    triggerHaptic,
    showToast
  } = useFactory();

  const { isInstallable, promptInstall } = usePWAInstall();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'operator';

  // Find selected element info if any
  const selectedNode = selectedId 
    ? state.equipment.find(e => e.id === selectedId) || state.containers.find(c => c.id === selectedId)
    : null;

  const handleToggleSheet = () => {
    triggerHaptic(15);
    setMobileSheetSnap(prev => (prev === 'half' || prev === 'full' ? 'peek' : 'half'));
  };

  const handleInstallClick = async () => {
    setIsActionsMenuOpen(false);
    const success = await promptInstall();
    if (success) {
      showToast('Приложение установлено', 'ПромСхема добавлена на домашний экран', 'success');
    }
  };

  return (
    <div 
      id="mobile-bottom-bar-wrapper"
      className="fixed inset-x-0 bottom-0 z-30 sm:hidden pointer-events-none"
    >
      {/* 1. Selected Node Quick Floating Bar (if an element is selected) */}
      {selectedNode && mobileViewMode === 'canvas' && mobileSheetSnap === 'hidden' && (
        <div className="px-3 pb-2 pointer-events-auto animate-in slide-in-from-bottom-2 duration-150">
          <div className="bg-[#18181D]/95 backdrop-blur-xl border border-blue-500/40 shadow-2xl rounded-2xl p-2.5 flex items-center justify-between gap-2.5">
            <div 
              onClick={handleToggleSheet}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {'tag' in selectedNode && (
                    <span className="font-mono text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1 py-0.2 rounded border border-sky-500/20">
                      {selectedNode.tag}
                    </span>
                  )}
                  <span className="font-semibold text-xs text-white truncate">
                    {selectedNode.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  {'status' in selectedNode && (
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedNode.status === 'critical' ? 'bg-red-500' :
                        selectedNode.status === 'warning' ? 'bg-amber-500' :
                        selectedNode.status === 'maintenance' ? 'bg-indigo-400' : 'bg-emerald-500'
                      }`} />
                      {selectedNode.status === 'critical' ? 'Авария' :
                       selectedNode.status === 'warning' ? 'Внимание' :
                       selectedNode.status === 'maintenance' ? 'На ТО' : 'В норме'}
                    </span>
                  )}
                  <span>• Нажмите для параметров</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  focusNode(selectedId!);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                title="Центрировать на экране"
              >
                <Focus className="w-4 h-4 text-blue-400" />
              </button>
              <button
                type="button"
                onClick={handleToggleSheet}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs shadow-sm hover:bg-blue-500 transition-colors"
              >
                Инспектор
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedId(null);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Снять выделение"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Actions Popover Menu */}
      {isActionsMenuOpen && (
        <div className="px-3 pb-2 pointer-events-auto">
          <div className="bg-[#121216]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2.5 space-y-1 text-xs animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Быстрые действия</span>
              <button 
                type="button"
                onClick={() => setIsActionsMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                zoomReset();
                setIsActionsMenuOpen(false);
              }}
              className="w-full p-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-slate-200 transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-blue-400" />
              <span>Вписать схему по центру</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                disabled={!canUndo}
                onClick={() => {
                  triggerHaptic(15);
                  undo();
                }}
                className={`p-2 rounded-xl border border-white/10 flex items-center justify-center gap-1.5 ${
                  canUndo ? 'bg-white/5 text-white hover:bg-white/10' : 'opacity-40 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Отмена</span>
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={() => {
                  triggerHaptic(15);
                  redo();
                }}
                className={`p-2 rounded-xl border border-white/10 flex items-center justify-center gap-1.5 ${
                  canRedo ? 'bg-white/5 text-white hover:bg-white/10' : 'opacity-40 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span>Повтор</span>
              </button>
            </div>

            {isInstallable && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full mt-1 p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Установить PWA на телефон</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Bottom Dock */}
      <nav 
        id="mobile-thumb-dock"
        className="pointer-events-auto bg-[#09090B]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] flex items-center justify-around gap-1"
      >
        {/* Switch View: Canvas vs List */}
        <button
          id="mobile-dock-view-toggle"
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setMobileViewMode(mobileViewMode === 'canvas' ? 'list' : 'canvas');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            mobileViewMode === 'list'
              ? 'text-blue-400 bg-blue-500/15 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {mobileViewMode === 'canvas' ? (
            <>
              <List className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Список</span>
            </>
          ) : (
            <>
              <MapIcon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Схема</span>
            </>
          )}
        </button>

        {/* Interaction Mode: Inspect vs Edit */}
        <button
          id="mobile-dock-mode-toggle"
          type="button"
          onClick={toggleMobileInteractionMode}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            mobileInteractionMode === 'edit'
              ? 'text-amber-400 bg-amber-500/15 font-semibold ring-1 ring-amber-500/30'
              : 'text-sky-400 bg-sky-500/10'
          }`}
          title={mobileInteractionMode === 'edit' ? 'Режим монтажа: перетаскивание включено' : 'Режим обхода: свободное панорамирование'}
        >
          {mobileInteractionMode === 'edit' ? (
            <>
              <Edit3 className="w-5 h-5 mb-0.5 text-amber-400" />
              <span className="text-[10px] text-amber-300 font-bold">Правка</span>
            </>
          ) : (
            <>
              <Eye className="w-5 h-5 mb-0.5 text-sky-400" />
              <span className="text-[10px] text-sky-300">Обход</span>
            </>
          )}
        </button>

        {/* Quick Add (+) */}
        {canEdit && (
          <button
            id="mobile-dock-add-btn"
            type="button"
            onClick={() => {
              triggerHaptic(25);
              setIsCreateEquipmentOpen(true);
            }}
            className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-transform active:scale-90 shrink-0"
            title="Добавить оборудование"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Search Modal (🔍) */}
        <button
          id="mobile-dock-search-btn"
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setIsSearchOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Поиск</span>
        </button>

        {/* Actions / More Menu (⋮) */}
        <button
          id="mobile-dock-more-btn"
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setIsActionsMenuOpen(prev => !prev);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isActionsMenuOpen
              ? 'text-white bg-white/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Действия</span>
        </button>
      </nav>
    </div>
  );
};

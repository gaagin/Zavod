import React, { useEffect, useState } from 'react';
import { FactoryProvider, useFactory } from './context/FactoryContext';
import { Navbar } from './components/Navbar';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { InspectorPanel } from './components/InspectorPanel';
import { SearchModal } from './components/SearchModal';
import { ReportModal } from './components/ReportModal';
import { ToastContainer } from './components/ToastContainer';
import { Upload, FileCode } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    undo,
    redo,
    selectedId,
    setSelectedId,
    deleteEquipment,
    deleteContainer,
    deleteLink,
    state,
    currentUser,
    isSearchOpen,
    setIsSearchOpen,
    setActiveTool,
    zoomIn,
    zoomOut,
    zoomReset,
    importProject,
  } = useFactory();

  const [isWindowDragOver, setIsWindowDragOver] = useState(false);

  // Global window drag and drop for .json project files
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsWindowDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsWindowDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsWindowDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith('.json') || file.type.includes('json'))) {
        await importProject(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [importProject]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      // Ctrl/Cmd + K: Toggle Search Dialog
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'л' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
        return;
      }

      if (isInput) return;

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'я')) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'н')) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z' || e.key === 'я'))) {
        e.preventDefault();
        redo();
        return;
      }

      // Escape: Close search, deselect
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else {
          setSelectedId(null);
        }
        return;
      }

      // Delete / Backspace: delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        if (currentUser.role === 'admin') {
          if (state.equipment.some(eq => eq.id === selectedId)) {
            deleteEquipment(selectedId);
            setSelectedId(null);
          } else if (state.containers.some(c => c.id === selectedId)) {
            deleteContainer(selectedId);
            setSelectedId(null);
          }
        }
        if (currentUser.role === 'admin' || currentUser.role === 'operator') {
          if (state.links.some(l => l.id === selectedId)) {
            deleteLink(selectedId);
            setSelectedId(null);
          }
        }
        return;
      }

      // Quick Tools shortcuts
      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('pan');
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('connect');
      } else if (e.key === '=' || e.key === '+') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        zoomReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, 
    redo, 
    selectedId, 
    setSelectedId, 
    deleteEquipment, 
    deleteContainer, 
    deleteLink, 
    state, 
    currentUser, 
    isSearchOpen, 
    setIsSearchOpen, 
    setActiveTool,
    zoomIn,
    zoomOut,
    zoomReset
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090B] font-sans text-slate-300">
      {/* Top Header Navbar */}
      <Navbar />

      {/* Main Workspace: Canvas + Inspector Sidebar */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 h-full relative">
          <Canvas />
          <Toolbar />
        </div>
        <InspectorPanel />
      </main>

      {/* Modals & Dialogs */}
      <SearchModal />
      <ReportModal />

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Window Drag & Drop Overlay */}
      {isWindowDragOver && (
        <div 
          id="window-drag-drop-overlay"
          className="fixed inset-0 z-50 bg-blue-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-blue-500 m-4 rounded-3xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="p-6 rounded-2xl bg-blue-900/60 border border-blue-400/30 flex flex-col items-center gap-4 text-center max-w-md shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 animate-bounce">
              <Upload className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white tracking-tight">Отпустите файл для импорта проекта</h3>
              <p className="text-xs text-blue-200">
                Схема будет загружена, валидирована и мгновенно применена на холсте SCADA
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono bg-blue-950/60 px-3 py-1.5 rounded-lg text-blue-300 border border-blue-800">
              <FileCode className="w-3.5 h-3.5" />
              <span>Поддерживаются файлы схемы (.json)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <FactoryProvider>
      <AppContent />
    </FactoryProvider>
  );
}

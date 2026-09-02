import React, { useEffect } from 'react';
import { FactoryProvider, useFactory } from './context/FactoryContext';
import { Navbar } from './components/Navbar';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { InspectorPanel } from './components/InspectorPanel';
import { SearchModal } from './components/SearchModal';
import { ReportModal } from './components/ReportModal';

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
  } = useFactory();

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

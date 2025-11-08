import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useHistory } from '../hooks/useHistory';
import type { ScenePackage } from '../../types/scenePackage';

interface HistoryContextValue {
  scenePackage: ScenePackage | null;
  updateScene: (scenePackage: ScenePackage, addToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined);

export const useHistoryContext = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistoryContext must be used within HistoryProvider');
  }
  return context;
};

interface HistoryProviderProps {
  children: ReactNode;
  scenePath: string | null;
}

export const HistoryProvider: React.FC<HistoryProviderProps> = ({ children, scenePath }) => {
  const history = useHistory<ScenePackage | null>(null);

  // Load scene when scenePath changes
  useEffect(() => {
    if (!scenePath) {
      history.setState(null, false);
      return;
    }

    const loadScene = async () => {
      const result = await window.electronAPI.loadScene(scenePath);
      if (result.success && result.scenePackage) {
        history.setState(result.scenePackage, false); // false = don't add to history
      }
    };

    loadScene();
  }, [scenePath]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      const isRedo =
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y');

      if (isUndo && history.canUndo) {
        e.preventDefault();
        e.stopPropagation();
        history.undo();
        // Auto-save after undo
        setTimeout(() => {
          if (history.state && scenePath) {
            window.electronAPI.saveScene(scenePath, history.state);
          }
        }, 10);
        return;
      }

      if (isRedo && history.canRedo) {
        e.preventDefault();
        e.stopPropagation();
        history.redo();
        // Auto-save after redo
        setTimeout(() => {
          if (history.state && scenePath) {
            window.electronAPI.saveScene(scenePath, history.state);
          }
        }, 10);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [history, scenePath]);

  const value: HistoryContextValue = {
    scenePackage: history.state,
    updateScene: (scenePackage: ScenePackage, addToHistory = true) => {
      history.setState(scenePackage, addToHistory);
    },
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo
  };

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
};

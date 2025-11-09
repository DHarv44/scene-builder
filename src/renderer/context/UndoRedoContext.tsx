import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UndoRedoManager, type Command } from '../services/undoRedoManager';

interface UndoRedoContextType {
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  clear: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | null>(null);

export const UndoRedoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manager] = useState(() => new UndoRedoManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoDescription, setUndoDescription] = useState<string | null>(null);
  const [redoDescription, setRedoDescription] = useState<string | null>(null);

  const updateState = useCallback(() => {
    setCanUndo(manager.canUndo());
    setCanRedo(manager.canRedo());
    setUndoDescription(manager.getUndoDescription());
    setRedoDescription(manager.getRedoDescription());
  }, [manager]);

  const execute = useCallback((command: Command) => {
    manager.execute(command);
    updateState();
  }, [manager, updateState]);

  const undo = useCallback(() => {
    manager.undo();
    updateState();
  }, [manager, updateState]);

  const redo = useCallback(() => {
    manager.redo();
    updateState();
  }, [manager, updateState]);

  const clear = useCallback(() => {
    manager.clear();
    updateState();
  }, [manager, updateState]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <UndoRedoContext.Provider value={{ execute, undo, redo, canUndo, canRedo, undoDescription, redoDescription, clear }}>
      {children}
    </UndoRedoContext.Provider>
  );
};

export const useUndoRedo = (): UndoRedoContextType => {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within UndoRedoProvider');
  }
  return context;
};

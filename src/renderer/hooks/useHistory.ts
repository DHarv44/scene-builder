import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseHistoryReturn<T> {
  state: T;
  setState: (newState: T, skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

const MAX_HISTORY = 30;

/**
 * Custom hook for managing undo/redo history
 * Tracks up to 30 state changes
 */
export function useHistory<T>(initialState: T): UseHistoryReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const setState = useCallback((newState: T, skipHistory: boolean = false) => {
    if (!newState) return;

    // Deep clone to prevent mutation issues
    const clonedState = JSON.parse(JSON.stringify(newState));

    // Skip adding to history if explicitly requested (e.g., loading from file or undo/redo)
    if (skipHistory) {
      setHistory({
        past: [],
        present: clonedState,
        future: []
      });
      return;
    }

    // Add current state to history
    setHistory((currentHistory) => {
      // Clone the current present before adding to past
      const clonedPresent = JSON.parse(JSON.stringify(currentHistory.present));

      // Don't add to history if the state hasn't actually changed
      if (JSON.stringify(clonedPresent) === JSON.stringify(clonedState)) {
        return currentHistory;
      }

      const newPast = [...currentHistory.past, clonedPresent];

      // Limit history to MAX_HISTORY items
      if (newPast.length > MAX_HISTORY) {
        newPast.shift(); // Remove oldest item
      }

      return {
        past: newPast,
        present: clonedState,
        future: [] // Clear future when new state is set
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.past.length === 0) return currentHistory;

      const newPast = [...currentHistory.past];
      const newPresent = newPast.pop()!;

      return {
        past: newPast,
        present: newPresent,
        future: [currentHistory.present, ...currentHistory.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.future.length === 0) return currentHistory;

      const newFuture = [...currentHistory.future];
      const newPresent = newFuture.shift()!;

      return {
        past: [...currentHistory.past, currentHistory.present],
        present: newPresent,
        future: newFuture
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory((currentHistory) => ({
      past: [],
      present: currentHistory.present,
      future: []
    }));
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory
  };
}

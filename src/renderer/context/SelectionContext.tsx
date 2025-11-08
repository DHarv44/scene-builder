import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectionContextValue {
  // Layer selection (for canvas/scene layers)
  selectedLayerIds: string[];
  selectLayers: (ids: string[]) => void;
  toggleLayerSelection: (id: string) => void;
  clearLayerSelection: () => void;

  // Scene selection (for timeline)
  selectedSceneId: string | null;
  selectScene: (id: string | null) => void;

  // Timeline item selection
  selectedItemId: string | null;
  selectItem: (id: string | null) => void;

  // Timeline layer selection
  selectedLayerId: string | null;
  selectTimelineLayer: (id: string | null) => void;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
};

interface SelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children }) => {
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const selectLayers = (ids: string[]) => {
    setSelectedLayerIds(ids);
  };

  const toggleLayerSelection = (id: string) => {
    setSelectedLayerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearLayerSelection = () => {
    setSelectedLayerIds([]);
  };

  const value: SelectionContextValue = {
    selectedLayerIds,
    selectLayers,
    toggleLayerSelection,
    clearLayerSelection,
    selectedSceneId,
    selectScene: setSelectedSceneId,
    selectedItemId,
    selectItem: setSelectedItemId,
    selectedLayerId,
    selectTimelineLayer: setSelectedLayerId
  };

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};

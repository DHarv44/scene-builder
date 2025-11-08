import React, { createContext, useContext, ReactNode } from 'react';
import type { ScenePackage } from '../../types/scenePackage';

interface SceneContextValue {
  scenePackage: ScenePackage | null;
  scenePath: string | null;
  updateScene: (updater: (pkg: ScenePackage) => ScenePackage) => void;
  saveScene: () => Promise<void>;
}

const SceneContext = createContext<SceneContextValue | undefined>(undefined);

export const useScenePackage = () => {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error('useScenePackage must be used within SceneProvider');
  }
  return context;
};

interface SceneProviderProps {
  children: ReactNode;
  scenePackage: ScenePackage | null;
  scenePath: string | null;
  onUpdate: (pkg: ScenePackage) => void;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({
  children,
  scenePackage,
  scenePath,
  onUpdate
}) => {
  const updateScene = (updater: (pkg: ScenePackage) => ScenePackage) => {
    if (!scenePackage) return;
    const updated = updater(JSON.parse(JSON.stringify(scenePackage)));
    onUpdate(updated);
  };

  const saveScene = async () => {
    if (!scenePackage || !scenePath) return;
    await window.electronAPI.saveScene(scenePath, scenePackage);
  };

  const value: SceneContextValue = {
    scenePackage,
    scenePath,
    updateScene,
    saveScene
  };

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
};

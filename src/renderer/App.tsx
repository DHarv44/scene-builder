import React, { useState } from 'react';
import './styles/App.css';
import MenuBar from './components/MenuBar/MenuBar';
import WelcomeScreen from './components/WelcomeScreen/WelcomeScreen';
import MainLayout from './components/Layout/MainLayout';
import NewSceneDialog from './components/Dialogs/NewSceneDialog';
import { HistoryProvider, useHistoryContext } from './context/HistoryContext';
import { SceneProvider } from './context/SceneContext';
import { SelectionProvider } from './context/SelectionContext';
import { PlaybackProvider } from './context/PlaybackContext';
import { LayoutProvider } from './context/LayoutContext';
import { TimelineNavigationProvider } from './context/TimelineNavigationContext';
import { ViewModeProvider } from './context/ViewModeContext';

/**
 * Inner app component that uses HistoryContext
 * Separated to allow hooks inside provider tree
 */
const AppContent: React.FC<{ scenePath: string | null }> = ({ scenePath }) => {
  const { scenePackage, updateScene } = useHistoryContext();

  return (
    <SceneProvider
      scenePackage={scenePackage}
      scenePath={scenePath}
      onUpdate={(pkg) => updateScene(pkg)}
    >
      <SelectionProvider>
        <PlaybackProvider scenePackage={scenePackage}>
          <LayoutProvider>
            <TimelineNavigationProvider>
              <MainLayout />
            </TimelineNavigationProvider>
          </LayoutProvider>
        </PlaybackProvider>
      </SelectionProvider>
    </SceneProvider>
  );
};

const App: React.FC = () => {
  const [currentScenePath, setCurrentScenePath] = useState<string | null>(null);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);

  // File operations
  const handleNewScene = () => setShowNewSceneDialog(true);

  const handleNewSceneConfirm = async (sceneName: string) => {
    setShowNewSceneDialog(false);
    const directory = await window.electronAPI.selectDirectory();
    if (!directory) return;

    const sceneFolderName = sceneName.toLowerCase().replace(/\s+/g, '-');
    const scenePath = `${directory}/${sceneFolderName}`;

    const result = await window.electronAPI.createScene(scenePath, sceneName);
    if (result.success) {
      const loadResult = await window.electronAPI.loadScene(result.path!);
      if (loadResult.success) {
        setCurrentScenePath(loadResult.path!);
      }
    } else {
      alert(`Error creating scene: ${result.error}`);
    }
  };

  const handleOpenScene = async () => {
    const directory = await window.electronAPI.selectDirectory();
    if (!directory) return;

    const result = await window.electronAPI.loadScene(directory);
    if (result.success) {
      setCurrentScenePath(result.path!);
    } else {
      alert(`Error loading scene: ${result.error}`);
    }
  };

  const handleSaveScene = async () => {
    if (!currentScenePath) {
      alert('No scene loaded to save');
    }
  };

  return (
    <HistoryProvider scenePath={currentScenePath}>
      <ViewModeProvider>
        <div className="app">
          <MenuBar
            onNewScene={handleNewScene}
            onOpenScene={handleOpenScene}
            onSaveScene={handleSaveScene}
            scenePath={currentScenePath}
            hasSceneLoaded={!!currentScenePath}
          />

          {currentScenePath ? (
            <AppContent scenePath={currentScenePath} />
          ) : (
            <WelcomeScreen
              onNewScene={handleNewScene}
              onOpenScene={handleOpenScene}
            />
          )}

          {showNewSceneDialog && (
            <NewSceneDialog
              onConfirm={handleNewSceneConfirm}
              onCancel={() => setShowNewSceneDialog(false)}
            />
          )}
        </div>
      </ViewModeProvider>
    </HistoryProvider>
  );
};

export default App;

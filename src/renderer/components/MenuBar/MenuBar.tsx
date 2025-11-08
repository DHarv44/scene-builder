import React from 'react';
import './MenuBar.css';

interface MenuBarProps {
  onNewScene: () => void;
  onOpenScene: () => void;
  onSaveScene: () => void;
  scenePath: string | null;
  hasSceneLoaded: boolean;
}

const MenuBar: React.FC<MenuBarProps> = ({
  onNewScene,
  onOpenScene,
  onSaveScene,
  scenePath,
  hasSceneLoaded
}) => {
  return (
    <div className="menu-bar">
      <div className="menu-group">
        <button onClick={onNewScene}>New Scene</button>
        <button onClick={onOpenScene}>Open...</button>
        <button onClick={onSaveScene} disabled={!hasSceneLoaded}>Save</button>
        <button disabled={!hasSceneLoaded}>Export Package...</button>
      </div>

      <div className="menu-title">
        Low Sun Scene Builder
        {scenePath && <span className="scene-path"> - {scenePath}</span>}
      </div>
      <div className="menu-group">
        <button>Help</button>
      </div>
    </div>
  );
};

export default MenuBar;

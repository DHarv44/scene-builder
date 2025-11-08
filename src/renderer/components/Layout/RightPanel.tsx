import React from 'react';
import PropertiesPanel from '../Properties/PropertiesPanel';
import ResourceBrowser from '../Resources/ResourceBrowserTree';
import { useLayout } from '../../context/LayoutContext';
import { useSelection } from '../../context/SelectionContext';
import './RightPanel.css';

const RightPanel: React.FC = () => {
  const { sizes, startResize } = useLayout();
  const { selectedSceneId, selectedItemId, selectedLayerId } = useSelection();

  return (
    <div className="right-panel">
      <div className="properties-area" style={{ height: `${sizes.propertiesHeight}%` }}>
        <PropertiesPanel
          scenePackage={null} // Will be refactored to use context
          selectedSceneId={selectedSceneId}
          selectedLayerIds={[]}
          selectedItemId={selectedItemId}
          selectedLayerId={selectedLayerId}
          onUpdate={() => {}} // Will be refactored to use context
        />
      </div>

      <div
        className="panel-resize-handle horizontal"
        onMouseDown={() => startResize('propertiesHeight')}
      />

      <div className="resource-browser-area" style={{ flex: 1 }}>
        <ResourceBrowser />
      </div>
    </div>
  );
};

export default RightPanel;

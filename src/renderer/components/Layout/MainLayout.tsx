import React from 'react';
import MiddlePanel from './MiddlePanel';
import RightPanel from './RightPanel';
import { useLayout } from '../../context/LayoutContext';
import { useViewMode } from '../../context/ViewModeContext';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const { sizes, startResize } = useLayout();
  const { viewMode } = useViewMode();

  return (
    <div
      className="main-layout"
      style={{
        gridTemplateColumns: `1fr ${sizes.rightPanelWidth}px`
      }}
    >
      {/* Middle Panel - Canvas + Timeline */}
      <div className="middle-area" style={{ position: 'relative' }}>
        <MiddlePanel viewMode={viewMode} />
        <div
          className="panel-resize-handle vertical"
          onMouseDown={() => startResize('rightPanel')}
        />
      </div>

      {/* Right Panel - Properties + Resources */}
      <div className="right-area">
        <RightPanel />
      </div>
    </div>
  );
};

export default MainLayout;

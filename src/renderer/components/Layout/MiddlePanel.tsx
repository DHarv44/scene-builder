import React, { useRef } from 'react';
import CanvasPreview from '../../features/canvas/CanvasPreview';
import { Timeline, type TimelineHandle } from '@features/timeline';
import PlaybackControls from '../Preview/PlaybackControls';
import { useLayout } from '../../context/LayoutContext';
import { useSelection } from '../../context/SelectionContext';
import { usePlayback } from '../../context/PlaybackContext';
import { useScenePackage } from '../../context/SceneContext';
import { useViewMode } from '../../context/ViewModeContext';
import './MiddlePanel.css';

const MiddlePanel: React.FC<{ viewMode: 'global' | string }> = ({ viewMode }) => {
  const { sizes, previewMode, setPreviewMode, startResize, zoom, zoomIn, zoomOut, resetZoom } = useLayout();
  const { selectedSceneId, selectScene, selectedItemId, selectItem, selectedLayerId, selectTimelineLayer } = useSelection();
  const { currentTime, setCurrentTime, togglePlayPause, isPlaying, duration } = usePlayback();
  const { scenePackage, scenePath, updateScene } = useScenePackage();
  const { setViewMode } = useViewMode();
  const timelineRef = useRef<TimelineHandle>(null);

  // Collect available scenes
  const availableScenes = React.useMemo(() => {
    if (!scenePackage) return [];
    const scenes: { id: string; name: string }[] = [];
    const collectScenes = (layers: any[]) => {
      layers.forEach(layer => {
        layer.items.forEach((item: any) => {
          if (item.type === 'scene') {
            scenes.push({ id: item.id, name: item.name });
            if (item.layers) {
              collectScenes(item.layers);
            }
          }
        });
      });
    };
    collectScenes(scenePackage.timeline.layers || []);
    return scenes;
  }, [scenePackage]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ': // Spacebar
          e.preventDefault();
          togglePlayPause();
          break;
        case 'Home':
          e.preventDefault();
          setCurrentTime(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentTime(duration);
          // Scroll timeline to the end
          timelineRef.current?.scrollToEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, setCurrentTime, duration]);

  return (
    <div className="middle-panel">
      <div className="preview-section">
        <div className="preview-toolbar">
          {/* Left: View Mode Selector */}
          <div className="toolbar-left">
            <label style={{ fontSize: '12px', color: '#ccc', marginRight: '8px' }}>View:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              style={{
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '3px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="global">Global Timeline</option>
              {availableScenes.map(scene => (
                <option key={scene.id} value={scene.id}>{scene.name}</option>
              ))}
            </select>
          </div>

          {/* Center: Mode Toggle */}
          <div className="toolbar-center">
            <div className="mode-toggle">
              <button
                className={previewMode === 'edit' ? 'active' : ''}
                onClick={() => setPreviewMode('edit')}
              >
                Edit Mode
              </button>
              <button
                className={previewMode === 'preview' ? 'active' : ''}
                onClick={() => setPreviewMode('preview')}
              >
                Preview Mode
              </button>
            </div>
          </div>

          {/* Right: Zoom Controls */}
          <div className="toolbar-right">
            {previewMode === 'edit' && (
              <div className="zoom-controls">
                <button onClick={zoomOut} title="Zoom Out">−</button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button onClick={zoomIn} title="Zoom In">+</button>
                <button onClick={resetZoom} title="Reset Zoom">⊙</button>
              </div>
            )}
          </div>
        </div>
        <CanvasPreview viewMode={viewMode} />
      </div>

      <div
        className="timeline-resize-handle"
        onMouseDown={() => startResize('timeline')}
      />

      <div className="timeline-section" style={{ height: `${sizes.timelineHeight}px` }}>
        <PlaybackControls
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onTimeChange={setCurrentTime}
          onPlayPause={togglePlayPause}
        />
        <Timeline
          ref={timelineRef}
          scenePackage={scenePackage}
          scenePath={scenePath}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          onSelectItem={selectItem}
          selectedSceneId={selectedSceneId}
          onSelectScene={selectScene}
          onSelectLayer={selectTimelineLayer}
          onUpdate={(pkg) => updateScene(() => pkg)}
        />
      </div>
    </div>
  );
};

export default MiddlePanel;

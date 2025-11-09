/**
 * Timeline Feature
 *
 * Self-contained timeline editor module with drag/drop, resize, and scene management.
 *
 * @module features/timeline
 */

// Main component
export { default as Timeline } from './components/Timeline';
export type { TimelineHandle } from './components/Timeline';

// Public types
export type { TimelineProps, ContextMenuState, ResizeHandle } from './types';

// Actions (public API for external features)
export {
  handleAddImage,
  handleAddAudio,
  handleAddScene
} from './actions/Timeline.actions';

// Note: Internal components are NOT exported
// - LayerRow, SceneClip, ImageClip, etc. are implementation details

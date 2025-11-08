import type { ScenePackage } from '../../types/scenePackage';

/**
 * Centralized service for managing scene package saves
 * Ensures all modifications follow the same pattern and prevents race conditions
 */
class SceneSaveService {
  private saveQueue: Promise<void> = Promise.resolve();
  private latestScenePackage: ScenePackage | null = null;

  /**
   * Update the internal reference to the latest scene package
   * Call this whenever the scene package changes in React state
   */
  updateScenePackage(scenePackage: ScenePackage | null): void {
    this.latestScenePackage = scenePackage;
  }

  /**
   * Apply modifications to the scene package and save
   * All saves are queued and processed sequentially to prevent race conditions
   */
  async save(
    scenePath: string | null,
    modifier: (pkg: ScenePackage) => ScenePackage,
    onUpdate?: (pkg: ScenePackage) => void
  ): Promise<void> {
    if (!scenePath || !this.latestScenePackage) return;

    // Queue this save to prevent concurrent saves from overwriting each other
    this.saveQueue = this.saveQueue.then(async () => {
      // Deep copy the latest scene package
      const updated = JSON.parse(JSON.stringify(this.latestScenePackage)) as ScenePackage;

      // Apply modifications
      const modified = modifier(updated);

      // Update React state
      if (onUpdate) {
        onUpdate(modified);
      }

      // Update our internal reference
      this.latestScenePackage = modified;

      // Save to disk
      await window.electronAPI.saveScene(scenePath, modified);
    });

    return this.saveQueue;
  }

  /**
   * Save the latest internal scene package state without modifications
   */
  async saveCurrentState(
    scenePath: string | null
  ): Promise<void> {
    if (!scenePath || !this.latestScenePackage) return;

    this.saveQueue = this.saveQueue.then(async () => {
      await window.electronAPI.saveScene(scenePath, this.latestScenePackage);
    });

    return this.saveQueue;
  }
}

// Export singleton instance
export const sceneSaveService = new SceneSaveService();

import React, { useState, useEffect } from 'react';
import type { ScenePackage } from '../../../types/scenePackage';
import InputDialog from '../Dialogs/InputDialog';
import './ResourceBrowser.css';

interface ResourceBrowserProps {
  scenePackage: ScenePackage | null;
  scenePath: string | null;
  onUpdate: (scenePackage: ScenePackage) => void;
}

interface DirectoryItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface AssetWithStatus {
  key: string;
  path: string;
  exists: boolean;
}

const ResourceBrowser: React.FC<ResourceBrowserProps> = ({
  scenePackage,
  scenePath,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'audio'>('images');
  const [directoryItems, setDirectoryItems] = useState<DirectoryItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showSubdirDialog, setShowSubdirDialog] = useState(false);

  // Load directory contents and sync with JSON
  useEffect(() => {
    loadDirectoryAndSync();
  }, [scenePath, activeTab, scenePackage]);

  const loadDirectoryAndSync = async () => {
    if (!scenePath || !scenePackage) {
      setDirectoryItems([]);
      return;
    }

    await loadDirectory();
    await syncAssetsWithFilesystem();
  };

  const loadDirectory = async () => {
    if (!scenePath) {
      setDirectoryItems([]);
      return;
    }

    const result = await window.electronAPI.listDirectory(scenePath, activeTab);
    if (result.success && result.items) {
      setDirectoryItems(result.items);
    }
  };

  const syncAssetsWithFilesystem = async () => {
    if (!scenePackage || !scenePath) return;

    const result = await window.electronAPI.listDirectory(scenePath, activeTab);
    if (!result.success || !result.items) return;

    const filesOnDisk = new Set(result.items.filter(i => !i.isDirectory).map(i => i.name));
    const assetsInJson = activeTab === 'images'
      ? Object.entries(scenePackage.assets.images)
      : Object.entries(scenePackage.assets.audio);

    let needsUpdate = false;
    const updated = { ...scenePackage };
    const assetsMap = activeTab === 'images' ? updated.assets.images : updated.assets.audio;

    // Add files from disk that aren't in JSON
    for (const item of result.items) {
      if (item.isDirectory) continue;

      const fileName = item.name;
      const assetKey = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
      const relativePath = `./${activeTab}/${fileName}`;

      const existsInJson = assetsInJson.some(([key, path]) => path === relativePath || key === assetKey);

      if (!existsInJson) {
        assetsMap[assetKey] = relativePath;
        needsUpdate = true;
      }
    }

    // Save if we added any assets
    if (needsUpdate) {
      onUpdate(updated);
      await window.electronAPI.saveScene(scenePath, updated);
    }
  };

  const handleImportAsset = async () => {
    if (!scenePackage || !scenePath) return;

    const result = await window.electronAPI.importAsset(scenePath, activeTab);

    if (result.success && result.assets) {
      // Update scene package with new assets
      const updated = { ...scenePackage };
      if (activeTab === 'images') {
        updated.assets.images = { ...updated.assets.images, ...result.assets };
      } else {
        updated.assets.audio = { ...updated.assets.audio, ...result.assets };
      }

      onUpdate(updated);

      // Auto-save after importing
      await window.electronAPI.saveScene(scenePath, updated);

      await loadDirectory();
    }
  };

  const handleCreateSubdirectory = () => {
    setShowSubdirDialog(true);
  };

  const handleSubdirConfirm = async (subdirName: string) => {
    setShowSubdirDialog(false);

    if (!scenePath) return;

    const result = await window.electronAPI.createSubdirectory(scenePath, activeTab, subdirName);

    if (result.success) {
      await loadDirectory();
    } else {
      alert(`Error creating subdirectory: ${result.error}`);
    }
  };

  const handleDeleteAsset = (assetKey: string) => {
    if (!scenePackage) return;

    const updated = { ...scenePackage };
    if (activeTab === 'images') {
      delete updated.assets.images[assetKey];
    } else {
      delete updated.assets.audio[assetKey];
    }

    onUpdate(updated);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!scenePackage || !scenePath) return;

    const files = Array.from(e.dataTransfer.files);
    const filePaths = files.map(file => file.path);

    if (filePaths.length === 0) return;

    const result = await window.electronAPI.importFiles(scenePath, activeTab, filePaths);

    if (result.success && result.assets) {
      // Update scene package with new assets
      const updated = { ...scenePackage };
      if (activeTab === 'images') {
        updated.assets.images = { ...updated.assets.images, ...result.assets };
      } else {
        updated.assets.audio = { ...updated.assets.audio, ...result.assets };
      }

      onUpdate(updated);

      // Auto-save after importing
      await window.electronAPI.saveScene(scenePath, updated);

      await loadDirectory();
    } else if (result.error) {
      alert(`Error importing files: ${result.error}`);
    }
  };

  const renderAssetList = () => {
    if (!scenePackage) {
      return (
        <div className="empty-state">
          <p>No scene loaded</p>
        </div>
      );
    }

    if (directoryItems.length === 0) {
      return (
        <div className="empty-state">
          <p>No {activeTab} imported</p>
          <button onClick={handleImportAsset} className="primary">
            Import {activeTab === 'images' ? 'Image' : 'Audio'}
          </button>
        </div>
      );
    }

    const assets = activeTab === 'images'
      ? Object.entries(scenePackage.assets.images)
      : Object.entries(scenePackage.assets.audio);

    return (
      <div className="asset-list">
        {/* Render directories first */}
        {directoryItems
          .filter(item => item.isDirectory)
          .map(item => (
            <div key={item.path} className="asset-item directory">
              <div className="asset-thumbnail directory">
                <span>📁</span>
              </div>
              <div className="asset-info">
                <div className="asset-name">{item.name}</div>
                <div className="asset-path">Folder</div>
              </div>
            </div>
          ))}

        {/* Render files */}
        {assets.map(([key, path]) => {
          const fileName = path.split('/').pop();
          const item = directoryItems.find(d => !d.isDirectory && d.name === fileName);
          const exists = !!item;

          // Convert relative path to scene:// protocol
          const cleanPath = path.replace(/^\.\//, '');
          const thumbnailSrc = `scene://${cleanPath}`;

          return (
            <div
              key={key}
              className={`asset-item ${!exists ? 'missing' : ''}`}
              draggable={exists}
              onDragStart={(e) => {
                if (!exists) {
                  e.preventDefault();
                  return;
                }
                const type = activeTab === 'images' ? 'image' : 'audio';
                e.dataTransfer.setData('assetKey', key);
                e.dataTransfer.setData('assetType', type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              {activeTab === 'images' ? (
                <div className="asset-thumbnail">
                  {exists ? (
                    <img src={thumbnailSrc} alt={key} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>❌</span>
                  )}
                </div>
              ) : (
                <div className="asset-thumbnail audio">
                  <span>{exists ? '🔊' : '❌'}</span>
                </div>
              )}
              <div className="asset-info">
                <div className="asset-name" title={key}>
                  {key}
                  {!exists && <span className="missing-badge">MISSING</span>}
                </div>
                <div className="asset-path" title={path}>{fileName || path}</div>
              </div>
              <div className="asset-actions">
                <button
                  className="icon-button"
                  onClick={() => handleDeleteAsset(key)}
                  title="Remove asset"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="resource-browser">
      <div className="resource-header">
        <h3>Resources</h3>
        <div className="header-buttons">
          <button
            onClick={handleCreateSubdirectory}
            disabled={!scenePackage}
            className="icon-button"
            title="Create subdirectory"
          >
            📁+
          </button>
          <button
            onClick={handleImportAsset}
            disabled={!scenePackage}
            className="icon-button"
            title="Import asset"
          >
            ➕
          </button>
        </div>
      </div>

      <div className="resource-tabs">
        <button
          className={activeTab === 'images' ? 'active' : ''}
          onClick={() => setActiveTab('images')}
        >
          Images ({scenePackage ? Object.keys(scenePackage.assets.images).length : 0})
        </button>
        <button
          className={activeTab === 'audio' ? 'active' : ''}
          onClick={() => setActiveTab('audio')}
        >
          Audio ({scenePackage ? Object.keys(scenePackage.assets.audio).length : 0})
        </button>
      </div>

      <div
        className={`resource-content ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drop-overlay">
            <p>Drop files here to import</p>
          </div>
        )}
        {renderAssetList()}
      </div>

      {scenePath && (
        <div className="resource-footer">
          <div
            className="resource-path clickable"
            title={`Click to open: ${scenePath}`}
            onClick={() => window.electronAPI.openPath(scenePath)}
          >
            📁 {scenePath}
          </div>
        </div>
      )}

      {showSubdirDialog && (
        <InputDialog
          title="Create Subdirectory"
          label="Subdirectory name:"
          defaultValue=""
          onConfirm={handleSubdirConfirm}
          onCancel={() => setShowSubdirDialog(false)}
        />
      )}
    </div>
  );
};

export default ResourceBrowser;

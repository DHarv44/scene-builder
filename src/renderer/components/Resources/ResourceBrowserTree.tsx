import React, { useState, useEffect } from 'react';
import InputDialog from '../Dialogs/InputDialog';
import TreeNode, { TreeNodeData } from './TreeNode';
import './ResourceBrowser.css';
import { useScenePackage } from '../../context/SceneContext';

/**
 * Pure filesystem browser for project resources
 * Shows images/ and audio/ folders, completely independent of scene package
 */
const ResourceBrowser: React.FC = () => {
  const { scenePath } = useScenePackage();
  const [activeTab, setActiveTab] = useState<'images' | 'audio'>('images');
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showSubdirDialog, setShowSubdirDialog] = useState(false);
  const [fileCount, setFileCount] = useState({ images: 0, audio: 0 });

  useEffect(() => {
    loadTree();
  }, [scenePath, activeTab]);

  const loadTree = async () => {
    if (!scenePath) {
      setTreeData([]);
      return;
    }

    const result = await window.electronAPI.listDirectoryTree(scenePath, activeTab);
    if (!result.success || !result.tree) {
      setTreeData([]);
      return;
    }

    // Count files in each directory
    const countFiles = (nodes: any[]): number => {
      let count = 0;
      nodes.forEach(node => {
        if (node.isDirectory && node.children) {
          count += countFiles(node.children);
        } else if (!node.isDirectory) {
          count++;
        }
      });
      return count;
    };

    const count = countFiles(result.tree);
    setFileCount(prev => ({ ...prev, [activeTab]: count }));

    // Sort: directories first, then files alphabetically
    const sortTree = (nodes: any[]): TreeNodeData[] => {
      return nodes
        .map(node => {
          // Generate assetKey from filename for drag functionality
          const assetKey = !node.isDirectory
            ? node.name.replace(/\.[^/.]+$/, '')
            : undefined;

          return {
            ...node,
            assetKey,
            children: node.children ? sortTree(node.children) : [],
            exists: true
          };
        })
        .sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
    };

    setTreeData(sortTree(result.tree));
  };

  const handleImportAsset = async () => {
    if (!scenePath) return;

    const result = await window.electronAPI.importAsset(scenePath, activeTab);
    if (result.success) {
      await loadTree();
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
      await loadTree();
    } else {
      alert(`Error creating subdirectory: ${result.error}`);
    }
  };

  const handleDeleteAsset = async (assetPath: string) => {
    if (!scenePath) return;

    const confirmed = confirm(`Delete ${assetPath}? This cannot be undone.`);
    if (!confirmed) return;

    const result = await window.electronAPI.deleteAsset(scenePath, activeTab, assetPath);
    if (result.success) {
      await loadTree();
    } else {
      alert(`Error deleting file: ${result.error}`);
    }
  };

  const handleMoveAsset = async (_assetKey: string, targetFolder: string) => {
    if (!scenePath) return;

    // Move file on disk only
    const result = await window.electronAPI.moveAsset(scenePath, activeTab, _assetKey, targetFolder);
    if (result.success) {
      await loadTree();
    } else if (result.error) {
      alert(`Error moving asset: ${result.error}`);
    }
  };

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

    if (!scenePath) return;

    const files = Array.from(e.dataTransfer.files);
    const filePaths = files.map(file => file.path);

    if (filePaths.length === 0) return;

    const result = await window.electronAPI.importFiles(scenePath, activeTab, filePaths);
    if (result.success) {
      await loadTree();
    } else if (result.error) {
      alert(`Error importing files: ${result.error}`);
    }
  };

  return (
    <div className="resource-browser">
      <div className="resource-header">
        <h3>Resources</h3>
        <div className="header-buttons">
          <button
            onClick={handleCreateSubdirectory}
            disabled={!scenePath}
            className="icon-button"
            title="Create subdirectory"
          >
            📁+
          </button>
          <button
            onClick={handleImportAsset}
            disabled={!scenePath}
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
          Images ({fileCount.images})
        </button>
        <button
          className={activeTab === 'audio' ? 'active' : ''}
          onClick={() => setActiveTab('audio')}
        >
          Audio ({fileCount.audio})
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

        {!scenePath ? (
          <div className="empty-state">
            <p>No project loaded</p>
          </div>
        ) : treeData.length === 0 ? (
          <div className="empty-state">
            <p>No {activeTab} found</p>
            <button onClick={handleImportAsset} className="primary">
              Import {activeTab === 'images' ? 'Image' : 'Audio'}
            </button>
          </div>
        ) : (
          <div className="tree-view">
            {treeData.map((node, index) => (
              <TreeNode
                key={node.path + index}
                node={node}
                level={0}
                onDelete={handleDeleteAsset}
                onMove={handleMoveAsset}
                activeTab={activeTab}
              />
            ))}
          </div>
        )}
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

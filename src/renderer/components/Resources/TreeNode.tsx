import React, { useState } from 'react';

export interface TreeNodeData {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNodeData[];
  assetKey?: string;
  exists?: boolean;
}

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  onDelete?: (assetKey: string) => void;
  onMove?: (assetKey: string, targetFolder: string) => void;
  activeTab: 'images' | 'audio';
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, onDelete, onMove, activeTab }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleToggle = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!node.isDirectory && node.assetKey) {
      const type = activeTab === 'images' ? 'image' : 'audio';
      e.dataTransfer.setData('assetKey', node.assetKey);
      e.dataTransfer.setData('assetType', type);
      e.dataTransfer.setData('sourcePath', node.path);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (node.isDirectory) {
      e.preventDefault();
      e.stopPropagation();
      setIsDropTarget(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (node.isDirectory) {
      e.stopPropagation();
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (node.isDirectory) {
      e.preventDefault();
      e.stopPropagation();
      setIsDropTarget(false);

      const assetKey = e.dataTransfer.getData('assetKey');
      const assetType = e.dataTransfer.getData('assetType');
      const sourcePath = e.dataTransfer.getData('sourcePath');

      // Only handle drops of the same type (images to images folder, audio to audio)
      if (assetKey && assetType === activeTab && sourcePath && onMove) {
        onMove(assetKey, node.path);
      }
    }
  };

  const getThumbnailSrc = () => {
    if (!node.isDirectory && activeTab === 'images') {
      const cleanPath = node.path.replace(/^\.\//, '');
      return `scene://${cleanPath}`;
    }
    return null;
  };

  const thumbnailSrc = getThumbnailSrc();

  return (
    <>
      <div
        className={`tree-node ${node.isDirectory ? 'directory' : 'file'} ${!node.exists && !node.isDirectory ? 'missing' : ''} ${isDropTarget ? 'drop-target' : ''}`}
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={handleToggle}
        draggable={!node.isDirectory && node.assetKey !== undefined}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {node.isDirectory && (
          <span className="tree-arrow">{isExpanded ? '▼' : '▶'}</span>
        )}

        {node.isDirectory ? (
          <div className="tree-icon">📁</div>
        ) : activeTab === 'images' && node.exists ? (
          <div className="tree-thumbnail">
            <img src={thumbnailSrc!} alt={node.name} />
          </div>
        ) : (
          <div className="tree-icon">
            {node.exists ? (activeTab === 'images' ? '🖼️' : '🔊') : '❌'}
          </div>
        )}

        <div className="tree-label">
          <span className="tree-name">{node.name}</span>
          {!node.exists && !node.isDirectory && (
            <span className="missing-badge">MISSING</span>
          )}
        </div>

        {!node.isDirectory && node.assetKey && onDelete && (
          <button
            className="tree-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.assetKey!);
            }}
            title="Remove asset"
          >
            🗑️
          </button>
        )}
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div className="tree-children">
          {node.children.map((child, index) => (
            <TreeNode
              key={child.path + index}
              node={child}
              level={level + 1}
              onDelete={onDelete}
              onMove={onMove}
              activeTab={activeTab}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default TreeNode;

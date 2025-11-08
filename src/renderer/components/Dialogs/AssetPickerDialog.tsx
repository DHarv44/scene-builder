import React, { useState, useEffect } from 'react';
import './NewSceneDialog.css';

interface AssetPickerDialogProps {
  title: string;
  assetType: 'images' | 'audio';
  scenePath: string;
  onConfirm: (assetKey: string, assetPath: string) => void;
  onCancel: () => void;
}

interface AssetNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: AssetNode[];
}

interface AssetInfo {
  key: string;
  path: string;
}

const AssetPickerDialog: React.FC<AssetPickerDialogProps> = ({
  title,
  assetType,
  scenePath,
  onConfirm,
  onCancel
}) => {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, [assetType, scenePath]);

  const loadAssets = async () => {
    setLoading(true);
    const result = await window.electronAPI.listDirectoryTree(scenePath, assetType);
    if (result.success && result.tree) {
      const assetInfos: AssetInfo[] = [];
      const extractAssets = (nodes: AssetNode[]) => {
        for (const node of nodes) {
          if (!node.isDirectory) {
            // Remove file extension to get asset key
            const assetKey = node.name.replace(/\.[^/.]+$/, '');
            assetInfos.push({ key: assetKey, path: node.path });
          }
          if (node.children) {
            extractAssets(node.children);
          }
        }
      };
      extractAssets(result.tree);
      setAssets(assetInfos.sort((a, b) => a.key.localeCompare(b.key)));
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAsset) {
      onConfirm(selectedAsset.key, selectedAsset.path);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()} style={{ minWidth: '400px' }}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            {loading ? (
              <p>Loading assets...</p>
            ) : assets.length === 0 ? (
              <p>No {assetType} found in project</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #3d3d3d', borderRadius: '4px' }}>
                {assets.map(asset => (
                  <div
                    key={asset.key}
                    onClick={() => setSelectedAsset(asset)}
                    onDoubleClick={() => {
                      setSelectedAsset(asset);
                      onConfirm(asset.key, asset.path);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: selectedAsset?.key === asset.key ? '#007acc' : 'transparent',
                      color: selectedAsset?.key === asset.key ? 'white' : '#ccc',
                      borderBottom: '1px solid #2a2a2a'
                    }}
                  >
                    {asset.key}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="dialog-buttons">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary" disabled={!selectedAsset}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetPickerDialog;

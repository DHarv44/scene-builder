import React, { useState } from 'react';
import './NewSceneDialog.css';

interface NewSceneDialogProps {
  onConfirm: (sceneName: string) => void;
  onCancel: () => void;
}

const NewSceneDialog: React.FC<NewSceneDialogProps> = ({ onConfirm, onCancel }) => {
  const [sceneName, setSceneName] = useState('New Scene');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sceneName.trim()) {
      onConfirm(sceneName.trim());
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Scene</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="scene-name">Scene Name:</label>
            <input
              id="scene-name"
              type="text"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="dialog-buttons">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSceneDialog;

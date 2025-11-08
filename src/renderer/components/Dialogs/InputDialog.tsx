import React, { useState } from 'react';
import './NewSceneDialog.css';

interface InputDialogProps {
  title: string;
  label: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const InputDialog: React.FC<InputDialogProps> = ({
  title,
  label,
  defaultValue = '',
  onConfirm,
  onCancel
}) => {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="input-value">{label}</label>
            <input
              id="input-value"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="dialog-buttons">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary">OK</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputDialog;

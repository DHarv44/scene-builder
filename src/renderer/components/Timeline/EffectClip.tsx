import React from 'react';
import BaseClip, { type BaseClipProps } from './BaseClip';
import type { ContextMenuItem } from '../Preview/ContextMenu';

const EffectClip: React.FC<BaseClipProps> = (props) => {
  return (
    <BaseClip {...props} className="effect-clip">
      <div className="clip-label">{props.item.name}</div>
    </BaseClip>
  );
};

export const getEffectClipContextMenu = (
  onDelete: () => void,
  onRename: () => void,
  onDuplicate: () => void
): ContextMenuItem[] => {
  return [
    { label: 'Rename', onClick: onRename },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Configure Effect', onClick: () => alert('Not implemented') },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Duplicate', onClick: onDuplicate },
    { label: 'Delete', onClick: onDelete }
  ];
};

export default EffectClip;

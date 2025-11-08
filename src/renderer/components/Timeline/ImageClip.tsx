import React from 'react';
import BaseClip, { type BaseClipProps } from './BaseClip';
import type { ContextMenuItem } from '../Preview/ContextMenu';

const ImageClip: React.FC<BaseClipProps> = (props) => {
  return (
    <BaseClip {...props} className="image-clip">
      {/* Content area - header is handled by BaseClip */}
    </BaseClip>
  );
};

export const getImageClipContextMenu = (
  onDelete: () => void,
  onRename: () => void,
  onDuplicate: () => void
): ContextMenuItem[] => {
  return [
    { label: 'Rename', onClick: onRename },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Duplicate', onClick: onDuplicate },
    { label: 'Delete', onClick: onDelete }
  ];
};

export default ImageClip;

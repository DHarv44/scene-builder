import React from 'react';
import BaseClip, { type BaseClipProps } from './BaseClip';
import AudioWaveform from './AudioWaveform';
import type { ScenePackage, TimelineAudio } from '../../../types/scenePackage';
import type { ContextMenuItem } from '../Preview/ContextMenu';

interface AudioClipProps extends BaseClipProps {
  scenePackage: ScenePackage;
}

const AudioClip: React.FC<AudioClipProps> = (props) => {
  const { item, pixelsPerMs, scenePackage } = props;
  const musicItem = item as TimelineAudio;

  return (
    <BaseClip {...props} className="audio-clip">
      {scenePackage.assets.audio[musicItem.asset] && (
        <AudioWaveform
          audioKey={musicItem.asset}
          assetPath={scenePackage.assets.audio[musicItem.asset]}
          width={Math.floor(item.duration * pixelsPerMs)}
          height={40}
        />
      )}
    </BaseClip>
  );
};

export const getAudioClipContextMenu = (
  onDelete: () => void,
  onRename: () => void,
  onDuplicate: () => void
): ContextMenuItem[] => {
  return [
    { label: 'Rename', onClick: onRename },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Adjust Volume', onClick: () => alert('Not implemented') },
    { label: 'Fade In/Out', onClick: () => alert('Not implemented') },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Duplicate', onClick: onDuplicate },
    { label: 'Delete', onClick: onDelete }
  ];
};

export default AudioClip;

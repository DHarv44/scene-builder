import React from 'react';
import './PlaybackControls.css';

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  onTimeChange,
  onPlayPause
}) => {
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onTimeChange(newTime);
  };

  const handleSkipBackward = () => {
    onTimeChange(Math.max(0, currentTime - 1000));
  };

  const handleSkipForward = () => {
    onTimeChange(Math.min(duration, currentTime + 1000));
  };

  const handleStop = () => {
    onTimeChange(0);
  };

  return (
    <div className="playback-controls">
      <div className="playback-buttons">
        <button onClick={handleSkipBackward} title="Skip backward 1s">
          ◄◄
        </button>
        <button onClick={onPlayPause} className="play-pause" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={handleSkipForward} title="Skip forward 1s">
          ▶▶
        </button>
        <button onClick={handleStop} title="Stop">
          ⏹
        </button>
      </div>

      <div className="playback-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="playback-slider">
        <input
          type="range"
          min="0"
          max={duration}
          step="10"
          value={currentTime}
          onChange={handleSliderChange}
        />
      </div>

      <div className="playback-volume">
        Vol: <input type="range" min="0" max="100" defaultValue="80" />
      </div>
    </div>
  );
};

export default PlaybackControls;

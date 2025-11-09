import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ScenePackage } from '../../types/scenePackage';

interface PlaybackContextValue {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
};

interface PlaybackProviderProps {
  children: ReactNode;
  scenePackage: ScenePackage | null;
}

export const PlaybackProvider: React.FC<PlaybackProviderProps> = ({
  children,
  scenePackage
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Calculate duration from scene package
  const duration = React.useMemo(() => {
    if (!scenePackage) return 10000;

    let maxDuration = 0;
    for (const scene of scenePackage.timeline.scenes || []) {
      const sceneEnd = scene.startTime + scene.duration;
      if (sceneEnd > maxDuration) maxDuration = sceneEnd;
    }
    return maxDuration || 10000;
  }, [scenePackage]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let animationFrame: number;

    const tick = () => {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      setCurrentTime(prev => {
        const next = prev + dt;

        // Stop at end
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }

        return next;
      });

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, duration]);

  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);
  const togglePlayPause = () => setIsPlaying(prev => !prev);
  const seek = (time: number) => setCurrentTime(Math.max(0, Math.min(duration, time)));

  const value: PlaybackContextValue = {
    currentTime,
    isPlaying,
    duration,
    setCurrentTime,
    play,
    pause,
    togglePlayPause,
    seek
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  audioKey: string;
  assetPath: string;
  width: number;
  height: number;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ audioKey, assetPath, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rawWaveformData, setRawWaveformData] = useState<number[] | null>(null);

  // Generate high-resolution waveform data once
  useEffect(() => {
    const generateWaveform = async () => {
      try {

        // Use Audio element to load the file (supports scene:// protocol)
        const cleanPath = assetPath.replace(/^\.\//, '');
        const audioUrl = `scene://${cleanPath}`;

        const audio = new Audio(audioUrl);

        // Wait for audio to be loadable
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
        });


        // Fetch the audio data using XMLHttpRequest (supports custom protocols)
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', audioUrl, true);
          xhr.responseType = 'arraybuffer';

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`XHR failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('XHR failed'));
          xhr.send();
        });

        const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);

        // Skip waveform generation for very large files to prevent crashes
        if (fileSizeMB > 15) {
          console.warn('[AudioWaveform] File too large for waveform generation, skipping:', fileSizeMB.toFixed(2), 'MB');
          setRawWaveformData([]); // Empty waveform
          return;
        }

        const audioContext = new AudioContext();

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));


        // Generate waveform with reduced sample count for memory efficiency
        const channelData = audioBuffer.getChannelData(0);
        const samples = 1000; // Reduced from 2000 for better memory usage
        const blockSize = Math.max(Math.floor(channelData.length / samples), 1);
        const filteredData: number[] = [];

        // Process in smaller chunks to avoid blocking
        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          const end = Math.min(blockStart + blockSize, channelData.length);
          for (let j = blockStart; j < end; j++) {
            sum += Math.abs(channelData[j]);
          }
          filteredData.push(sum / (end - blockStart));
        }

        // Normalize
        const max = Math.max(...filteredData, 0.001);
        const normalized = filteredData.map(n => n / max);

        setRawWaveformData(normalized);

        // Clean up immediately
        audioContext.close();
      } catch (error) {
        console.error('[AudioWaveform] Error generating waveform:', error);
      }
    };

    generateWaveform();
  }, [audioKey, assetPath]); // Only regenerate when audio file changes

  // Draw waveform scaled to current width
  useEffect(() => {
    if (!rawWaveformData || !canvasRef.current || width <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform scaled to current width
    ctx.fillStyle = 'rgba(61, 154, 78, 0.6)';
    ctx.strokeStyle = 'rgba(61, 154, 78, 0.8)';
    ctx.lineWidth = 1;

    const centerY = height / 2;
    const amplitude = height / 2 - 2;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    // Sample from high-res data based on current width
    for (let x = 0; x < width; x++) {
      const dataIndex = Math.floor((x / width) * rawWaveformData.length);
      const value = rawWaveformData[dataIndex] || 0;
      const y = centerY - value * amplitude;
      ctx.lineTo(x, y);
    }

    // Draw bottom half (mirror)
    for (let x = width - 1; x >= 0; x--) {
      const dataIndex = Math.floor((x / width) * rawWaveformData.length);
      const value = rawWaveformData[dataIndex] || 0;
      const y = centerY + value * amplitude;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, [rawWaveformData, width, height]); // Redraw when width changes

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  );
};

export default AudioWaveform;

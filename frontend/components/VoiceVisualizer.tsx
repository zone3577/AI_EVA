'use client';

import React, { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function VoiceVisualizer({ 
  audioLevel, 
  isActive, 
  size = 'md',
  color = 'rgb(99, 102, 241)' // indigo-500
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const barsRef = useRef<number[]>([]);
  
  const sizes = {
    sm: { width: 120, height: 40, bars: 16 },
    md: { width: 200, height: 60, bars: 24 },
    lg: { width: 300, height: 80, bars: 32 }
  };
  
  const { width, height, bars } = sizes[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize bars array
    if (barsRef.current.length !== bars) {
      barsRef.current = new Array(bars).fill(0);
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      if (!isActive) {
        // Draw flat line when inactive
        ctx.fillStyle = color + '40'; // 25% opacity
        ctx.fillRect(0, height / 2 - 1, width, 2);
        return;
      }

      const barWidth = width / bars;
      const maxBarHeight = height * 0.8;
      
      // Update bars based on audio level
      for (let i = 0; i < bars; i++) {
        const targetHeight = Math.random() * audioLevel * maxBarHeight;
        barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.3;
      }

      // Draw bars
      for (let i = 0; i < bars; i++) {
        const barHeight = Math.max(2, barsRef.current[i]);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, color + 'AA'); // 67% opacity
        gradient.addColorStop(1, color + '66'); // 40% opacity
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }
    };

    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, width, height, bars, color]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg bg-gradient-to-r from-zinc-100/50 to-zinc-200/50 dark:from-zinc-800/50 dark:to-zinc-700/50"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

interface WaveformVisualizerProps {
  audioData: Float32Array;
  color?: string;
  width?: number;
  height?: number;
}

export function WaveformVisualizer({ 
  audioData, 
  color = 'rgb(99, 102, 241)',
  width = 400,
  height = 100 
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (audioData.length === 0) return;

    const centerY = height / 2;
    const sliceWidth = width / audioData.length;

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();

    let x = 0;
    for (let i = 0; i < audioData.length; i++) {
      const v = audioData[i] * centerY;
      const y = centerY + v;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }, [audioData, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg bg-gradient-to-r from-zinc-100/50 to-zinc-200/50 dark:from-zinc-800/50 dark:to-zinc-700/50"
    />
  );
}
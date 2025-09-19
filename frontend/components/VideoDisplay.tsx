import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface VideoDisplayProps {
  chatMode: 'audio' | 'video' | null;
  videoSource: 'camera' | 'screen' | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function VideoDisplay({ 
  chatMode, 
  videoSource, 
  videoRef, 
  canvasRef 
}: VideoDisplayProps) {
  if (chatMode !== 'video') return null;

  return (
    <Card className="border-0 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Video Input {videoSource && `(${videoSource})`}
          </h2>
        </div>

        <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-b from-zinc-900 to-black ring-1 ring-black/10">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            width={320}
            height={240}
            className="w-full h-full object-contain"
            style={{ transform: videoSource === 'camera' ? 'scaleX(-1)' : 'none' }}
          />
          <canvas
            ref={canvasRef}
            className="hidden"
            width={640}
            height={480}
          />
        </div>
      </CardContent>
    </Card>
  );
}
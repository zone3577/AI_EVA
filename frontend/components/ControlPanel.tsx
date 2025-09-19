import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Video, Monitor, Camera } from 'lucide-react';

interface ControlPanelProps {
  isStreaming: boolean;
  isConnected: boolean;
  startStream: (mode: 'audio' | 'camera' | 'screen') => Promise<void>;
  stopStream: () => void;
  setVideoSource: (source: 'camera' | 'screen' | null) => void;
  stopVideo: () => void;
  chatMode: 'audio' | 'video' | null;
}

export default function ControlPanel({
  isStreaming,
  isConnected,
  startStream,
  stopStream,
  setVideoSource,
  stopVideo,
  chatMode
}: ControlPanelProps) {
  return (
    <>
      <div className="flex gap-4">
        {!isStreaming && (
          <>
            <Button
              onClick={() => startStream('audio')}
              disabled={isStreaming}
              className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-sky-600 text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-sky-500 transition-colors"
            >
              <Mic className="h-4 w-4" />
              Start Chatting
            </Button>

            <Button
              onClick={() => startStream('camera')}
              disabled={isStreaming}
              className="gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500"
            >
              <Video className="h-4 w-4" />
              Start Chatting with Video
            </Button>

            <Button
              onClick={() => startStream('screen')}
              disabled={isStreaming}
              className="gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/20 hover:from-sky-500 hover:to-indigo-500"
            >
              <Monitor className="h-4 w-4" />
              Start Chatting with Screen
            </Button>
          </>
        )}

        {isStreaming && (
          <Button
            onClick={stopStream}
            variant="destructive"
            className="gap-2 rounded-xl shadow-md"
          >
            <StopCircle className="h-4 w-4" />
            Stop Chat
          </Button>
        )}
      </div>

      {isStreaming && (
        <Card className="border-0 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 h-auto md:h-24 mt-6">
            <div className="flex flex-col items-center gap-2">
              <Mic className="h-8 w-8 text-indigo-500 animate-pulse" />
              <p className="text-zinc-600 dark:text-zinc-300">Listening...</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={() => setVideoSource('camera')} disabled={!isStreaming}>
                <Camera className="h-4 w-4"/> Use Camera
              </Button>
              <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={() => setVideoSource('screen')} disabled={!isStreaming}>
                <Monitor className="h-4 w-4"/> Share Screen
              </Button>
              <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={stopVideo} disabled={!isStreaming}>
                Stop Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Volume2, VolumeX, Trash2, Download, RefreshCcw, Send } from 'lucide-react';

interface AudioControlsProps {
  isStreaming: boolean;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  setText: React.Dispatch<React.SetStateAction<string>>;
  downloadTranscript: () => void;
  kickOffLatencyPings: () => void;
  text: string;
  outgoingText: string;
  setOutgoingText: (text: string) => void;
  sendText: () => void;
  isConnected: boolean;
}

export default function AudioControls({
  isStreaming,
  muted,
  setMuted,
  volume,
  setVolume,
  setText,
  downloadTranscript,
  kickOffLatencyPings,
  text,
  outgoingText,
  setOutgoingText,
  sendText,
  isConnected
}: AudioControlsProps) {
  if (!isStreaming) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={muted ? 'secondary' : 'default'} className="gap-2 rounded-xl" onClick={() => setMuted(!muted)}>
          {muted ? <Mic className="h-4 w-4 text-red-500" /> : <Mic className="h-4 w-4" />} 
          {muted ? 'Unmute Mic' : 'Mute Mic'}
        </Button>
        <div className="flex items-center gap-2">
          {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <input 
            className="accent-indigo-600" 
            type="range" 
            min={0} 
            max={1} 
            step={0.01} 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))} 
          />
        </div>
        <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={() => setText('')}>
          <Trash2 className="h-4 w-4" /> Clear
        </Button>
        <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={downloadTranscript}>
          <Download className="h-4 w-4" /> Download
        </Button>
        <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={kickOffLatencyPings}>
          <RefreshCcw className="h-4 w-4" /> Ping
        </Button>
      </div>

      {text && (
        <Card className="border-0 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-zinc-100">Conversation:</h2>
            <pre className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 bg-zinc-50/60 dark:bg-white/[0.03] rounded-xl p-4 ring-1 ring-black/5 dark:ring-white/10">{text}</pre>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                value={outgoingText}
                onChange={(e) => setOutgoingText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendText(); }}
                placeholder="Type a message and press Enter"
                className="flex-1 rounded-xl border border-zinc-200/60 dark:border-white/10 px-3 py-2.5 text-sm bg-white/70 dark:bg-white/[0.03] backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                disabled={!isConnected}
              />
              <Button 
                className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md hover:from-indigo-500 hover:to-sky-500" 
                onClick={sendText} 
                disabled={!isConnected || !outgoingText.trim()}
              >
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
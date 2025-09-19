import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Config } from '@/types';

interface ConfigPanelProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  isConnected: boolean;
  micDevices: MediaDeviceInfo[];
  camDevices: MediaDeviceInfo[];
  selectedMicId?: string;
  selectedCamId?: string;
  setSelectedMicId: (id: string | undefined) => void;
  setSelectedCamId: (id: string | undefined) => void;
  micLevel: number;
  ytVideoId: string;
  setYtVideoId: (id: string) => void;
  ytChatEnabled: boolean;
  startYouTubeChat: () => void;
  stopYouTubeChat: () => void;
  isStreaming: boolean;
}

const voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];

export default function ConfigPanel({
  config,
  setConfig,
  isConnected,
  micDevices,
  camDevices,
  selectedMicId,
  selectedCamId,
  setSelectedMicId,
  setSelectedCamId,
  micLevel,
  ytVideoId,
  setYtVideoId,
  ytChatEnabled,
  startYouTubeChat,
  stopYouTubeChat,
  isStreaming
}: ConfigPanelProps) {
  return (
    <Card className="border-0 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="system-prompt">System Prompt</Label>
          <Textarea
            id="system-prompt"
            value={config.systemPrompt}
            onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
            disabled={isConnected}
            className="min-h-[120px] rounded-xl bg-white/60 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice-select">Voice</Label>
          <Select
            value={config.voice}
            onValueChange={(value) => setConfig(prev => ({ ...prev, voice: value }))}
            disabled={isConnected}
          >
            <SelectTrigger id="voice-select" className="rounded-xl bg-white/60 dark:bg-white/[0.03] border-zinc-200/60 dark:border-white/10">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice} value={voice}>
                  {voice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="google-search"
            checked={config.googleSearch}
            onCheckedChange={(checked) =>
              setConfig(prev => ({ ...prev, googleSearch: checked as boolean }))}
            disabled={isConnected}
          />
          <Label htmlFor="google-search" className="text-zinc-700 dark:text-zinc-300">Enable Google Search</Label>
        </div>

        {/* Devices */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Microphone</Label>
            <select
              className="w-full rounded-xl border border-zinc-200/60 dark:border-white/10 px-3 py-2.5 text-sm bg-white/70 dark:bg-white/[0.03] backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              value={selectedMicId || ''}
              onChange={(e) => setSelectedMicId(e.target.value || undefined)}
              disabled={isStreaming}
            >
              <option value="">Default</option>
              {micDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,6)}`}</option>
              ))}
            </select>
            <div className="h-2.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full overflow-hidden ring-1 ring-black/5">
              <div className="h-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 transition-[width] duration-150 ease-out" style={{ width: `${Math.min(100, Math.round(micLevel * 100))}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Camera</Label>
            <select
              className="w-full rounded-xl border border-zinc-200/60 dark:border-white/10 px-3 py-2.5 text-sm bg-white/70 dark:bg-white/[0.03] backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              value={selectedCamId || ''}
              onChange={(e) => setSelectedCamId(e.target.value || undefined)}
              disabled={isStreaming}
            >
              <option value="">Default</option>
              {camDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,6)}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yt-video-id">YouTube Live URL or Video ID</Label>
          <input
            id="yt-video-id"
            type="text"
            value={ytVideoId}
            onChange={(e) => setYtVideoId(e.target.value)}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-white/10 px-3 py-2.5 text-sm bg-white/70 dark:bg-white/[0.03] backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={!isConnected}
          />
          <div className="flex gap-2">
            <Button onClick={startYouTubeChat} disabled={!isConnected || ytChatEnabled} className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md hover:from-indigo-500 hover:to-sky-500">Start YouTube Chat</Button>
            <Button onClick={stopYouTubeChat} disabled={!isConnected || !ytChatEnabled} variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur">Stop YouTube Chat</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
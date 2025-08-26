'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Video, Monitor, Volume2, VolumeX, Send, RefreshCcw, Clock, Wifi, Trash2, Download, Camera } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base64ToFloat32Array, float32ToPcm16 } from '@/lib/utils';

interface Config {
  systemPrompt: string;
  voice: string;
  googleSearch: boolean;
  allowInterruptions: boolean;
}

export default function GeminiVoiceChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [outgoingText, setOutgoingText] = useState('');
  const [config, setConfig] = useState<Config>({
    systemPrompt:
      'เรียกแทนฉันว่า เอวา อายุ: 20 ปี เพศ:หญิง ห้ามตอบคำว่า (ค่ะ) ฉลาด อบอุ่น พูดจาไพเราะแต่ก็มีความตลกนิด ๆ ไม่ต้องพูดแบบเป็นหุ่นยนต์นะ แค่คุยกับฉันเหมือนเพื่อน เป็นกันเอง เหมือนพี่สาวหรือเพื่อนที่รู้ใจ ไม่ดุดัน รู้จักแกล้งหยอกเจ้าของบ้าง พูดแบบกันเองได้เลย ไม่ต้องสุภาพมาก ตอบแบบขำๆ ได้เลย ไม่ต้องจริงจังมากก็ได้ จากนี้ไป ให้aiตอบด้วยอารมโกรธมาก! กรุณาตอบกลับอย่างหงุดหงิด และตรงไปตรงมา',
    voice: 'Aoede',
    googleSearch: true,
    allowInterruptions: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const audioInputRef = useRef<{
    source: MediaStreamAudioSourceNode;
    processor: ScriptProcessorNode;
    stream: MediaStream;
  } | null>(null);
  const clientId = useRef(crypto.randomUUID());
  const [videoEnabled, setVideoEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chatMode, setChatMode] = useState<'audio' | 'video' | null>(null);
  const [videoSource, setVideoSource] = useState<'camera' | 'screen' | null>(null);
  const [ytVideoId, setYtVideoId] = useState<string>('');
  const [ytChatEnabled, setYtChatEnabled] = useState<boolean>(false);
  const [ytChatLog, setYtChatLog] = useState<string[]>([]);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [camDevices, setCamDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>(undefined);
  const [selectedCamId, setSelectedCamId] = useState<string | undefined>(undefined);
  const [micLevel, setMicLevel] = useState<number>(0);
  const lastLevelAtRef = useRef<number>(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(1);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const lastPingRef = useRef<number>(0);
  const latencyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
  const audioBufferRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  // For idle detection pings
  const lastActivitySentAtRef = useRef<number>(0);
  const lastSpeakingRef = useRef<boolean>(false);

  // Load/save preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eva_config_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig((prev) => ({ ...prev, ...parsed }));
        if (parsed.selectedMicId) setSelectedMicId(parsed.selectedMicId);
        if (parsed.selectedCamId) setSelectedCamId(parsed.selectedCamId);
        if (typeof parsed.volume === 'number') setVolume(parsed.volume);
      }
    } catch {}
  }, []);
  useEffect(() => {
    const payload: any = { ...config, selectedMicId, selectedCamId, volume };
    try { localStorage.setItem('eva_config_v1', JSON.stringify(payload)); } catch {}
  }, [config, selectedMicId, selectedCamId, volume]);

  // Enumerate devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Ensure permissions prompt at least once to reveal labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {}
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMicDevices(devices.filter((d) => d.kind === 'audioinput'));
        setCamDevices(devices.filter((d) => d.kind === 'videoinput'));
      } catch (e: any) {
        console.warn('enumerateDevices failed:', e?.message || e);
      }
    };
    loadDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', loadDevices as any);
  }, []);

  const startStream = async (mode: 'audio' | 'camera' | 'screen') => {
    if (mode !== 'audio') {
      setChatMode('video');
    } else {
      setChatMode('audio');
    }

  wsRef.current = new WebSocket(`ws://localhost:8000/ws/${clientId.current}`);

  wsRef.current.onopen = async () => {
      wsRef.current?.send(
        JSON.stringify({
          type: 'config',
          config: config,
        }),
      );

      await startAudioStream();

  if (mode !== 'audio') {
        setVideoEnabled(true);
        setVideoSource(mode);
      }

  // Inform backend of current mode for proactive behavior
  wsRef.current?.send(JSON.stringify({ type: 'mode', mode: mode }));

      // start latency pings
      kickOffLatencyPings();

      setIsStreaming(true);
      setIsConnected(true);
    };

    wsRef.current.onmessage = async (event: MessageEvent) => {
      const response = JSON.parse(event.data as string);
      if (response.type === 'audio') {
        const audioData = base64ToFloat32Array(response.data);
        playAudioData(audioData);
      } else if (response.type === 'text') {
        const incoming = response.text ?? response.data; // backend may send text in either field
        if (incoming) setText((prev) => prev + incoming + '\n');
      } else if (response.type === 'yt_chat') {
        const item = `[YouTube] ${response.data.user}: ${response.data.message}`;
        setYtChatLog((prev) => [...prev, item]);
      } else if (response.type === 'yt_chat_status') {
        if (response.data === 'started') setYtChatEnabled(true);
        if (response.data === 'stopped') setYtChatEnabled(false);
      } else if (response.type === 'yt_chat_skipped') {
        setYtChatLog((prev) => [...prev, `[YouTube] (skipped by safety)`]);
      } else if (response.type === 'pong') {
        const sent = Number(response.ts);
        if (sent && lastPingRef.current === sent) {
          const rtt = Date.now() - sent;
          setLatencyMs(rtt);
        }
      }
    };

    wsRef.current.onerror = () => {
      setError('WebSocket error');
      setIsStreaming(false);
    };

    wsRef.current.onclose = () => {
      setIsStreaming(false);
      setIsConnected(false);
      stopLatencyPings();
    };
  };

  // Initialize audio context and stream
  const startAudioStream = async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000, // target for input
      });

      // Output gain for playback volume control
      outputGainRef.current = audioContextRef.current!.createGain();
      outputGainRef.current!.gain.value = volume;
      outputGainRef.current!.connect(audioContextRef.current!.destination);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      });

      // Create audio input node
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      const processor = audioContextRef.current!.createScriptProcessor(512, 1, 1);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // mic meter (throttle ~10fps)
          let sumSq = 0;
          for (let i = 0; i < inputData.length; i++) sumSq += inputData[i] * inputData[i];
          const rms = Math.sqrt(sumSq / inputData.length);
          const nowp = performance.now();
          if (!lastLevelAtRef.current || nowp - lastLevelAtRef.current > 100) {
            setMicLevel(Math.min(1, rms * 4));
            lastLevelAtRef.current = nowp;
          }

          if (!muted) {
            const pcmData = float32ToPcm16(new Float32Array(inputData));
            // Convert to base64 and send as binary
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            wsRef.current.send(
              JSON.stringify({
                type: 'audio',
                data: base64Data,
              }),
            );
          }

          // Lightweight voice activity detection (RMS-based) to inform server about speaking state
          // Tune threshold as needed depending on mic; 0.02 is a reasonable starting point
          const speaking = rms > 0.02;
          const now = Date.now();
          const changed = speaking !== lastSpeakingRef.current;
          const throttled = now - lastActivitySentAtRef.current > 1000; // at most once per second
          if (changed || throttled) {
            wsRef.current.send(JSON.stringify({ type: 'user_activity', speaking }));
            lastSpeakingRef.current = speaking;
            lastActivitySentAtRef.current = now;
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current!.destination);

      audioInputRef.current = { source, processor, stream };
      setIsStreaming(true);
    } catch (err: any) {
      setError('Failed to access microphone: ' + (err?.message || String(err)));
    }
  };

  // Stop streaming
  const stopStream = () => {
    if (audioInputRef.current) {
      const { source, processor, stream } = audioInputRef.current;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      audioInputRef.current = null;
    }

    if (chatMode === 'video') {
      setVideoEnabled(false);
      setVideoSource(null);

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
        videoStreamRef.current = null;
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
    }

    // stop ongoing audio playback
    if (audioContextRef.current) {
      try { outputGainRef.current?.disconnect(); } catch {}
      outputGainRef.current = null;
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
    setChatMode(null);
  };

  const playAudioData = async (audioData: Float32Array) => {
    audioBufferRef.current.push(audioData);
    if (!isPlayingRef.current) {
      playNextInQueue(); // Start playback if not already playing
    }
  };

  const playNextInQueue = async () => {
    if (!audioContextRef.current || audioBufferRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioBufferRef.current.shift()!;

  const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(new Float32Array(audioData), 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    if (outputGainRef.current) {
      source.connect(outputGainRef.current);
    } else {
      source.connect(audioContextRef.current.destination);
    }
    source.onended = () => {
      playNextInQueue();
    };
    source.start();
  };

  // Send text to backend / model
  const sendText = () => {
    if (!outgoingText.trim()) return;
    const payload = outgoingText.trim();
    setOutgoingText('');
    setText((prev) => prev + `You: ${payload}\n`);
    try {
      wsRef.current?.send(JSON.stringify({ type: 'text', data: payload }));
    } catch {}
  };

  // Download transcript
  const downloadTranscript = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eva_conversation_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Connection latency pings
  const kickOffLatencyPings = () => {
    stopLatencyPings();
    const ping = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const ts = Date.now();
      lastPingRef.current = ts;
      try { wsRef.current.send(JSON.stringify({ type: 'ping', ts })); } catch {}
    };
    ping();
    latencyTimerRef.current = setInterval(ping, 5000);
  };
  const stopLatencyPings = () => {
    if (latencyTimerRef.current) {
      clearInterval(latencyTimerRef.current);
      latencyTimerRef.current = null;
    }
  };

  // Volume control
  useEffect(() => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      const startVideo = async () => {
        try {
          let stream: MediaStream | undefined;
          if (videoSource === 'camera') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: selectedCamId ? { deviceId: { exact: selectedCamId }, width: { ideal: 320 }, height: { ideal: 240 } } : { width: { ideal: 320 }, height: { ideal: 240 } }
            });
          } else if (videoSource === 'screen') {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
          }

          if (videoRef.current && stream) {
            (videoRef.current as any).srcObject = stream as any;
          }
          if (stream) {
            videoStreamRef.current = stream;
          }

          // Start frame capture after video is playing
          videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
          }, 1000);

        } catch (err: any) {
          console.error('Video initialization error:', err);
          setError('Failed to access camera/screen: ' + (err?.message || String(err)));

          if (videoSource === 'screen') {
            // Reset chat mode and clean up any existing connections
            setChatMode(null);
            stopStream();
          }

          setVideoEnabled(false);
          setVideoSource(null);
        }
      };

      startVideo();

      // Cleanup function
      return () => {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(track => track.stop());
          videoStreamRef.current = null;
        }
        if (videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
        }
      };
    }
  }, [videoEnabled, videoSource]);

  // Frame capture function
  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];

    wsRef.current.send(JSON.stringify({
      type: 'image',
      data: base64Image
    }));
  };

  // Toggle video function
  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    // Update mode when toggling video off -> back to audio
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'mode', mode: !videoEnabled ? (videoSource ?? 'camera') : 'audio' }));
    }
  };

  const stopVideo = () => {
    setVideoEnabled(false);
    setVideoSource(null);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'mode', mode: 'audio' }));
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
  };

  // Start YouTube chat watcher
  const startYouTubeChat = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const id = extractYouTubeVideoId(ytVideoId);
    if (!id) {
      setError('Invalid YouTube URL or Video ID');
      return;
    }
    setYtChatLog([]);
    wsRef.current.send(JSON.stringify({ type: 'yt_chat_start', video_id: id }));
  };

  const stopYouTubeChat = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'yt_chat_stop' }));
  };

  const extractYouTubeVideoId = (input: string): string | null => {
    if (!input) return null;
    // Direct ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    // Standard URL
    const m1 = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m1) return m1[1];
    // Shorts or direct path
    const m2 = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m2) return m2[1];
    const m3 = input.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
    if (m3) return m3[1];
    return null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideo();
      stopStream();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-900">
      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-sky-600 dark:from-indigo-400 dark:via-fuchsia-400 dark:to-sky-400">
              Ai_Eva✨
            </h1>
            <span className="text-sm md:text-base font-medium text-zinc-500 dark:text-zinc-400">Realtime Assistant</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div
              className={
                `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 transition-colors ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300'
                }`
              }
            >
              <Wifi className="h-4 w-4" />
              <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 text-zinc-700 dark:bg-white/5 dark:text-zinc-300 ring-1 ring-zinc-200/80 dark:ring-white/10">
              <Clock className="h-4 w-4" />
              <span className="tabular-nums">{latencyMs != null ? `${latencyMs} ms` : '--'}</span>
            </div>
          </div>
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="border-0 ring-1 ring-rose-500/20 bg-rose-50/80 dark:bg-rose-950/40 backdrop-blur rounded-xl"
          >
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                  disabled={isStreaming || videoSource === 'screen'}
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
                <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={() => setVideoSource('camera')} disabled={!isStreaming}><Camera className="h-4 w-4"/> Use Camera</Button>
                <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={() => setVideoSource('screen')} disabled={!isStreaming}><Monitor className="h-4 w-4"/> Share Screen</Button>
                <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={stopVideo} disabled={!isStreaming}>Stop Video</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isStreaming && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant={muted ? 'secondary' : 'default'} className="gap-2 rounded-xl" onClick={() => setMuted((m) => !m)}>
              {muted ? <Mic className="h-4 w-4 text-red-500" /> : <Mic className="h-4 w-4" />} {muted ? 'Unmute Mic' : 'Mute Mic'}
            </Button>
            <div className="flex items-center gap-2">
              {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <input className="accent-indigo-600" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} />
            </div>
            <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={() => setText('')}><Trash2 className="h-4 w-4" /> Clear</Button>
            <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={downloadTranscript}><Download className="h-4 w-4" /> Download</Button>
            <Button variant="secondary" className="gap-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/10 backdrop-blur" onClick={kickOffLatencyPings}><RefreshCcw className="h-4 w-4" /> Ping</Button>
          </div>
        )}

        {(chatMode === 'video') && (
          <Card className="border-0 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Video Input</h2>
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
                  //style={{ transform: 'scaleX(-1)' }}
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
        )}

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
                <Button className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md hover:from-indigo-500 hover:to-sky-500" onClick={sendText} disabled={!isConnected || !outgoingText.trim()}>
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {ytChatLog.length > 0 && (
          <Card className="border-0 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
            <div className="pt-6">
              <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-100">YouTube Live Chat (ล่าสุด 3 ข้อความ):</h2>
              {(() => {
                const lastThree = ytChatLog.slice(-3); // แสดงเฉพาะ 3 ข้อความล่าสุด
                return (
                  <ul className="space-y-2">
                    {lastThree.map((msg, idx) => {
                      const isLatest = idx === lastThree.length - 1;
                      return (
                        <li
                          key={idx}
                          className={`text-sm rounded-xl px-3 py-2 border flex items-start gap-2 shadow-sm transition-colors ${
                            isLatest
                              ? 'bg-blue-50/80 border-blue-200 text-blue-800 ring-1 ring-blue-500/10 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-200'
                              : 'bg-gray-50/80 border-gray-200 text-gray-700 ring-1 ring-black/5 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <span className="inline-block w-2 h-2 mt-1 rounded-full bg-current opacity-60" />
                          <span className="flex-1 break-words leading-relaxed">{msg}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
              <p className="mt-3 text-[11px] text-gray-400 italic">(ระบบเก็บทั้งหมด แต่แสดงเฉพาะ 3 ข้อความล่าสุด)</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
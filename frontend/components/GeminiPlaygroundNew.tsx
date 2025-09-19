'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base64ToFloat32Array, float32ToPcm16 } from '@/lib/utils';
import { Config } from '@/types';

// Import new components
import StatusBar from '@/components/StatusBar';
import ConfigPanel from '@/components/ConfigPanel';
import ControlPanel from '@/components/ControlPanel';
import AudioControls from '@/components/AudioControls';
import VideoDisplay from '@/components/VideoDisplay';
import YouTubeChat from '@/components/YouTubeChat';

export default function GeminiVoiceChat() {
  // State
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

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const audioInputRef = useRef<{
    source: MediaStreamAudioSourceNode;
    processor: ScriptProcessorNode;
    stream: MediaStream;
  } | null>(null);
  const clientId = useRef(crypto.randomUUID());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Video & chat states
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [chatMode, setChatMode] = useState<'audio' | 'video' | null>(null);
  const [videoSource, setVideoSource] = useState<'camera' | 'screen' | null>(null);
  const [ytVideoId, setYtVideoId] = useState<string>('');
  const [ytChatEnabled, setYtChatEnabled] = useState<boolean>(false);
  const [ytChatLog, setYtChatLog] = useState<string[]>([]);

  // Device states
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [camDevices, setCamDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>(undefined);
  const [selectedCamId, setSelectedCamId] = useState<string | undefined>(undefined);

  // Audio states
  const [micLevel, setMicLevel] = useState<number>(0);
  const lastLevelAtRef = useRef<number>(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(1);

  // Connection states
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const lastPingRef = useRef<number>(0);
  const latencyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio processing
  const audioBufferRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const lastActivitySentAtRef = useRef<number>(0);
  const lastSpeakingRef = useRef<boolean>(false);

  // Memoized functions
  const sendText = useCallback(() => {
    if (!outgoingText.trim()) return;
    const payload = outgoingText.trim();
    setOutgoingText('');
    setText((prev) => prev + `You: ${payload}\\n`);
    try {
      wsRef.current?.send(JSON.stringify({ type: 'text', data: payload }));
    } catch (e) {
      console.error('Failed to send text:', e);
    }
  }, [outgoingText]);

  const downloadTranscript = useCallback(() => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eva_conversation_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [text]);

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
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }, []);

  useEffect(() => {
    const payload: any = { ...config, selectedMicId, selectedCamId, volume };
    try { 
      localStorage.setItem('eva_config_v1', JSON.stringify(payload)); 
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }, [config, selectedMicId, selectedCamId, volume]);

  // Enumerate devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.warn('Failed to get media permissions:', e);
      }
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

  // Audio processing functions
  const playAudioData = async (audioData: Float32Array) => {
    audioBufferRef.current.push(audioData);
    if (!isPlayingRef.current) {
      playNextInQueue();
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

  // Connection functions
  const kickOffLatencyPings = useCallback(() => {
    if (latencyTimerRef.current) {
      clearInterval(latencyTimerRef.current);
    }
    const ping = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const ts = Date.now();
      lastPingRef.current = ts;
      try { 
        wsRef.current.send(JSON.stringify({ type: 'ping', ts })); 
      } catch (e) {
        console.error('Failed to send ping:', e);
      }
    };
    ping();
    latencyTimerRef.current = setInterval(ping, 5000);
  }, []);

  const stopLatencyPings = useCallback(() => {
    if (latencyTimerRef.current) {
      clearInterval(latencyTimerRef.current);
      latencyTimerRef.current = null;
    }
  }, []);

  // Volume control
  useEffect(() => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = volume;
    }
  }, [volume]);

  // Start audio stream
  const startAudioStream = async () => {
    try {
      audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      outputGainRef.current = audioContextRef.current!.createGain();
      outputGainRef.current!.gain.value = volume;
      outputGainRef.current!.connect(audioContextRef.current!.destination);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      });

      const source = audioContextRef.current!.createMediaStreamSource(stream);
      const processor = audioContextRef.current!.createScriptProcessor(512, 1, 1);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
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
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            wsRef.current.send(
              JSON.stringify({
                type: 'audio',
                data: base64Data,
              }),
            );
          }

          const speaking = rms > 0.02;
          const now = Date.now();
          const changed = speaking !== lastSpeakingRef.current;
          const throttled = now - lastActivitySentAtRef.current > 1000;
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

  // Start stream function
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

      wsRef.current?.send(JSON.stringify({ type: 'mode', mode: mode }));
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
        const incoming = response.text ?? response.data;
        if (incoming) setText((prev) => prev + incoming + '\\n');
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

  // Stop stream function
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

    if (audioContextRef.current) {
      try { outputGainRef.current?.disconnect(); } catch (e) {}
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

  // Video functions
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

  // Video capture
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

  // Video effect
  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      const startVideo = async () => {
        try {
          let stream: MediaStream | undefined;
          if (videoSource === 'camera') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: selectedCamId ? 
                { deviceId: { exact: selectedCamId }, width: { ideal: 320 }, height: { ideal: 240 } } : 
                { width: { ideal: 320 }, height: { ideal: 240 } }
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

          videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
          }, 1000);

        } catch (err: any) {
          console.error('Video initialization error:', err);
          setError('Failed to access camera/screen: ' + (err?.message || String(err)));

          if (videoSource === 'screen') {
            setChatMode(null);
            stopStream();
          }

          setVideoEnabled(false);
          setVideoSource(null);
        }
      };

      startVideo();

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
  }, [videoEnabled, videoSource, selectedCamId]);

  // YouTube functions
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
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const m1 = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m1) return m1[1];
    const m2 = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m2) return m2[1];
    const m3 = input.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
    if (m3) return m3[1];
    return null;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopVideo();
      stopStream();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-900">
      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <StatusBar 
          isConnected={isConnected}
          latencyMs={latencyMs}
          error={error}
          setError={setError}
        />

        <ConfigPanel
          config={config}
          setConfig={setConfig}
          isConnected={isConnected}
          micDevices={micDevices}
          camDevices={camDevices}
          selectedMicId={selectedMicId}
          selectedCamId={selectedCamId}
          setSelectedMicId={setSelectedMicId}
          setSelectedCamId={setSelectedCamId}
          micLevel={micLevel}
          ytVideoId={ytVideoId}
          setYtVideoId={setYtVideoId}
          ytChatEnabled={ytChatEnabled}
          startYouTubeChat={startYouTubeChat}
          stopYouTubeChat={stopYouTubeChat}
          isStreaming={isStreaming}
        />

        <ControlPanel
          isStreaming={isStreaming}
          isConnected={isConnected}
          startStream={startStream}
          stopStream={stopStream}
          setVideoSource={setVideoSource}
          stopVideo={stopVideo}
          chatMode={chatMode}
        />

        <AudioControls
          isStreaming={isStreaming}
          muted={muted}
          setMuted={setMuted}
          volume={volume}
          setVolume={setVolume}
          setText={setText}
          downloadTranscript={downloadTranscript}
          kickOffLatencyPings={kickOffLatencyPings}
          text={text}
          outgoingText={outgoingText}
          setOutgoingText={setOutgoingText}
          sendText={sendText}
          isConnected={isConnected}
        />

        <VideoDisplay
          chatMode={chatMode}
          videoSource={videoSource}
          videoRef={videoRef}
          canvasRef={canvasRef}
        />

        <YouTubeChat ytChatLog={ytChatLog} />
      </div>
    </div>
  );
}
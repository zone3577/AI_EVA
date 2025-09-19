import { useState, useRef, useEffect, useCallback } from 'react';
import { calculateRMS, normalizeAudioLevel, float32ToPcm16 } from '@/lib/utils';

interface UseAudioStreamOptions {
  deviceId?: string;
  sampleRate?: number;
  onAudioData?: (data: string) => void;
  onMicLevel?: (level: number) => void;
  onActivityChange?: (speaking: boolean) => void;
  muted?: boolean;
}

export function useAudioStream({
  deviceId,
  sampleRate = 16000,
  onAudioData,
  onMicLevel,
  onActivityChange,
  muted = false
}: UseAudioStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const audioInputRef = useRef<{
    source: MediaStreamAudioSourceNode;
    processor: ScriptProcessorNode;
    stream: MediaStream;
  } | null>(null);
  
  const lastLevelAtRef = useRef<number>(0);
  const lastSpeakingRef = useRef<boolean>(false);
  const lastActivitySentAtRef = useRef<number>(0);

  const startStream = useCallback(async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({
        sampleRate
      });

      if (!audioContextRef.current) {
        throw new Error('Failed to create AudioContext');
      }

      // Output gain for playback volume control
      outputGainRef.current = audioContextRef.current.createGain();
      outputGainRef.current.connect(audioContextRef.current.destination);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });

      // Create audio input node
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate microphone level
        const rms = calculateRMS(inputData);
        const level = normalizeAudioLevel(rms);
        
        // Throttle mic level updates to ~10fps
        const nowp = performance.now();
        if (!lastLevelAtRef.current || nowp - lastLevelAtRef.current > 100) {
          onMicLevel?.(level);
          lastLevelAtRef.current = nowp;
        }

        // Send audio data if not muted
        if (!muted && onAudioData) {
          const pcmData = float32ToPcm16(new Float32Array(inputData));
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          onAudioData(base64Data);
        }

        // Voice activity detection
        const speaking = rms > 0.02;
        const now = Date.now();
        const changed = speaking !== lastSpeakingRef.current;
        const throttled = now - lastActivitySentAtRef.current > 1000;
        
        if ((changed || throttled) && onActivityChange) {
          onActivityChange(speaking);
          lastSpeakingRef.current = speaking;
          lastActivitySentAtRef.current = now;
        }
      };

      source.connect(processor);
      if (audioContextRef.current) {
        processor.connect(audioContextRef.current.destination);
      }

      audioInputRef.current = { source, processor, stream };
      setIsStreaming(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to access microphone: ' + (err?.message || String(err)));
    }
  }, [deviceId, sampleRate, onAudioData, onMicLevel, onActivityChange, muted]);

  const stopStream = useCallback(() => {
    if (audioInputRef.current) {
      const { source, processor, stream } = audioInputRef.current;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      audioInputRef.current = null;
    }

    if (audioContextRef.current) {
      try { 
        outputGainRef.current?.disconnect(); 
      } catch (e) {
        console.warn('Failed to disconnect output gain:', e);
      }
      outputGainRef.current = null;
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsStreaming(false);
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isStreaming,
    error,
    startStream,
    stopStream,
    setVolume,
    audioContext: audioContextRef.current,
    outputGain: outputGainRef.current
  };
}
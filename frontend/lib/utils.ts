import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const float32ToPcm16 = (float32Array: Float32Array | number[]): Int16Array => {
  const length = float32Array.length;
  const pcm16 = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
};

// Utility function to convert base64 to Float32Array
export const base64ToFloat32Array = (base64: string): Float32Array => {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    // Convert to 16-bit PCM
    const pcm16 = new Int16Array(bytes.buffer);
    // Convert to float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }
    return float32;
  } catch (error) {
    console.error('Failed to convert base64 to Float32Array:', error);
    return new Float32Array(0);
  }
};

// Audio utility functions
export const calculateRMS = (audioData: Float32Array): number => {
  let sumSq = 0;
  for (let i = 0; i < audioData.length; i++) {
    sumSq += audioData[i] * audioData[i];
  }
  return Math.sqrt(sumSq / audioData.length);
};

export const normalizeAudioLevel = (rms: number, multiplier: number = 4): number => {
  return Math.min(1, rms * multiplier);
};

// Format utilities
export const formatLatency = (ms: number | null): string => {
  return ms != null ? `${ms} ms` : '--';
};

export const formatTimestamp = (date: Date = new Date()): string => {
  return date.toISOString().replace(/[:.]/g, '-');
};

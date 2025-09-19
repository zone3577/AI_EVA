import React from 'react';

export interface Config {
  systemPrompt: string;
  voice: string;
  googleSearch: boolean;
  allowInterruptions: boolean;
}

export interface ClientState {
  last_activity: number;
  allow_yt_reply: boolean;
  mode: 'audio' | 'camera' | 'screen';
  last_image: number;
  last_yt_chat: number;
  last_proactive: number;
}

export interface AudioInputRef {
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  stream: MediaStream;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isStreaming: boolean;
  latencyMs: number | null;
}

export interface AudioState {
  muted: boolean;
  volume: number;
  micLevel: number;
}

export interface VideoState {
  enabled: boolean;
  source: 'camera' | 'screen' | null;
}

export interface YouTubeState {
  videoId: string;
  chatEnabled: boolean;
  chatLog: string[];
}
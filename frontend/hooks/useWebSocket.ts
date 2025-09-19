import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseWebSocketOptions {
  url: string;
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export function useWebSocket({ url, onOpen, onMessage, onError, onClose }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        onOpen?.();
      };

      wsRef.current.onmessage = (event) => {
        onMessage?.(event);
      };

      wsRef.current.onerror = (event) => {
        setError('WebSocket connection error');
        onError?.(event);
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        onClose?.(event);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [url, onOpen, onMessage, onError, onClose]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    websocket: wsRef.current
  };
}
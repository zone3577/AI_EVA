'use client';

import React from 'react';
import { Wifi, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';

interface StatusBarProps {
  isConnected: boolean;
  latencyMs: number | null;
  error: string | null;
  setError: (error: string | null) => void;
}

export default function StatusBar({ isConnected, latencyMs, error, setError }: StatusBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-sky-600 dark:from-indigo-400 dark:via-fuchsia-400 dark:to-sky-400">
            Ai_Eva✨
          </h1>
          <span className="text-sm md:text-base font-medium text-zinc-500 dark:text-zinc-400">
            Realtime Assistant
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ThemeToggle />
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
          <AlertDescription className="flex justify-between items-center">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-rose-600 hover:text-rose-800 text-sm underline"
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
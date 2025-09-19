import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin text-indigo-600 dark:text-indigo-400',
        sizeClasses[size],
        className
      )} 
    />
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, message = 'Loading...', children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-50">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  retry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
}

export function LoadingState({ 
  isLoading, 
  error, 
  retry, 
  children, 
  loadingMessage = 'Loading...' 
}: LoadingStateProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-rose-600 dark:text-rose-400 mb-2">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">Something went wrong</h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
        {retry && (
          <button 
            onClick={retry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-zinc-600 dark:text-zinc-400">{loadingMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
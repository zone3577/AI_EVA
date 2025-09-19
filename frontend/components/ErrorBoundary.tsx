'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.reset} />;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <Alert className="border-0 ring-1 ring-rose-500/20 bg-rose-50/80 dark:bg-rose-950/40 backdrop-blur rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>The application encountered an unexpected error. Please try refreshing the page.</p>
                {this.state.error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
                    <pre className="mt-2 text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-auto max-h-32">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2 mt-4">
                  <Button onClick={this.reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
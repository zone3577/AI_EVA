import { useState, useCallback, useRef } from 'react';

interface UseRetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

export function useRetry({ maxAttempts = 3, delay = 1000, backoff = true }: UseRetryOptions = {}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const retry = useCallback(async <T>(
    fn: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> => {
    setIsRetrying(true);
    setAttempts(0);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        setIsRetrying(false);
        setAttempts(0);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setAttempts(attempt);
        onError?.(err, attempt);

        if (attempt === maxAttempts) {
          setIsRetrying(false);
          throw err;
        }

        // Wait before retry with optional backoff
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise(resolve => {
          timeoutRef.current = setTimeout(resolve, waitTime);
        });
      }
    }

    setIsRetrying(false);
    throw new Error('Max retry attempts exceeded');
  }, [maxAttempts, delay, backoff]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsRetrying(false);
    setAttempts(0);
  }, []);

  return {
    retry,
    cancel,
    isRetrying,
    attempts
  };
}
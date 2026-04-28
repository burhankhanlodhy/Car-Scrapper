import { config } from '../config';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? config.maxRetries;
  const baseDelay = opts.baseDelayMs ?? 1000;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt >= maxRetries) break;

      const delay = baseDelay * Math.pow(3, attempt);
      opts.onRetry?.(attempt + 1, lastError);
      await sleep(delay);
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function delayWithJitter(baseMs: number, jitterMs: number): Promise<void> {
  const jitter = Math.floor(Math.random() * jitterMs * 2) - jitterMs;
  await sleep(Math.max(0, baseMs + jitter));
}

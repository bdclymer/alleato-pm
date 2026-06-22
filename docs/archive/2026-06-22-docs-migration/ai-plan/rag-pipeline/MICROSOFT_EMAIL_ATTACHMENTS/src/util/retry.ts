export interface RetryOptions {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_ATTEMPTS = 4;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10_000;
const DEFAULT_FACTOR = 2;

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const factor = options.factor ?? DEFAULT_FACTOR;
  const jitter = options.jitter ?? true;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry = options.shouldRetry?.(error, attempt) ?? true;
      if (attempt >= attempts || !canRetry) {
        break;
      }

      const baseDelay = Math.min(
        initialDelayMs * Math.pow(factor, attempt - 1),
        maxDelayMs,
      );
      const delay = jitter
        ? Math.round(baseDelay * (0.75 + Math.random() * 0.5))
        : baseDelay;

      await sleep(delay);
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

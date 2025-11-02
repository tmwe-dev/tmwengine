/**
 * Advanced Retry Logic con Exponential Backoff e Timeout
 * Supporta circuit breaker awareness e categorizzazione errori
 */

export type ErrorCategory = 'network' | 'imap' | 'timeout' | 'api' | 'auth' | 'unknown';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  retryableErrors?: ErrorCategory[];
  onRetry?: (attempt: number, error: Error, category: ErrorCategory) => void;
}

export interface RetryResult<T> {
  data: T | null;
  error: Error | null;
  attempts: number;
  totalDuration: number;
  errorCategory: ErrorCategory;
}

function categorizeError(error: any): ErrorCategory {
  const message = error?.message || JSON.stringify(error);
  
  if (message.includes('Connection refused') || message.includes('IMAP')) return 'imap';
  if (message.includes('timeout') || message.includes('Timeout')) return 'timeout';
  if (message.includes('fetch') || message.includes('network')) return 'network';
  if (message.includes('Unauthorized') || message.includes('auth')) return 'auth';
  if (message.includes('TMWE API Error')) return 'api';
  
  return 'unknown';
}

function isRetryable(category: ErrorCategory, retryableErrors: ErrorCategory[]): boolean {
  return retryableErrors.includes(category);
}

export async function withAdvancedRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout = 30000,
    retryableErrors = ['network', 'imap', 'timeout'], // NON retry su auth/api errors
    onRetry
  } = options;

  const startTime = Date.now();
  let lastError: Error;
  let lastCategory: ErrorCategory = 'unknown';
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Applica timeout wrapper
      const timeoutPromise = new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
      );
      
      const result = await Promise.race([fn(), timeoutPromise]);
      
      return {
        data: result,
        error: null,
        attempts: attempt + 1,
        totalDuration: Date.now() - startTime,
        errorCategory: 'unknown'
      };
      
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      lastCategory = categorizeError(lastError);
      
      console.warn(`⚠️ Attempt ${attempt + 1}/${maxRetries} failed (${lastCategory}):`, lastError.message);
      
      // Se non è retryable, fallisci subito
      if (!isRetryable(lastCategory, retryableErrors)) {
        console.error(`❌ Error category '${lastCategory}' is not retryable, aborting`);
        break;
      }
      
      // Se è l'ultimo tentativo, fallisci
      if (attempt === maxRetries - 1) {
        console.error(`❌ Max retries (${maxRetries}) reached`);
        break;
      }

      // Callback retry
      if (onRetry) {
        onRetry(attempt + 1, lastError, lastCategory);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  return {
    data: null,
    error: lastError!,
    attempts: maxRetries,
    totalDuration: Date.now() - startTime,
    errorCategory: lastCategory
  };
}

// Helper specializzato per chiamate TMWE
export async function withTMWERetry<T>(
  fn: () => Promise<T>,
  handler: string,
  onRetry?: (attempt: number) => void,
  customTimeout?: number // 🆕 Timeout configurabile
): Promise<T> {
  const result = await withAdvancedRetry(fn, {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    timeout: customTimeout || 30000, // ✅ Usa custom o default 30s
    retryableErrors: ['network', 'imap', 'timeout'],
    onRetry: onRetry ? (attempt, error, category) => {
      console.log(`🔄 [${handler}] Retry ${attempt}/3 (${category})`);
      onRetry(attempt);
    } : undefined
  });

  if (result.error) {
    throw result.error;
  }

  return result.data!;
}

// Helper per categorizzare errori (esportato per uso esterno)
export { categorizeError };

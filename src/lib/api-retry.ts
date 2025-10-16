// Retry logic con exponential backoff per chiamate API critiche

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries - 1) {
        console.error(`❌ Max retries (${maxRetries}) reached`);
        throw lastError;
      }

      console.warn(`❌ Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
      
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff with max delay
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError!;
};

// Versione specializzata per API TMWE
export const withTMWERetry = async <T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number) => void
): Promise<T> => {
  return withRetry(fn, {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    onRetry: onRetry ? (attempt) => onRetry(attempt) : undefined
  });
};

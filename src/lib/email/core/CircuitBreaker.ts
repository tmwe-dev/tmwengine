/**
 * Circuit Breaker Pattern per proteggere tmwe-api-proxy da sovraccarico
 * 
 * Stati:
 * - CLOSED: Funzionamento normale
 * - OPEN: Blocco dopo 5 fallimenti consecutivi (1 minuto)
 * - HALF_OPEN: Test recovery dopo timeout
 * 
 * Previene:
 * - API overload
 * - 429 Too Many Requests
 * - Cascading failures
 */

export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5; // Fallimenti prima di aprire
  private readonly timeout = 60000; // 1 minuto

  /**
   * Esegue funzione con protezione Circuit Breaker
   * Lancia error se Circuit è OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('[CircuitBreaker] Attempting recovery (HALF_OPEN)');
      } else {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      console.log('[CircuitBreaker] Recovery successful (CLOSED)');
    }
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error(`[CircuitBreaker] OPENED after ${this.failures} failures. Wait ${this.timeout}ms.`);
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    console.log('[CircuitBreaker] Manual reset');
  }

  getFailureCount(): number {
    return this.failures;
  }
}

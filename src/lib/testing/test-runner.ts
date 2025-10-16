import type { Test, TestResult, TestSuiteResult } from './test-types';

export class TestRunner {
  async runTest(test: Test): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const result = await test.test();
      const executionTime = Math.round(performance.now() - startTime);
      const delta = executionTime - test.expected_time_ms;
      
      // Determina status in base alla performance
      let status: 'success' | 'slow' | 'error' = 'success';
      if (executionTime > test.expected_time_ms * 1.5) {
        status = 'slow'; // 50% più lento del previsto
      }
      
      return {
        test_name: test.name,
        execution_time_ms: executionTime,
        status,
        expected_time_ms: test.expected_time_ms,
        delta_ms: delta,
        result_size: this.getResultSize(result),
        metadata: {
          description: test.description,
          result
        }
      };
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      return {
        test_name: test.name,
        execution_time_ms: executionTime,
        status: 'error',
        expected_time_ms: test.expected_time_ms,
        delta_ms: 0,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          description: test.description
        }
      };
    }
  }
  
  async runTestSuite(
    suiteName: string,
    tests: Test[],
    onProgress?: (current: number, total: number) => void
  ): Promise<TestSuiteResult> {
    const results: TestResult[] = [];
    const startTime = performance.now();
    
    for (let i = 0; i < tests.length; i++) {
      const result = await this.runTest(tests[i]);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, tests.length);
      }
      
      // Piccolo delay tra test per non sovraccaricare
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const totalTime = Math.round(performance.now() - startTime);
    
    return {
      suite_name: suiteName,
      total_tests: tests.length,
      passed: results.filter(r => r.status === 'success').length,
      slow: results.filter(r => r.status === 'slow').length,
      failed: results.filter(r => r.status === 'error').length,
      total_time_ms: totalTime,
      results
    };
  }
  
  private getResultSize(result: any): number {
    if (!result) return 0;
    
    try {
      if (result.data && Array.isArray(result.data)) {
        return result.data.length;
      }
      if (result.count !== undefined) {
        return result.count;
      }
      if (typeof result === 'object') {
        return Object.keys(result).length;
      }
      return 0;
    } catch {
      return 0;
    }
  }
  
  generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];
    
    const slowTests = results.filter(r => r.status === 'slow');
    const failedTests = results.filter(r => r.status === 'error');
    
    if (slowTests.length > 0) {
      recommendations.push(
        `⚠️ ${slowTests.length} test${slowTests.length > 1 ? 's' : ''} lent${slowTests.length > 1 ? 'i' : 'o'}: considera ottimizzazione query o indici`
      );
      
      const slowestTest = slowTests.reduce((a, b) => a.delta_ms > b.delta_ms ? a : b);
      recommendations.push(
        `🐌 Test più lento: "${slowestTest.test_name}" (+${slowestTest.delta_ms}ms rispetto atteso)`
      );
    }
    
    if (failedTests.length > 0) {
      recommendations.push(
        `❌ ${failedTests.length} test fallito/i: verifica configurazione sistema`
      );
    }
    
    const avgPerformance = results
      .filter(r => r.status !== 'error')
      .reduce((acc, r) => acc + (r.execution_time_ms / r.expected_time_ms), 0) / results.length;
    
    if (avgPerformance < 1.2) {
      recommendations.push('✅ Performance eccellente! Sistema ottimizzato');
    } else if (avgPerformance < 1.5) {
      recommendations.push('✅ Performance buone, margini di miglioramento minimi');
    } else {
      recommendations.push('⚠️ Performance da migliorare: considera ottimizzazioni');
    }
    
    return recommendations;
  }
}

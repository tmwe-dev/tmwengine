// Tipi comuni per il sistema di testing

export interface TestResult {
  test_name: string;
  execution_time_ms: number;
  status: 'success' | 'slow' | 'error';
  expected_time_ms: number;
  delta_ms: number;
  result_size?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BenchmarkResult {
  variant: string;
  responseTime: number;
  status: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: Test[];
  category: 'database' | 'intranet' | 'laboratory' | 'voice-video' | 'api';
}

export interface Test {
  name: string;
  description: string;
  expected_time_ms: number;
  test: () => Promise<any>;
}

export interface TestSuiteResult {
  suite_name: string;
  total_tests: number;
  passed: number;
  slow: number;
  failed: number;
  total_time_ms: number;
  results: TestResult[];
}

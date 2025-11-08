/**
 * Email Testing Utilities
 * Helper functions per export CSV e gestione test results
 */

export interface TestResult {
  method: string;
  downloaded: number;
  failed: number;
  duration: number;
  status: 'idle' | 'running' | 'success' | 'error';
}

/**
 * Esporta i risultati dei test in formato CSV
 */
export function exportTestResultsToCSV(results: TestResult[]) {
  const headers = ['Method', 'Downloaded', 'Failed', 'Duration', 'Status', 'Timestamp'];
  const timestamp = new Date().toISOString();
  
  const rows = results.map(r => [
    r.method,
    r.downloaded.toString(),
    r.failed.toString(),
    `${r.duration}s`,
    r.status,
    timestamp
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `email-test-results-${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Calcola statistiche aggregate dai risultati
 */
export function calculateAggregateStats(results: TestResult[]) {
  const successfulTests = results.filter(r => r.status === 'success');
  
  if (successfulTests.length === 0) {
    return {
      avgDownloaded: 0,
      avgFailed: 0,
      avgDuration: 0,
      totalTests: results.length,
      successRate: 0
    };
  }

  return {
    avgDownloaded: successfulTests.reduce((sum, r) => sum + r.downloaded, 0) / successfulTests.length,
    avgFailed: successfulTests.reduce((sum, r) => sum + r.failed, 0) / successfulTests.length,
    avgDuration: successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length,
    totalTests: results.length,
    successRate: (successfulTests.length / results.length) * 100
  };
}

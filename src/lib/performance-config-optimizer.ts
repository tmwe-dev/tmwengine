/**
 * 📊 Performance Config Optimizer
 * 
 * Analizza i risultati dei test salvati in localStorage e genera
 * configurazioni ottimali per Quick Download e Email Sync.
 * 
 * @version 1.0.0
 * @date 2025-11-02
 */

// ==================== TYPES ====================

export interface OptimalFolderConfig {
  batchSize: number;
  parallelBatches: number;
  timeout: number;
  includeAttachments: boolean;
  maxRetries: number;
  confidence: 'high' | 'medium' | 'low'; // Basato su quanti test sono stati eseguiti
  notes: string[];
}

export interface PerformanceAnalysis {
  testDate: string;
  totalTestsRun: number;
  overallSuccessRate: number;
  
  // Configurazioni per tipo di folder
  folderConfigs: {
    INBOX: OptimalFolderConfig;
    Sent: OptimalFolderConfig;
    Trash: OptimalFolderConfig;
    Archive: OptimalFolderConfig;
    default: OptimalFolderConfig;
  };
  
  // Insights da IMAP Health Check
  imapHealth?: {
    status: 'healthy' | 'degraded' | 'critical';
    avgConnectionTime: number;
    avgRetrievalTime: number;
    issues: string[];
  };
  
  // Comparazione metadata vs full body
  metadataInsight?: {
    speedupFactor: number;
    recommendation: 'metadata-only' | 'full-body' | 'mixed';
    notes: string;
  };
  
  // Raccomandazioni generali
  recommendations: string[];
}

// ==================== ANALYZER ====================

/**
 * Legge i risultati da localStorage e genera l'analisi completa
 */
export function analyzePerformanceResults(): PerformanceAnalysis | null {
  try {
    const savedReport = localStorage.getItem('last-suite-report');
    if (!savedReport) {
      console.warn('⚠️ [OPTIMIZER] No test results found in localStorage');
      return null;
    }

    const { timestamp, report, results } = JSON.parse(savedReport);
    console.log('📊 [OPTIMIZER] Analyzing', results.length, 'test results from', new Date(timestamp).toLocaleString('it-IT'));

    // STEP 1: Analizza IMAP Health Check
    const healthCheckResult = results.find((r: any) => r.config.testType === 'imap-health');
    const imapHealth = healthCheckResult?.healthCheck ? {
      status: healthCheckResult.healthCheck.overallHealth,
      avgConnectionTime: healthCheckResult.healthCheck.accountConnectionTime + healthCheckResult.healthCheck.folderAccessTime,
      avgRetrievalTime: healthCheckResult.healthCheck.emailRetrievalTime,
      issues: healthCheckResult.healthCheck.issues || []
    } : undefined;

    // STEP 2: Analizza Batch Compare per trovare batch size ottimale
    const batchCompareResult = results.find((r: any) => r.config.testType === 'batch-compare');
    const optimalBatchFromCompare = batchCompareResult?.comparisonData
      ? batchCompareResult.comparisonData.reduce((best: any, curr: any) => {
          const score = curr.metrics.throughput * (curr.metrics.successRate / 100);
          const bestScore = best.metrics.throughput * (best.metrics.successRate / 100);
          return score > bestScore ? curr : best;
        })
      : null;

    // STEP 3: Analizza Light vs Full per metadata insight
    const lightVsFullResult = results.find((r: any) => r.config.testType === 'light-vs-full');
    const metadataInsight = lightVsFullResult?.metadataComparison ? {
      speedupFactor: lightVsFullResult.metadataComparison.metadataOnly.throughput / 
                     lightVsFullResult.metadataComparison.withBody.throughput,
      recommendation: (lightVsFullResult.metadataComparison.metadataOnly.throughput > 
                      lightVsFullResult.metadataComparison.withBody.throughput * 1.5)
        ? 'metadata-only' as const
        : 'mixed' as const,
      notes: `Metadata-only è ${((lightVsFullResult.metadataComparison.metadataOnly.throughput / lightVsFullResult.metadataComparison.withBody.throughput - 1) * 100).toFixed(0)}% più veloce`
    } : undefined;

    // STEP 4: Analizza test per folder specifiche
    const inboxTests = results.filter((r: any) => r.config.folder === 'INBOX' && r.config.testType !== 'imap-health');
    const trashTests = results.filter((r: any) => r.config.folder === 'Trash');
    const sentTests = results.filter((r: any) => r.config.folder === 'Sent');

    // STEP 5: Genera configurazioni ottimali
    const folderConfigs = {
      INBOX: generateFolderConfig('INBOX', inboxTests, optimalBatchFromCompare, imapHealth),
      Sent: generateFolderConfig('Sent', sentTests, optimalBatchFromCompare, imapHealth),
      Trash: generateFolderConfig('Trash', trashTests, null, imapHealth),
      Archive: generateDefaultConfig('Archive', imapHealth),
      default: generateDefaultConfig('default', imapHealth)
    };

    // STEP 6: Genera raccomandazioni
    const recommendations = generateRecommendations(results, imapHealth, metadataInsight, folderConfigs);

    return {
      testDate: new Date(timestamp).toLocaleString('it-IT'),
      totalTestsRun: results.length,
      overallSuccessRate: parseFloat(report.overallSuccessRate),
      folderConfigs,
      imapHealth,
      metadataInsight,
      recommendations
    };

  } catch (err) {
    console.error('❌ [OPTIMIZER] Failed to analyze results:', err);
    return null;
  }
}

/**
 * Genera configurazione ottimale per una folder specifica basandosi sui test
 */
function generateFolderConfig(
  folderName: string,
  tests: any[],
  optimalBatchFromCompare: any,
  imapHealth?: any
): OptimalFolderConfig {
  if (tests.length === 0) {
    return generateDefaultConfig(folderName, imapHealth);
  }

  // Trova il test con il miglior throughput e success rate
  const bestTest = tests.reduce((best, curr) => {
    const score = curr.metrics.throughput * (curr.metrics.successRate / 100);
    const bestScore = best ? best.metrics.throughput * (best.metrics.successRate / 100) : 0;
    return score > bestScore ? curr : best;
  }, null);

  // Verifica se ci sono stati errori
  const hasErrors = tests.some(t => t.metrics.errors > 0 || t.metrics.successRate < 95);
  const avgThroughput = tests.reduce((sum, t) => sum + t.metrics.throughput, 0) / tests.length;

  // Determina batch size ottimale
  let batchSize = bestTest?.config.batchSize || 25;
  if (optimalBatchFromCompare) {
    batchSize = optimalBatchFromCompare.batchSize;
  }

  // Determina parallel batches ottimale
  const parallelTest = tests.find(t => t.config.testType === 'parallel');
  let parallelBatches = parallelTest?.config.parallelBatches || 3;
  
  // Se ci sono errori, riduci concorrenza
  if (hasErrors || avgThroughput < 10) {
    parallelBatches = Math.max(2, parallelBatches - 1);
  }

  // Determina timeout ottimale
  const avgTime = tests.reduce((sum, t) => sum + t.metrics.totalTime, 0) / tests.length;
  const timeout = Math.max(30000, Math.ceil(avgTime * 2)); // 2x tempo medio, minimo 30s

  // Note
  const notes: string[] = [];
  if (hasErrors) {
    notes.push(`⚠️ Rilevati errori nei test - configurazione conservativa applicata`);
  }
  if (avgThroughput > 20) {
    notes.push(`✅ Performance eccellente (${avgThroughput.toFixed(1)} email/s)`);
  } else if (avgThroughput < 10) {
    notes.push(`⚠️ Performance bassa (${avgThroughput.toFixed(1)} email/s) - verifica IMAP health`);
  }

  return {
    batchSize,
    parallelBatches,
    timeout,
    includeAttachments: false, // Sempre false per listing (da metadataInsight)
    maxRetries: 3,
    confidence: tests.length >= 3 ? 'high' : tests.length >= 2 ? 'medium' : 'low',
    notes
  };
}

/**
 * Genera configurazione default quando non ci sono test per la folder
 */
function generateDefaultConfig(folderName: string, imapHealth?: any): OptimalFolderConfig {
  // Configurazione conservativa se IMAP è degradato
  if (imapHealth?.status === 'degraded' || imapHealth?.status === 'critical') {
    return {
      batchSize: 10,
      parallelBatches: 2,
      timeout: 60000,
      includeAttachments: false,
      maxRetries: 3,
      confidence: 'low',
      notes: ['⚠️ Configurazione conservativa (IMAP health degraded)']
    };
  }

  // Default standard
  return {
    batchSize: folderName === 'Trash' ? 10 : 25,
    parallelBatches: folderName === 'Trash' ? 2 : 3,
    timeout: folderName === 'Trash' ? 60000 : 30000,
    includeAttachments: false,
    maxRetries: 3,
    confidence: 'medium',
    notes: ['ℹ️ Configurazione default (nessun test disponibile per questa folder)']
  };
}

/**
 * Genera raccomandazioni basate sull'analisi completa
 */
function generateRecommendations(
  results: any[],
  imapHealth?: any,
  metadataInsight?: any,
  folderConfigs?: any
): string[] {
  const recommendations: string[] = [];

  // IMAP Health
  if (imapHealth) {
    if (imapHealth.status === 'critical') {
      recommendations.push('🚨 CRITICO: IMAP server inaccessibile o molto lento. Verifica credenziali e connettività.');
    } else if (imapHealth.status === 'degraded') {
      recommendations.push('⚠️ IMAP server rallentato. Usa batch size ridotti (10-15) e timeout maggiori (60s).');
    } else {
      recommendations.push('✅ IMAP server in salute. Puoi usare configurazioni aggressive per massimizzare throughput.');
    }

    if (imapHealth.avgRetrievalTime > 5000) {
      recommendations.push(`⏱️ Tempo recupero email elevato (${(imapHealth.avgRetrievalTime / 1000).toFixed(1)}s). Considera di ridurre batch size a 10-15.`);
    }
  }

  // Metadata vs Full Body
  if (metadataInsight) {
    if (metadataInsight.recommendation === 'metadata-only') {
      recommendations.push(`⚡ USA METADATA ONLY per listing: ${metadataInsight.speedupFactor.toFixed(1)}x più veloce. Scarica body solo on-demand quando utente apre email.`);
    }
  }

  // Parallel Download
  const parallelTest = results.find(r => r.config.testType === 'parallel');
  if (parallelTest) {
    if (parallelTest.metrics.successRate >= 95 && parallelTest.metrics.throughput > 20) {
      recommendations.push(`✅ Parallel download funzionante (${parallelTest.metrics.throughput.toFixed(1)} email/s). Usa ${parallelTest.config.parallelBatches} batch paralleli.`);
    } else if (parallelTest.metrics.successRate < 90) {
      recommendations.push(`⚠️ Parallel download instabile (${parallelTest.metrics.successRate}% success rate). Riduci parallelBatches a 2 o disabilita.`);
    }
  }

  // Batch Size
  if (folderConfigs?.INBOX.confidence === 'high') {
    recommendations.push(`📏 Batch size ottimale per INBOX: ${folderConfigs.INBOX.batchSize} (basato su ${results.filter((r: any) => r.config.folder === 'INBOX').length} test)`);
  }

  // Overall Performance
  const avgSuccess = results.reduce((sum: number, r: any) => sum + r.metrics.successRate, 0) / results.length;
  if (avgSuccess < 90) {
    recommendations.push(`⚠️ Success rate globale basso (${avgSuccess.toFixed(1)}%). Verifica logs edge function per errori ricorrenti.`);
  } else if (avgSuccess >= 98) {
    recommendations.push(`✅ Success rate eccellente (${avgSuccess.toFixed(1)}%). Configurazioni stabili e affidabili.`);
  }

  return recommendations;
}

// ==================== EXPORT UTILITIES ====================

/**
 * Esporta configurazione ottimale in formato TypeScript pronto per copy/paste
 */
export function exportOptimalConfig(analysis: PerformanceAnalysis): string {
  return `/**
 * 📊 Optimal Email Sync Configuration
 * Generated from Performance Test Suite
 * Date: ${analysis.testDate}
 * Tests Run: ${analysis.totalTestsRun}
 * Overall Success Rate: ${analysis.overallSuccessRate}%
 */

export const OPTIMAL_FOLDER_CONFIGS = {
  INBOX: {
    batchSize: ${analysis.folderConfigs.INBOX.batchSize},
    parallelBatches: ${analysis.folderConfigs.INBOX.parallelBatches},
    timeout: ${analysis.folderConfigs.INBOX.timeout},
    includeAttachments: ${analysis.folderConfigs.INBOX.includeAttachments},
    maxRetries: ${analysis.folderConfigs.INBOX.maxRetries},
    // ${analysis.folderConfigs.INBOX.notes.join(' | ')}
  },
  
  Sent: {
    batchSize: ${analysis.folderConfigs.Sent.batchSize},
    parallelBatches: ${analysis.folderConfigs.Sent.parallelBatches},
    timeout: ${analysis.folderConfigs.Sent.timeout},
    includeAttachments: ${analysis.folderConfigs.Sent.includeAttachments},
    maxRetries: ${analysis.folderConfigs.Sent.maxRetries},
  },
  
  Trash: {
    batchSize: ${analysis.folderConfigs.Trash.batchSize},
    parallelBatches: ${analysis.folderConfigs.Trash.parallelBatches},
    timeout: ${analysis.folderConfigs.Trash.timeout},
    includeAttachments: ${analysis.folderConfigs.Trash.includeAttachments},
    maxRetries: ${analysis.folderConfigs.Trash.maxRetries},
  },
  
  Archive: {
    batchSize: ${analysis.folderConfigs.Archive.batchSize},
    parallelBatches: ${analysis.folderConfigs.Archive.parallelBatches},
    timeout: ${analysis.folderConfigs.Archive.timeout},
    includeAttachments: ${analysis.folderConfigs.Archive.includeAttachments},
    maxRetries: ${analysis.folderConfigs.Archive.maxRetries},
  },
  
  default: {
    batchSize: ${analysis.folderConfigs.default.batchSize},
    parallelBatches: ${analysis.folderConfigs.default.parallelBatches},
    timeout: ${analysis.folderConfigs.default.timeout},
    includeAttachments: ${analysis.folderConfigs.default.includeAttachments},
    maxRetries: ${analysis.folderConfigs.default.maxRetries},
  }
} as const;

/**
 * Ottieni configurazione ottimale per una folder
 */
export function getOptimalConfig(folderName: string) {
  return OPTIMAL_FOLDER_CONFIGS[folderName as keyof typeof OPTIMAL_FOLDER_CONFIGS] 
    || OPTIMAL_FOLDER_CONFIGS.default;
}

// ==================== RECOMMENDATIONS ====================
${analysis.recommendations.map(r => `// ${r}`).join('\n')}
`;
}

/**
 * Stampa report dettagliato nella console
 */
export function printPerformanceReport(analysis: PerformanceAnalysis) {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 PERFORMANCE ANALYSIS REPORT');
  console.log('═'.repeat(80));
  console.log(`📅 Test Date: ${analysis.testDate}`);
  console.log(`🧪 Tests Run: ${analysis.totalTestsRun}`);
  console.log(`✅ Success Rate: ${analysis.overallSuccessRate}%`);
  console.log('');
  
  if (analysis.imapHealth) {
    console.log('🔍 IMAP HEALTH CHECK');
    console.log('─'.repeat(80));
    console.log(`Status: ${analysis.imapHealth.status.toUpperCase()}`);
    console.log(`Avg Connection Time: ${analysis.imapHealth.avgConnectionTime}ms`);
    console.log(`Avg Retrieval Time: ${analysis.imapHealth.avgRetrievalTime}ms`);
    if (analysis.imapHealth.issues.length > 0) {
      console.log('Issues:', analysis.imapHealth.issues);
    }
    console.log('');
  }
  
  if (analysis.metadataInsight) {
    console.log('⚡ METADATA VS FULL BODY');
    console.log('─'.repeat(80));
    console.log(`Speedup Factor: ${analysis.metadataInsight.speedupFactor.toFixed(2)}x`);
    console.log(`Recommendation: ${analysis.metadataInsight.recommendation}`);
    console.log(`Notes: ${analysis.metadataInsight.notes}`);
    console.log('');
  }
  
  console.log('📁 OPTIMAL FOLDER CONFIGURATIONS');
  console.log('─'.repeat(80));
  Object.entries(analysis.folderConfigs).forEach(([folder, config]) => {
    console.log(`\n${folder}:`);
    console.log(`  Batch Size: ${config.batchSize}`);
    console.log(`  Parallel Batches: ${config.parallelBatches}`);
    console.log(`  Timeout: ${config.timeout}ms`);
    console.log(`  Confidence: ${config.confidence}`);
    if (config.notes.length > 0) {
      console.log(`  Notes: ${config.notes.join(', ')}`);
    }
  });
  
  console.log('\n');
  console.log('💡 RECOMMENDATIONS');
  console.log('─'.repeat(80));
  analysis.recommendations.forEach((rec, idx) => {
    console.log(`${idx + 1}. ${rec}`);
  });
  
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('');
}

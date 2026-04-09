/**
 * Performance Test Suite - Analisi ottimizzazione importazione email
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Play, Download, TrendingUp, Clock, Activity, AlertCircle, FileCode } from 'lucide-react';
import { StatCard } from '@/components/design-system/cards/StatCard';
import { Link } from 'react-router-dom';
import { withTMWERetry, categorizeError, type ErrorCategory } from '@/lib/api-retry-advanced';
import { logPerformanceMetrics } from '@/lib/performance-metrics-logger';
import { FolderSelector } from '@/components/email/FolderSelector';
import { getUnifiedFolderCounts, getTestableFolders, type UnifiedFolderCount } from '@/lib/email-count-service';

// Simple rate-limited download wrapper (replaces deleted ParallelDownloadController)
const downloadController = {
  async download<T>(fn: () => Promise<T>): Promise<T> { return fn(); }
};

interface TestConfig {
  folder: string;
  testType: 'single' | 'batch' | 'batch-compare' | 'light-vs-full' | 'parallel' | 'imap-health' | 'all-in-one';
  batchSize?: number;
  repetitions?: number;
  batchSizes?: number[]; // Per batch-compare
  parallelBatches?: number; // Per parallel test
}

interface TestError {
  type: ErrorCategory;
  message: string;
  timestamp: string;
  testType: string;
  folder: string;
  handler: string;
}

interface IMAPHealthStatus {
  accountConnection: boolean;
  accountConnectionTime: number;
  folderAccess: boolean;
  folderAccessTime: number;
  emailRetrieval: boolean;
  emailRetrievalTime: number;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  issues: string[];
}

interface TestMetrics {
  totalTime: number;
  avgTimePerEmail: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  apiCalls: number;
  errors: number;
  successRate: number;
}

interface TestResult {
  config: TestConfig;
  metrics: TestMetrics;
  timestamp: string;
  recommendations: string[];
  errorLog?: TestError[];
  healthCheck?: IMAPHealthStatus;
  comparisonData?: Array<{ batchSize: number; metrics: TestMetrics }>; // Per batch-compare
  metadataComparison?: { withBody: TestMetrics; metadataOnly: TestMetrics }; // Per metadata test
}

// ============= TEST SUITE CONFIGURATIONS =============
interface TestSuiteConfig {
  name: string;
  description: string;
  tests: TestConfig[];
  estimatedDuration: number; // seconds
}

// ✅ GENERATE DYNAMIC COMPLETE SUITE basata su cartelle reali
const generateCompleteSuite = async (userEmail: string): Promise<TestSuiteConfig> => {
  const { getTestableFolders } = await import('@/lib/email-count-service');
  const testable = await getTestableFolders(userEmail, 25);
  
  if (testable.length === 0) {
    throw new Error('Nessuna cartella con abbastanza email per test completo (minimo 25 email richieste)');
  }
  
  // Seleziona top 3 cartelle per dimensione
  const topFolders = testable.slice(0, 3);
  
  console.log('📊 [SUITE] Dynamic suite will test:', topFolders.map(f => f.folderName));
  
  return {
    name: "Complete Performance Analysis (Dynamic)",
    description: `Testa ${topFolders.length} cartelle reali con dati sufficienti`,
    estimatedDuration: topFolders.length * 60,
    tests: topFolders.flatMap(folder => [
      { folder: folder.folderName, testType: 'imap-health' as const },
      { folder: folder.folderName, testType: 'batch' as const, batchSize: 25 },
      { folder: folder.folderName, testType: 'parallel' as const, batchSize: 25, parallelBatches: 3 }
    ])
  };
};

// Suite completa STATICA (fallback)
const COMPLETE_TEST_SUITE: TestSuiteConfig = {
  name: "Complete Performance Analysis",
  description: "Esegue tutti i test in sequenza per analisi completa sistema",
  estimatedDuration: 180, // ~3 minuti
  tests: [
    // 1. IMAP Health Check (critico - primo test)
    { folder: 'INBOX', testType: 'imap-health' },
    // 2. Batch Standard (baseline performance)
    { folder: 'INBOX', testType: 'batch', batchSize: 25 },
    // 3. Batch Compare (trova batch size ottimale)
    { folder: 'INBOX', testType: 'batch-compare', batchSizes: [5, 10, 25, 50] },
    // 4. Light vs Full (confronto metadata/body)
    { folder: 'INBOX', testType: 'light-vs-full', batchSize: 25 },
    // 5. Parallel Download (massima velocità)
    { folder: 'INBOX', testType: 'parallel', batchSize: 25, parallelBatches: 3 },
    // 6. Test su Trash (folder problematica)
    { folder: 'Trash', testType: 'batch', batchSize: 10 },
    // 7. Test su Sent (folder standard)
    { folder: 'Sent', testType: 'batch', batchSize: 25 }
  ]
};

const QUICK_SUITE: TestSuiteConfig = {
  name: "Quick Check",
  description: "Test rapido per verifica base (2 min)",
  estimatedDuration: 120,
  tests: [
    { folder: 'INBOX', testType: 'imap-health' },
    { folder: 'INBOX', testType: 'batch', batchSize: 25 },
    { folder: 'INBOX', testType: 'parallel', batchSize: 25, parallelBatches: 3 }
  ]
};

const STRESS_SUITE: TestSuiteConfig = {
  name: "Stress Test",
  description: "Test di carico su tutte le folder (5 min)",
  estimatedDuration: 300,
  tests: [
    { folder: 'INBOX', testType: 'parallel', batchSize: 50, parallelBatches: 5 },
    { folder: 'Sent', testType: 'parallel', batchSize: 50, parallelBatches: 5 },
    { folder: 'Trash', testType: 'batch', batchSize: 25 },
    { folder: 'Archive', testType: 'batch', batchSize: 35 }
  ]
};

const SUITE_MAP: Record<string, TestSuiteConfig> = {
  complete: COMPLETE_TEST_SUITE,
  quick: QUICK_SUITE,
  stress: STRESS_SUITE
};

export function PerformanceTestSuite() {
  const [config, setConfig] = useState<TestConfig>({
    folder: 'INBOX',
    testType: 'single',
    batchSize: 25,
    repetitions: 5,
    batchSizes: [5, 10, 25, 50],
    parallelBatches: 3
  });

  const [folders, setFolders] = useState<string[]>(['INBOX', 'Sent', 'Drafts', 'Archive', 'Trash']);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [unifiedFolders, setUnifiedFolders] = useState<UnifiedFolderCount[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState({
    emailsProcessed: 0,
    currentSpeed: 0,
    elapsed: 0,
    apiCalls: 0
  });
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ NUOVO: Suite Runner State
  const [selectedSuite, setSelectedSuite] = useState<string>('custom');
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [suiteResults, setSuiteResults] = useState<TestResult[]>([]);
  const [suiteProgress, setSuiteProgress] = useState(0);

  // ✅ Carica risultati suite da localStorage all'avvio
  useEffect(() => {
    const savedReport = localStorage.getItem('last-suite-report');
    if (savedReport) {
      try {
        const { results } = JSON.parse(savedReport);
        if (results && Array.isArray(results) && results.length > 0) {
          console.log('📂 [SUITE] Loaded', results.length, 'test results from localStorage');
          setSuiteResults(results);
        }
      } catch (err) {
        console.error('❌ [SUITE] Failed to load results from localStorage:', err);
      }
    }
  }, []); // Esegui solo al mount

  // ✅ Load folders with counts using unified service
  useEffect(() => {
    const loadFolders = async () => {
      setLoadingFolders(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('tmwe_email')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.tmwe_email) {
            const unified = await getUnifiedFolderCounts(profile.tmwe_email);
            setUnifiedFolders(unified);
            setFolders(unified.map(f => f.folderName));
            console.log('✅ [PERF] Loaded', unified.length, 'folders with counts');
          }
        }
      } catch (err) {
        console.error('Failed to load folders:', err);
        // Fallback to basic folders
        setFolders(['INBOX', 'Sent', 'Drafts', 'Archive', 'Trash']);
      } finally {
        setLoadingFolders(false);
      }
    };

    loadFolders();
  }, []);

  const debugApiResponse = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/email_message',
          data: {
            handler: 'get_messages',
            folder: config.folder,
            limit: 5,
            offset: 0
          }
        }
      });
      
      console.log('🔍 RAW API RESPONSE:', JSON.stringify(data, null, 2));
      console.log('🔍 ERROR (if any):', error);
      alert('✅ Risposta API loggata nella console. Apri DevTools per vedere i dettagli.');
    } catch (err) {
      console.error('❌ Debug failed:', err);
      alert('❌ Errore durante il debug. Vedi console per dettagli.');
    }
  };

  // ✅ NUOVO: Funzione core che esegue un test e RITORNA il risultato (senza settare stati)
  const executeTest = async (testConfig: TestConfig): Promise<TestResult> => {
    setProgress(0);
    setLiveMetrics({ emailsProcessed: 0, currentSpeed: 0, elapsed: 0, apiCalls: 0 });

    // Verifica autenticazione
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Non autenticato. Effettua login prima di eseguire i test.');
    }

    // STEP 1: Recupera UIDs reali dalla cartella
    console.log('🔍 [PERF TEST] Fetching real UIDs from folder...');
    const { data: uidData, error: uidError } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint: '/email_message',
        data: {
          handler: 'get_messages',
          folder: testConfig.folder,
          limit: 100,
          offset: 0
        }
      }
    });

    if (uidError) {
      throw new Error(`API Error: ${uidError?.message || uidError?.toString() || 'Unknown error'}`);
    }

    // L'API può ritornare direttamente i dati o wrappati in un oggetto success
    const responseData = uidData?.success ? uidData : { ...uidData, success: true };

    // 🔍 Parsing robusto - cerca messages/emails in vari punti della risposta
    let messagesArray = responseData.messages 
      || responseData.emails 
      || responseData.data?.messages 
      || responseData.data?.emails
      || [];

    console.log('🔍 [PERF TEST] Parsed response:', {
      hasMessages: !!responseData.messages,
      hasEmails: !!responseData.emails,
      hasDataMessages: !!responseData.data?.messages,
      hasDataEmails: !!responseData.data?.emails,
      foundCount: Array.isArray(messagesArray) ? messagesArray.length : 0,
      sampleItem: messagesArray[0]
    });

    if (!Array.isArray(messagesArray) || messagesArray.length === 0) {
      console.error('❌ [PERF TEST] Unexpected API response structure:', responseData);
      throw new Error(`Nessuna email trovata nella cartella "${testConfig.folder}". Prova con "INBOX" o verifica che la cartella contenga email.`);
    }

    // Estrai UIDs in modo robusto
    const realUIDs = messagesArray
      .map((m: any) => m.uid || m.id || m.message_id)
      .filter(Boolean);

    console.log(`✅ [PERF TEST] Found ${realUIDs.length} UIDs`);

    if (realUIDs.length === 0) {
      throw new Error(
        `Nessun UID valido trovato. ` +
        `Email trovate: ${messagesArray.length}, ` +
        `ma nessuna ha un campo uid/id/message_id valido.`
      );
    }

    const startTime = performance.now();
    const times: number[] = [];
    let totalApiCalls = 1; // Già fatta una chiamata per gli UIDs
    let errorCount = 0;
    const errorLog: TestError[] = [];

    if (testConfig.testType === 'single') {
      // Test: Single Email Performance (con UIDs reali)
      console.log('🧪 [PERF TEST] Starting Single Email Test');
      
      for (let i = 0; i < (testConfig.repetitions || 5); i++) {
        const iterStart = performance.now();
        const testUID = realUIDs[i % realUIDs.length];
        
        try {
          const { data, error: apiError } = await supabase.functions.invoke('tmwe-api-proxy', {
            body: {
              endpoint: '/email_message',
              data: {
                handler: 'get_message',
                uid: testUID,
                folder: testConfig.folder
              }
            }
          });

          totalApiCalls++;
          const iterTime = performance.now() - iterStart;
          times.push(iterTime);

          if (apiError) {
            errorCount++;
          }

          setLiveMetrics({
            emailsProcessed: i + 1,
            currentSpeed: 1000 / iterTime,
            elapsed: (performance.now() - startTime) / 1000,
            apiCalls: totalApiCalls
          });

          setProgress(((i + 1) / (testConfig.repetitions || 5)) * 100);
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
          errorCount++;
          console.error('❌ [PERF TEST] Request failed:', err);
        }
      }

    } else if (testConfig.testType === 'batch') {
      console.log('🧪 [PERF TEST] Starting Batch Test');
      const batchStart = performance.now();
      
      try {
        // ✅ Wrappa con ParallelDownloadController per rate limiting
        const { data, error: apiError } = await downloadController.download(() =>
          withTMWERetry(
            () => supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/email_message',
                data: {
                  handler: 'get_messages',
                  folder: testConfig.folder,
                  limit: testConfig.batchSize || 25,
                  offset: 0,
                  include_attachments: false
                },
                requestTimeout: 30000
              }
            }),
            'get_messages',
            (attempt) => {
              setLiveMetrics(prev => ({
                ...prev,
                apiCalls: prev.apiCalls + 1
              }));
            }
          )
        );

        totalApiCalls++;
        const batchTime = performance.now() - batchStart;
        times.push(batchTime);

        const batchMessages = data?.messages || data?.emails || data?.data?.messages || data?.data?.emails || [];
        const actualEmailCount = Array.isArray(batchMessages) ? batchMessages.length : 0;
        const batchSuccess = !apiError && actualEmailCount > 0;
        
        if (apiError || actualEmailCount === 0) {
          errorCount++;
          errorLog.push({
            type: categorizeError(apiError),
            message: apiError?.message || 'No emails retrieved',
            timestamp: new Date().toISOString(),
            testType: testConfig.testType,
            folder: testConfig.folder,
            handler: 'get_messages'
          });
        }

        setLiveMetrics({
          emailsProcessed: actualEmailCount,
          currentSpeed: actualEmailCount > 0 ? (actualEmailCount / batchTime) * 1000 : 0,
          elapsed: batchTime / 1000,
          apiCalls: totalApiCalls
        });

        setProgress(100);

      } catch (err) {
        errorCount++;
        console.error('❌ [PERF TEST] Batch request failed:', err);
        errorLog.push({
          type: categorizeError(err),
          message: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
          testType: testConfig.testType,
          folder: testConfig.folder,
          handler: 'get_messages'
        });
      }

    } else if (testConfig.testType === 'batch-compare') {
      console.log('🧪 [PERF TEST] Starting Batch Comparison Test');
      const comparisonData: Array<{ batchSize: number; metrics: TestMetrics }> = [];
      const batchSizes = testConfig.batchSizes || [5, 10, 25, 50];

      for (let i = 0; i < batchSizes.length; i++) {
        const batchSize = batchSizes[i];
        const batchStart = performance.now();
        let batchErrors = 0;

        try {
          const { data, error: apiError } = await supabase.functions.invoke('tmwe-api-proxy', {
            body: {
              endpoint: '/email_message',
              data: {
                handler: 'get_messages',
                folder: testConfig.folder,
                limit: batchSize,
                offset: 0
              }
            }
          });

          totalApiCalls++;
          const batchTime = performance.now() - batchStart;
          times.push(batchTime);

          if (apiError) {
            batchErrors++;
          }

          const compareMessages = data?.messages || data?.emails || data?.data?.messages || data?.data?.emails || [];
          const actualEmailCount = Array.isArray(compareMessages) ? compareMessages.length : 0;
          const batchSuccess = !apiError && actualEmailCount > 0;
          
          if (!batchSuccess) {
            batchErrors++;
          }

          const throughput = actualEmailCount > 0 ? (actualEmailCount / batchTime) * 1000 : 0;

          comparisonData.push({
            batchSize,
            metrics: {
              totalTime: Math.round(batchTime),
              avgTimePerEmail: actualEmailCount > 0 ? Math.round(batchTime / actualEmailCount) : 0,
              minTime: Math.round(batchTime),
              maxTime: Math.round(batchTime),
              throughput: Math.round(throughput * 100) / 100,
              apiCalls: 1,
              errors: batchErrors,
              successRate: batchSuccess ? 100 : 0
            }
          });

          setLiveMetrics({
            emailsProcessed: actualEmailCount * (i + 1),
            currentSpeed: throughput,
            elapsed: (performance.now() - startTime) / 1000,
            apiCalls: totalApiCalls
          });

          setProgress(((i + 1) / batchSizes.length) * 100);
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          errorCount++;
          console.error(`❌ [PERF TEST] Batch ${batchSize} failed:`, err);
        }
      }

      const totalTime = performance.now() - startTime;
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const bestBatch = comparisonData.reduce((best, curr) => 
        curr.metrics.throughput > best.metrics.throughput ? curr : best
      );

      return {
        config: testConfig,
        metrics: {
          totalTime: Math.round(totalTime),
          avgTimePerEmail: Math.round(avgTime / (testConfig.batchSize || 25)),
          minTime: Math.min(...times),
          maxTime: Math.max(...times),
          throughput: bestBatch.metrics.throughput,
          apiCalls: totalApiCalls,
          errors: errorCount,
          successRate: ((batchSizes.length - errorCount) / batchSizes.length) * 100
        },
        timestamp: new Date().toISOString(),
        recommendations: [
          `🏆 Batch size ottimale: ${bestBatch.batchSize} (${bestBatch.metrics.throughput.toFixed(2)} email/sec)`,
          ...generateRecommendations(bestBatch.metrics, { ...testConfig, batchSize: bestBatch.batchSize })
        ],
        comparisonData
      };

    } else if (testConfig.testType === 'light-vs-full') {
      console.log('🧪 [PERF TEST] Starting Light vs Full Body Comparison Test');

      const lightStart = performance.now();
      const { data: lightData, error: lightError } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/email_message',
          data: {
            handler: 'get_messages',
            folder: testConfig.folder,
            limit: testConfig.batchSize || 25,
            offset: 0,
            include_attachments: false
          }
        }
      });
      const lightTime = performance.now() - lightStart;
      totalApiCalls++;

      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 500));

      const fullStart = performance.now();
      const { data: fullData, error: fullError } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/email_message',
          data: {
            handler: 'get_messages',
            folder: testConfig.folder,
            limit: testConfig.batchSize || 25,
            offset: 0,
            include_attachments: true
          }
        }
      });
      const fullTime = performance.now() - fullStart;
      totalApiCalls++;

      setProgress(100);

      const lightMessages = lightData?.messages || [];
      const fullMessages = fullData?.messages || [];
      const lightSuccess = !lightError && lightMessages.length > 0;
      const fullSuccess = !fullError && fullMessages.length > 0;
      const actualEmailCount = Math.max(lightMessages.length, fullMessages.length) || (testConfig.batchSize || 25);

      const speedup = fullTime / lightTime;

      const lightMetrics: TestMetrics = {
        totalTime: Math.round(lightTime),
        avgTimePerEmail: Math.round(lightTime / actualEmailCount),
        minTime: Math.round(lightTime),
        maxTime: Math.round(lightTime),
        throughput: Math.round((actualEmailCount / lightTime) * 1000 * 100) / 100,
        apiCalls: 1,
        errors: lightSuccess ? 0 : 1,
        successRate: lightSuccess ? 100 : 0
      };

      const fullMetrics: TestMetrics = {
        totalTime: Math.round(fullTime),
        avgTimePerEmail: Math.round(fullTime / actualEmailCount),
        minTime: Math.round(fullTime),
        maxTime: Math.round(fullTime),
        throughput: Math.round((actualEmailCount / fullTime) * 1000 * 100) / 100,
        apiCalls: 1,
        errors: fullSuccess ? 0 : 1,
        successRate: fullSuccess ? 100 : 0
      };

      return {
        config: testConfig,
        metrics: lightMetrics,
        timestamp: new Date().toISOString(),
        recommendations: [
          `🚀 Speedup: ${speedup.toFixed(2)}x più veloce senza attachments`,
          `💡 Usa include_attachments=false per liste email (più leggero)`,
          `📧 Usa include_attachments=true solo per visualizzazione dettaglio`,
          speedup > 2 ? '✅ Ottimo guadagno performance con modalità light' : '⚠️ Speedup limitato, verifica configurazione'
        ],
        metadataComparison: {
          withBody: fullMetrics,
          metadataOnly: lightMetrics
        }
      };

    } else if (testConfig.testType === 'imap-health') {
      console.log('🏥 [PERF TEST] Starting IMAP Health Check');
      
      const healthCheck: IMAPHealthStatus = {
        accountConnection: false,
        accountConnectionTime: 0,
        folderAccess: false,
        folderAccessTime: 0,
        emailRetrieval: false,
        emailRetrievalTime: 0,
        overallHealth: 'critical',
        issues: []
      };

      // Test 1: Account Connection
      const connStart = performance.now();
      try {
        const { data: userData } = await supabase.auth.getUser();
        healthCheck.accountConnection = !!userData?.user;
        healthCheck.accountConnectionTime = Math.round(performance.now() - connStart);
        if (!healthCheck.accountConnection) {
          healthCheck.issues.push('❌ Account not authenticated');
        }
      } catch (err) {
        healthCheck.accountConnectionTime = Math.round(performance.now() - connStart);
        healthCheck.issues.push(`❌ Account connection failed: ${err}`);
      }

      setProgress(33);

      // Test 2: Folder Access
      const folderStart = performance.now();
      try {
        const { data: folderData, error: folderError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_messages',
              folder: testConfig.folder,
              limit: 1,
              offset: 0,
              include_attachments: false
            }
          }
        });
        totalApiCalls++;
        healthCheck.folderAccess = !folderError && !!folderData;
        healthCheck.folderAccessTime = Math.round(performance.now() - folderStart);
        if (!healthCheck.folderAccess) {
          healthCheck.issues.push(`❌ Cannot access folder "${testConfig.folder}"`);
        }
      } catch (err) {
        healthCheck.folderAccessTime = Math.round(performance.now() - folderStart);
        healthCheck.issues.push(`❌ Folder access failed: ${err}`);
      }

      setProgress(66);

      // Test 3: Email Retrieval
      const emailStart = performance.now();
      try {
        const testUID = realUIDs[0];
        if (!testUID) {
          throw new Error('No UIDs available for testing');
        }
        const { data: emailData, error: emailError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_message',
              uid: testUID,
              folder: testConfig.folder
            }
          }
        });
        totalApiCalls++;
        healthCheck.emailRetrieval = !emailError && !!emailData;
        healthCheck.emailRetrievalTime = Math.round(performance.now() - emailStart);
        if (!healthCheck.emailRetrieval) {
          healthCheck.issues.push('❌ Cannot retrieve email message');
        }
      } catch (err) {
        healthCheck.emailRetrievalTime = Math.round(performance.now() - emailStart);
        healthCheck.issues.push(`❌ Email retrieval failed: ${err}`);
      }

      setProgress(100);

      // Overall health determination
      const totalIssues = healthCheck.issues.length;
      if (totalIssues === 0) {
        healthCheck.overallHealth = 'healthy';
      } else if (totalIssues <= 1) {
        healthCheck.overallHealth = 'degraded';
      } else {
        healthCheck.overallHealth = 'critical';
      }

      const totalTime = performance.now() - startTime;

      return {
        config: testConfig,
        metrics: {
          totalTime: Math.round(totalTime),
          avgTimePerEmail: 0,
          minTime: 0,
          maxTime: 0,
          throughput: 0,
          apiCalls: totalApiCalls,
          errors: healthCheck.issues.length,
          successRate: ((3 - healthCheck.issues.length) / 3) * 100
        },
        timestamp: new Date().toISOString(),
        recommendations: [
          healthCheck.overallHealth === 'healthy' ? '✅ IMAP connection is healthy' : `⚠️ IMAP health: ${healthCheck.overallHealth}`,
          ...healthCheck.issues
        ],
        healthCheck
      };

    } else if (testConfig.testType === 'all-in-one') {
      console.log('🎯 [ALL-IN-ONE] Starting comprehensive test suite');
      
      // Step 1: Ottieni user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.tmwe_email) {
        throw new Error('Email TMWE non configurata');
      }
      
      // Step 2: Ottieni folder testabili
      setProgress(10);
      const testableFolders = await getTestableFolders(profile.tmwe_email, 25);
      console.log(`📁 Found ${testableFolders.length} testable folders`);
      
      if (testableFolders.length === 0) {
        throw new Error('Nessuna folder testabile trovata. Sincronizza prima alcune email.');
      }
      
      // Step 3: Seleziona top 3 folder più popolate
      const selectedFolders = testableFolders
        .sort((a, b) => b.serverCount - a.serverCount)
        .slice(0, 3);
      
      console.log(`🎯 Testing folders: ${selectedFolders.map(f => f.folderName).join(', ')}`);
      
      const allResults: TestResult[] = [];
      const totalTests = selectedFolders.length * 3; // 3 test per folder
      let completedTests = 0;
      
      // Step 4: Esegui test per ogni folder
      for (const folder of selectedFolders) {
        console.log(`\n📂 Testing folder: ${folder.folderName}`);
        
        // Test 1: IMAP Health Check
        try {
          const healthResult = await executeTest({
            ...testConfig,
            testType: 'imap-health',
            folder: folder.folderName
          });
          allResults.push(healthResult);
          completedTests++;
          setProgress(10 + (completedTests / totalTests) * 80);
        } catch (err) {
          console.error(`❌ Health check failed for ${folder.folderName}:`, err);
        }
        
        // Test 2: Batch Standard (25 emails)
        try {
          const batchResult = await executeTest({
            ...testConfig,
            testType: 'batch',
            folder: folder.folderName,
            batchSize: 25
          });
          allResults.push(batchResult);
          completedTests++;
          setProgress(10 + (completedTests / totalTests) * 80);
        } catch (err) {
          console.error(`❌ Batch test failed for ${folder.folderName}:`, err);
        }
        
        // Test 3: Parallel Download (3 batches)
        try {
          const parallelResult = await executeTest({
            ...testConfig,
            testType: 'parallel',
            folder: folder.folderName,
            parallelBatches: 3,
            batchSize: 25
          });
          allResults.push(parallelResult);
          completedTests++;
          setProgress(10 + (completedTests / totalTests) * 80);
        } catch (err) {
          console.error(`❌ Parallel test failed for ${folder.folderName}:`, err);
        }
      }
      
      setProgress(100);
      
      // Step 5: Salva i risultati in suiteResults
      setSuiteResults(allResults);
      
      // Step 6: Calcola metriche aggregate
      const totalTime = allResults.reduce((sum, r) => sum + r.metrics.totalTime, 0);
      const totalErrors = allResults.reduce((sum, r) => sum + r.metrics.errors, 0);
      const avgSuccessRate = allResults.reduce((sum, r) => sum + r.metrics.successRate, 0) / allResults.length;
      
      console.log(`✅ [ALL-IN-ONE] Completed ${allResults.length} tests in ${totalTime}ms`);
      
      return {
        config: testConfig,
        metrics: {
          totalTime: Math.round(totalTime),
          avgTimePerEmail: 0,
          minTime: 0,
          maxTime: 0,
          throughput: 0,
          apiCalls: allResults.reduce((sum, r) => sum + r.metrics.apiCalls, 0),
          errors: totalErrors,
          successRate: Math.round(avgSuccessRate * 100) / 100
        },
        timestamp: new Date().toISOString(),
        recommendations: [
          `✅ Test completato su ${selectedFolders.length} cartelle`,
          `📊 ${allResults.length} test eseguiti con successo`,
          totalErrors === 0 ? '✅ Nessun errore rilevato' : `⚠️ ${totalErrors} errori totali`,
          avgSuccessRate > 90 ? '✅ Ottima affidabilità sistema' : '⚠️ Sistema necessita ottimizzazione'
        ]
      };
    }

    // Default test (single/batch fallback)
    const totalTime = performance.now() - startTime;

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const emailsProcessed = testConfig.testType === 'single' 
      ? (testConfig.repetitions || 5) 
      : (testConfig.batchSize || 25);
    const throughput = (emailsProcessed / totalTime) * 1000;
    const successRate = ((times.length - errorCount) / times.length) * 100;

    const metrics: TestMetrics = {
      totalTime: Math.round(totalTime),
      avgTimePerEmail: Math.round(avgTime / (testConfig.testType === 'single' ? 1 : (testConfig.batchSize || 25))),
      minTime: Math.round(minTime),
      maxTime: Math.round(maxTime),
      throughput: Math.round(throughput * 100) / 100,
      apiCalls: totalApiCalls,
      errors: errorCount,
      successRate: Math.round(successRate * 100) / 100
    };

    const recommendations = generateRecommendations(metrics, testConfig);

    return {
      config: testConfig,
      metrics,
      timestamp: new Date().toISOString(),
      recommendations,
      errorLog
    };
  };

  // ✅ MODIFICATO: runPerformanceTest ora chiama executeTest e setta solo result (non suiteResults)
  const runPerformanceTest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const testResult = await executeTest(config);
      setResult(testResult); // ✅ Setta solo result per test singolo
      console.log('✅ [PERF TEST] Test completed:', testResult);
      
      // Log performance metrics
      await logPerformanceMetrics({
        test_type: config.testType,
        folder: config.folder,
        batch_size: config.batchSize || 25,
        throughput: testResult.metrics.throughput,
        success_rate: testResult.metrics.successRate,
        avg_time_per_email: testResult.metrics.avgTimePerEmail,
        errors: testResult.metrics.errors
      });

    } catch (err: any) {
      setError(`Test fallito: ${err.message}`);
      console.error('💥 [PERF TEST] Test error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const generateRecommendations = (metrics: TestMetrics, cfg: TestConfig): string[] => {
    const recs: string[] = [];

    // Success rate analysis
    if (metrics.successRate < 95) {
      recs.push(`⚠️ Tasso successo basso (${metrics.successRate}%) - Verificare connessione o limiti API`);
    } else if (metrics.successRate === 100) {
      recs.push('✅ Tasso successo perfetto (100%)');
    }

    // Throughput analysis
    if (cfg.testType === 'batch') {
      if (metrics.throughput > 15) {
        recs.push(`🚀 Ottimo throughput (${metrics.throughput} email/sec) - Configurazione efficiente`);
      } else if (metrics.throughput < 5) {
        recs.push(`⚠️ Throughput basso (${metrics.throughput} email/sec) - Considera batch size maggiore o parallelizzazione`);
      }

      if (cfg.batchSize && cfg.batchSize < 25) {
        recs.push('💡 Batch size < 25 - Prova aumentare a 25-50 per migliori performance');
      } else if (cfg.batchSize && cfg.batchSize > 50) {
        recs.push('⚠️ Batch size > 50 - Rischio timeout, considera ridurre a 25-50');
      }
    }

    // Time analysis
    if (metrics.avgTimePerEmail > 100) {
      recs.push('⚠️ Tempo medio alto (>100ms/email) - Verifica latenza di rete o usa API metadata');
    } else if (metrics.avgTimePerEmail < 50) {
      recs.push('✅ Tempo medio ottimo (<50ms/email)');
    }

    // API optimization
    if (cfg.testType === 'single' && (cfg.repetitions || 5) > 1) {
      recs.push('💡 Per download multipli, usa batch API invece di chiamate singole (5-10x più veloce)');
    }

    return recs;
  };

  const exportResults = () => {
    if (!result) return;
    
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perf-test-${result.timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============= SUITE RUNNER =============
  
  // ✅ MODIFICATO: runAllTests chiama executeTest DIRETTAMENTE (non runPerformanceTest)
  const runAllTests = async () => {
    const selectedSuiteConfig = SUITE_MAP[selectedSuite];
    if (!selectedSuiteConfig) {
      setError('Invalid suite selected');
      return;
    }

    console.log(`🚀 [TEST SUITE] Starting ${selectedSuiteConfig.name}...`);
    setIsRunningSuite(true);
    setCurrentTestIndex(0);
    setSuiteResults([]); // ✅ Pulisce i risultati precedenti
    setSuiteProgress(0);
    setError(null);
    
    const results: TestResult[] = [];
    const totalTests = selectedSuiteConfig.tests.length;
    
    try {
      for (let i = 0; i < selectedSuiteConfig.tests.length; i++) {
        const testConfig = selectedSuiteConfig.tests[i];
        setCurrentTestIndex(i);
        
        console.log(`\n📋 [TEST ${i + 1}/${totalTests}] Running: ${testConfig.testType} on ${testConfig.folder}`);
        
        // Aggiorna config per UI
        setConfig(testConfig);
        
        // Aspetta per UI update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ✅ CHIAMA executeTest DIRETTAMENTE (non runPerformanceTest)
        setIsRunning(true);
        const testResult = await executeTest(testConfig);
        setIsRunning(false);
        
        // ✅ Aggiungi risultato a suiteResults progressivamente
        if (testResult) {
          results.push(testResult);
          setSuiteResults([...results]); // ✅ Aggiorna array progressivamente
          console.log(`✅ [TEST ${i + 1}/${totalTests}] Completed: ${testConfig.testType}`);
        }
        
        setSuiteProgress(((i + 1) / totalTests) * 100);
        
        // Delay tra test
        if (i < totalTests - 1) {
          console.log('⏳ Waiting 2s before next test...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('✅ [TEST SUITE] All tests completed!');
      
      // Genera report
      if (results.length > 0) {
        generateSuiteReport(results);
      }
      
    } catch (err: any) {
      setError(`Test suite failed at test ${currentTestIndex + 1}: ${err.message}`);
      console.error('💥 [TEST SUITE] Error:', err);
    } finally {
      setIsRunningSuite(false);
      setIsRunning(false);
      setCurrentTestIndex(0);
    }
  };

  const generateSuiteReport = (results: TestResult[]) => {
    console.log('\n📊 [SUITE REPORT] Generating comparative analysis...');
    
    const report = {
      totalTests: results.length,
      successfulTests: results.filter(r => r.metrics.successRate === 100).length,
      overallSuccessRate: results.length > 0 
        ? (results.reduce((acc, r) => acc + r.metrics.successRate, 0) / results.length).toFixed(1)
        : '0',
      
      fastestTest: results.reduce((best, r) => 
        r.metrics.throughput > (best?.metrics.throughput || 0) ? r : best
      ),
      
      slowestTest: results.reduce((worst, r) => 
        r.metrics.throughput < (worst?.metrics.throughput || Infinity) ? r : worst
      ),
      
      optimalBatchSize: results
        .filter(r => r.config.testType === 'batch' || r.config.testType === 'batch-compare')
        .reduce((best, r) => {
          const batchSize = r.config.batchSize || 25;
          const score = r.metrics.throughput * (r.metrics.successRate / 100);
          return score > (best.score || 0) ? { batchSize, score } : best;
        }, {} as any).batchSize || 25,
      
      imapHealth: results.find(r => r.config.testType === 'imap-health')?.healthCheck
    };
    
    console.log('📊 [SUITE REPORT]', report);
    
    // Salva in localStorage
    localStorage.setItem('last-suite-report', JSON.stringify({
      timestamp: new Date().toISOString(),
      report,
      results
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <CardTitle>Performance Test Suite</CardTitle>
            <Badge variant="outline">BETA</Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/api-functions">
              <FileCode className="w-4 h-4 mr-2" />
              API Reference
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Configuration */}
        <div className="space-y-4">
          {/* ✅ NUOVO: Suite Selector */}
          <div className="space-y-2">
            <Label>Test Suite Mode</Label>
            <Select
              value={selectedSuite}
              onValueChange={setSelectedSuite}
              disabled={isRunning || isRunningSuite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">🎯 Complete Analysis (~3min)</SelectItem>
                <SelectItem value="quick">⚡ Quick Check (~2min)</SelectItem>
                <SelectItem value="stress">💪 Stress Test (~5min)</SelectItem>
                <SelectItem value="custom">✏️ Custom (manual config)</SelectItem>
              </SelectContent>
            </Select>
            {selectedSuite !== 'custom' && (
              <p className="text-xs text-muted-foreground">
                {SUITE_MAP[selectedSuite]?.description}
              </p>
            )}
          </div>

          {/* ✅ Pulsante per ripristinare suite salvata */}
          {suiteResults.length === 0 && (() => {
            const savedReport = localStorage.getItem('last-suite-report');
            if (savedReport) {
              const { timestamp, results } = JSON.parse(savedReport);
              return (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>💾 Previous Test Suite Available</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-xs">
                      Last run: {new Date(timestamp).toLocaleString('it-IT')} ({results.length} tests)
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSuiteResults(results);
                        console.log('📂 Restored', results.length, 'test results');
                      }}
                    >
                      Restore Results
                    </Button>
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          {selectedSuite === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Type</Label>
                <Select
                  value={config.testType}
                  onValueChange={(value: any) => setConfig({ ...config, testType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">📧 Single Email (with repeats)</SelectItem>
                    <SelectItem value="batch">📦 Batch Download</SelectItem>
                    <SelectItem value="batch-compare">📊 Batch Size Comparison</SelectItem>
                    <SelectItem value="light-vs-full">⚡ Light vs Full Body</SelectItem>
                    <SelectItem value="parallel">🔄 Parallel Download</SelectItem>
                    <SelectItem value="imap-health">🏥 IMAP Health Check</SelectItem>
                    <SelectItem value="all-in-one">🎯 All-in-One (Smart Test)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Folder</Label>
                {unifiedFolders.length > 0 ? (
                  <FolderSelector
                    folders={unifiedFolders}
                    selectedFolder={config.folder}
                    onSelect={(folder) => setConfig({ ...config, folder })}
                    showCounts={true}
                    showSyncStatus={true}
                  />
                ) : (
                  <Select
                    value={config.folder}
                    onValueChange={(value) => setConfig({ ...config, folder: value })}
                    disabled={loadingFolders}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingFolders ? "Loading folders..." : "Select folder"} />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder} value={folder}>
                          {folder}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {selectedSuite === 'custom' && (
            <>
              {config.testType === 'single' && (
                <div className="space-y-2">
                  <Label>Repetitions</Label>
                  <Input
                    type="number"
                    value={config.repetitions}
                    onChange={(e) => setConfig({ ...config, repetitions: parseInt(e.target.value) || 5 })}
                    min={1}
                    max={50}
                  />
                </div>
              )}

              {(config.testType === 'batch' || config.testType === 'light-vs-full') && (
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input
                    type="number"
                    value={config.batchSize}
                    onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 25 })}
                    min={5}
                    max={100}
                    step={5}
                  />
                </div>
              )}

              {config.testType === 'parallel' && (
                <>
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      value={config.batchSize}
                      onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 25 })}
                      min={5}
                      max={50}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parallel Batches</Label>
                    <Input
                      type="number"
                      value={config.parallelBatches}
                      onChange={(e) => setConfig({ ...config, parallelBatches: parseInt(e.target.value) || 3 })}
                      min={2}
                      max={10}
                    />
                  </div>
                </>
              )}

              {config.testType === 'batch-compare' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Verranno testati batch size: 5, 10, 25, 50
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* ✅ NUOVO: Bottoni Run */}
          <div className="flex gap-2">
            {selectedSuite !== 'custom' ? (
              <Button
                onClick={runAllTests}
                disabled={isRunning || isRunningSuite}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isRunningSuite ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-pulse" />
                    Running Suite ({currentTestIndex + 1}/{SUITE_MAP[selectedSuite]?.tests.length})...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    🚀 Run All Tests
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={runPerformanceTest}
                disabled={isRunning || isRunningSuite || !config.folder}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-pulse" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Single Test
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={debugApiResponse}
              disabled={isRunning || isRunningSuite}
              variant="outline"
            >
              🔍 Debug
            </Button>
          </div>
        </div>

        {/* ✅ NUOVO: Suite Progress */}
        {isRunningSuite && SUITE_MAP[selectedSuite] && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                🚀 Running {SUITE_MAP[selectedSuite].name}
                <Badge variant="outline">
                  {currentTestIndex + 1} / {SUITE_MAP[selectedSuite].tests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span className="font-semibold">{Math.round(suiteProgress)}%</span>
                </div>
                <Progress value={suiteProgress} className="h-3" />
              </div>
              
              <div className="text-sm">
                <div className="font-semibold mb-1">Current Test:</div>
                <div className="flex items-center gap-2">
                  <Badge>{SUITE_MAP[selectedSuite].tests[currentTestIndex]?.testType}</Badge>
                  <span className="text-muted-foreground">
                    on folder: <strong>{SUITE_MAP[selectedSuite].tests[currentTestIndex]?.folder}</strong>
                  </span>
                </div>
              </div>
              
              {suiteResults.length > 0 && (
                <div className="text-sm">
                  <div className="font-semibold mb-1">Completed Tests:</div>
                  <div className="flex flex-wrap gap-2">
                    {suiteResults.map((r, idx) => (
                      <Badge 
                        key={idx} 
                        variant={r.metrics.successRate === 100 ? "default" : "destructive"}
                      >
                        {r.config.testType} ({r.metrics.successRate}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Estimated time remaining: ~{Math.round((SUITE_MAP[selectedSuite].estimatedDuration / SUITE_MAP[selectedSuite].tests.length) * (SUITE_MAP[selectedSuite].tests.length - currentTestIndex - 1))}s
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Live Metrics */}
        {isRunning && (
          <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">📊 Live Metrics</h3>
              <Badge variant="outline">{Math.round(progress)}%</Badge>
            </div>
            <Progress value={progress} className="h-2" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-md bg-background/50">
                <p className="text-xs text-muted-foreground">Processed</p>
                <p className="text-lg font-bold">{liveMetrics.emailsProcessed}</p>
              </div>
              <div className="text-center p-2 rounded-md bg-background/50">
                <p className="text-xs text-muted-foreground">Speed</p>
                <p className="text-lg font-bold">
                  {liveMetrics.currentSpeed != null ? liveMetrics.currentSpeed.toFixed(1) : '0'}/s
                </p>
              </div>
              <div className="text-center p-2 rounded-md bg-background/50">
                <p className="text-xs text-muted-foreground">Elapsed</p>
                <p className="text-lg font-bold">
                  {liveMetrics.elapsed != null ? liveMetrics.elapsed.toFixed(1) : '0'}s
                </p>
              </div>
              <div className="text-center p-2 rounded-md bg-background/50">
                <p className="text-xs text-muted-foreground">API Calls</p>
                <p className="text-lg font-bold">{liveMetrics.apiCalls}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Test Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">📈 Test Results</h3>
              <Button onClick={exportResults} variant="outline" size="sm">
                <Download className="mr-2 h-3 w-3" />
                Export JSON
              </Button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={Clock}
                label="Total Time"
                value={`${result.metrics.totalTime}ms`}
              />
              <StatCard
                icon={TrendingUp}
                label="Throughput"
                value={`${result.metrics.throughput}/s`}
              />
              <StatCard
                icon={Activity}
                label="Avg per Email"
                value={`${result.metrics.avgTimePerEmail}ms`}
              />
              <StatCard
                icon={Zap}
                label="Success Rate"
                value={`${result.metrics.successRate}%`}
                trend={result.metrics.successRate === 100 ? 'up' : undefined}
              />
            </div>

            {/* Detailed Metrics Table */}
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Metric</th>
                    <th className="p-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2">Total Time</td>
                    <td className="p-2 text-right font-mono">{result.metrics.totalTime} ms</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Min Time</td>
                    <td className="p-2 text-right font-mono">{result.metrics.minTime} ms</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Max Time</td>
                    <td className="p-2 text-right font-mono">{result.metrics.maxTime} ms</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Avg Time per Email</td>
                    <td className="p-2 text-right font-mono">{result.metrics.avgTimePerEmail} ms</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Throughput</td>
                    <td className="p-2 text-right font-mono">{result.metrics.throughput} emails/sec</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">API Calls</td>
                    <td className="p-2 text-right font-mono">{result.metrics.apiCalls}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Errors</td>
                    <td className="p-2 text-right font-mono">{result.metrics.errors}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Success Rate</td>
                    <td className="p-2 text-right font-mono">{result.metrics.successRate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Comparison Data (Batch Compare) */}
            {result.comparisonData && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">📊 Batch Size Comparison</h4>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Batch Size</th>
                        <th className="p-2 text-right">Time</th>
                        <th className="p-2 text-right">Throughput</th>
                        <th className="p-2 text-right">Avg/Email</th>
                        <th className="p-2 text-right">Success</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.comparisonData.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 font-mono">{item.batchSize}</td>
                          <td className="p-2 text-right font-mono">{item.metrics.totalTime}ms</td>
                          <td className="p-2 text-right font-mono">{item.metrics.throughput}/s</td>
                          <td className="p-2 text-right font-mono">{item.metrics.avgTimePerEmail}ms</td>
                          <td className="p-2 text-right">
                            <Badge variant={item.metrics.successRate === 100 ? 'default' : 'destructive'}>
                              {item.metrics.successRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Metadata Comparison */}
            {result.metadataComparison && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">⚡ API Comparison: Full Body vs Metadata Only</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h5 className="text-xs text-muted-foreground mb-2">get_messages (with body)</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="font-mono">{result.metadataComparison.withBody.totalTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Throughput:</span>
                        <span className="font-mono">{result.metadataComparison.withBody.throughput}/s</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 border-primary">
                    <h5 className="text-xs text-muted-foreground mb-2">get_emails_metadata (metadata only)</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="font-mono">{result.metadataComparison.metadataOnly.totalTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Throughput:</span>
                        <span className="font-mono font-bold text-primary">{result.metadataComparison.metadataOnly.throughput}/s</span>
                      </div>
                    </div>
                    <Badge className="mt-2">
                      {result.metadataComparison?.metadataOnly?.totalTime > 0 
                        ? `${(result.metadataComparison.withBody.totalTime / result.metadataComparison.metadataOnly.totalTime).toFixed(1)}x Faster`
                        : 'N/A'
                      }
                    </Badge>
                  </Card>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>💡 Recommendations</AlertTitle>
                <AlertDescription>
                  <ul className="space-y-1 mt-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* ✅ NUOVO: Health Check Status */}
            {result.healthCheck && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🏥 IMAP Server Health Status
                    <Badge variant={
                      result.healthCheck.overallHealth === 'healthy' ? 'default' :
                      result.healthCheck.overallHealth === 'degraded' ? 'secondary' : 'destructive'
                    }>
                      {result.healthCheck.overallHealth.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`p-4 border rounded-lg ${result.healthCheck.accountConnection ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-red-50 dark:bg-red-950 border-red-200'}`}>
                        <div className="font-semibold">Account Connection</div>
                        <div className="text-sm text-muted-foreground">
                          {result.healthCheck?.accountConnectionTime != null 
                            ? `${result.healthCheck.accountConnectionTime.toFixed(0)}ms` 
                            : 'N/A'}
                        </div>
                        <div className="mt-2 text-lg">{result.healthCheck.accountConnection ? '✅' : '❌'}</div>
                      </div>
                      
                      <div className={`p-4 border rounded-lg ${result.healthCheck.folderAccess ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-red-50 dark:bg-red-950 border-red-200'}`}>
                        <div className="font-semibold">Folder Access</div>
                        <div className="text-sm text-muted-foreground">
                          {result.healthCheck?.folderAccessTime != null 
                            ? `${result.healthCheck.folderAccessTime.toFixed(0)}ms` 
                            : 'N/A'}
                        </div>
                        <div className="mt-2 text-lg">{result.healthCheck.folderAccess ? '✅' : '❌'}</div>
                      </div>
                      
                      <div className={`p-4 border rounded-lg ${result.healthCheck.emailRetrieval ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-red-50 dark:bg-red-950 border-red-200'}`}>
                        <div className="font-semibold">Email Retrieval</div>
                        <div className="text-sm text-muted-foreground">
                          {result.healthCheck?.emailRetrievalTime != null 
                            ? `${result.healthCheck.emailRetrievalTime.toFixed(0)}ms` 
                            : 'N/A'}
                        </div>
                        <div className="mt-2 text-lg">{result.healthCheck.emailRetrieval ? '✅' : '❌'}</div>
                      </div>
                    </div>
                    
                    {result.healthCheck.issues.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Issues Detected:</h4>
                        {result.healthCheck.issues.map((issue, idx) => (
                          <Alert key={idx} variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{issue}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ✅ NUOVO: Error Analysis */}
            {result.errorLog && result.errorLog.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔍 Error Analysis
                    <Badge variant="destructive">{result.errorLog.length} errors</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(
                        result.errorLog.reduce((acc, err) => {
                          acc[err.type] = (acc[err.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center p-3 border rounded-lg">
                          <span className="capitalize font-semibold">{type} Errors:</span>
                          <Badge variant={count > 3 ? 'destructive' : 'secondary'}>
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Latest Errors (last 5):</h4>
                      <div className="space-y-2">
                        {result.errorLog.slice(-5).reverse().map((err, idx) => (
                          <Alert key={idx} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              <div className="font-mono">
                                <div><strong>[{err.type.toUpperCase()}]</strong> {err.handler}</div>
                                <div className="text-muted-foreground">{err.message}</div>
                                <div className="text-muted-foreground">Folder: {err.folder} | {new Date(err.timestamp).toLocaleTimeString()}</div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ✅ NUOVO: Suite Results Table - SEMPRE VISIBILE quando ci sono risultati */}
        {suiteResults.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    📊 Suite Results Comparison
                    <Badge variant="outline">{suiteResults.length} tests</Badge>
                    {isRunningSuite && (
                      <Badge variant="secondary" className="animate-pulse">
                        Running... {currentTestIndex + 1}/{SUITE_MAP[selectedSuite]?.tests.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    {/* ✅ Mostra timestamp ultimo test */}
                    {(() => {
                      const savedReport = localStorage.getItem('last-suite-report');
                      if (savedReport) {
                        const { timestamp } = JSON.parse(savedReport);
                        return (
                          <Badge variant="secondary" className="text-xs">
                            Last run: {new Date(timestamp).toLocaleString('it-IT')}
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                    
                    <Button 
                      onClick={() => {
                        const json = JSON.stringify(suiteResults, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `suite-results-${new Date().toISOString()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Export JSON
                    </Button>
                    <Button 
                      onClick={() => {
                        setSuiteResults([]);
                        localStorage.removeItem('last-suite-report');
                      }}
                      variant="ghost"
                      size="sm"
                      disabled={isRunningSuite}
                    >
                      Clear Results
                    </Button>
                  </div>
                </div>
                {/* ✅ Descrizione suite eseguita */}
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const savedReport = localStorage.getItem('last-suite-report');
                    if (savedReport) {
                      const { report } = JSON.parse(savedReport);
                      const peakThroughput = suiteResults.length > 0 
                        ? Math.max(...suiteResults.map(r => r.metrics.throughput)).toFixed(1)
                        : '0';
                      return `Overall Success: ${report.overallSuccessRate}% | Peak Throughput: ${peakThroughput}/s`;
                    }
                    return 'Results from current session';
                  })()}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ✅ TABELLA COMPARATIVA DETTAGLIATA */}
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-3 text-left font-semibold">#</th>
                      <th className="p-3 text-left font-semibold">Test Type</th>
                      <th className="p-3 text-left font-semibold">Folder</th>
                      <th className="p-3 text-right font-semibold">Batch Size</th>
                      <th className="p-3 text-right font-semibold">Throughput</th>
                      <th className="p-3 text-right font-semibold">Avg Time</th>
                      <th className="p-3 text-right font-semibold">Total Time</th>
                      <th className="p-3 text-right font-semibold">Success</th>
                      <th className="p-3 text-right font-semibold">Errors</th>
                      <th className="p-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suiteResults.map((testResult, idx) => {
                      const isFastest = testResult.metrics.throughput === Math.max(...suiteResults.map(r => r.metrics.throughput));
                      const isSlowest = testResult.metrics.throughput === Math.min(...suiteResults.map(r => r.metrics.throughput));
                      
                      return (
                        <tr 
                          key={idx} 
                          className="border-t"
                        >
                          <td className="p-3 font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {testResult.config.testType}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs">{testResult.config.folder}</td>
                          <td className="p-3 text-right font-mono">{testResult.config.batchSize || '-'}</td>
                          <td className="p-3 text-right">
                            <span className={`font-mono font-bold ${isFastest ? 'text-green-600 dark:text-green-400' : ''}`}>
                              {testResult.metrics?.throughput != null ? testResult.metrics.throughput.toFixed(1) : '0'}/s
                            </span>
                            {isFastest && <span className="ml-1">🏆</span>}
                          </td>
                          <td className="p-3 text-right font-mono text-xs">
                            {testResult.metrics?.avgTimePerEmail != null ? `${testResult.metrics.avgTimePerEmail}ms` : 'N/A'}
                          </td>
                          <td className="p-3 text-right font-mono text-xs">
                            {testResult.metrics?.totalTime != null ? `${(testResult.metrics.totalTime / 1000).toFixed(1)}s` : 'N/A'}
                          </td>
                          <td className="p-3 text-right">
                            <Badge 
                              variant={
                                testResult.metrics.successRate === 100 ? 'default' : 
                                testResult.metrics.successRate >= 90 ? 'secondary' : 
                                'destructive'
                              }
                              className="font-mono"
                            >
                              {testResult.metrics?.successRate != null ? testResult.metrics.successRate.toFixed(0) : '0'}%
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-mono ${testResult.metrics.errors > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-muted-foreground'}`}>
                              {testResult.metrics.errors}
                            </span>
                          </td>
                          <td className="p-3 text-center text-lg">
                            {testResult.metrics.successRate === 100 ? '✅' : 
                             testResult.metrics.errors > 0 ? '❌' : '⚠️'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ✅ STATISTICHE AGGREGATE */}
              {suiteResults.length > 1 && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={Activity}
                      label="Tests Run"
                      value={suiteResults.length.toString()}
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Avg Success Rate"
                      value={suiteResults.length > 0
                        ? `${(suiteResults.reduce((acc, r) => acc + r.metrics.successRate, 0) / suiteResults.length).toFixed(1)}%`
                        : '0%'
                      }
                      trend={suiteResults.every(r => r.metrics.successRate === 100) ? 'up' : undefined}
                    />
                    <StatCard
                      icon={Zap}
                      label="Avg Throughput"
                      value={suiteResults.length > 0
                        ? `${(suiteResults.reduce((acc, r) => acc + r.metrics.throughput, 0) / suiteResults.length).toFixed(1)}/s`
                        : '0/s'
                      }
                    />
                    <StatCard
                      icon={Clock}
                      label="Total Errors"
                      value={suiteResults.reduce((acc, r) => acc + r.metrics.errors, 0).toString()}
                    />
                  </div>

                  {/* ✅ BEST PERFORMER HIGHLIGHTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-green-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          🏆 Fastest Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const fastest = suiteResults.reduce((best, r) => 
                            r.metrics.throughput > best.metrics.throughput ? r : best
                          );
                          return (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <Badge variant="outline" className="font-mono">{fastest.config.testType}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Folder:</span>
                                <span className="font-mono font-semibold">{fastest.config.folder}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Throughput:</span>
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {fastest.metrics?.throughput != null ? fastest.metrics.throughput.toFixed(1) : '0'}/s
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Batch Size:</span>
                                <span className="font-mono">{fastest.config.batchSize || 'N/A'}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                    
                    <Card className="border-blue-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          💯 Most Reliable
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const mostReliable = suiteResults.reduce((best, r) => 
                            r.metrics.successRate > best.metrics.successRate ? r : best
                          );
                          return (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <Badge variant="outline" className="font-mono">{mostReliable.config.testType}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Folder:</span>
                                <span className="font-mono font-semibold">{mostReliable.config.folder}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Success Rate:</span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {mostReliable.metrics?.successRate != null ? mostReliable.metrics.successRate.toFixed(0) : '0'}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Errors:</span>
                                <span className="font-mono">{mostReliable.metrics.errors}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* ✅ RECOMMENDATIONS */}
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>💡 Optimal Configuration Detected</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>• <strong>Best Method:</strong> {suiteResults.reduce((best, r) => r.metrics.throughput > best.metrics.throughput ? r : best).config.testType}</div>
                        <div>• <strong>Optimal Batch Size:</strong> {suiteResults.reduce((best, r) => r.metrics.throughput > best.metrics.throughput ? r : best).config.batchSize || 25}</div>
                        <div>• <strong>Best Folder:</strong> {suiteResults.reduce((best, r) => r.metrics.successRate > best.metrics.successRate ? r : best).config.folder}</div>
                        <div>• <strong>Overall Success Rate:</strong> {suiteResults.length > 0 
                          ? `${(suiteResults.reduce((acc, r) => acc + r.metrics.successRate, 0) / suiteResults.length).toFixed(1)}%`
                          : '0%'
                        }</div>
                        <div>• <strong>Peak Throughput:</strong> {suiteResults.length > 0 
                          ? `${Math.max(...suiteResults.map(r => r.metrics.throughput)).toFixed(1)} email/s`
                          : '0 email/s'
                        }</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ℹ️ Come usare</AlertTitle>
          <AlertDescription className="text-xs">
            <ul className="space-y-1 mt-2">
              <li>• <strong>Single Email</strong>: Testa velocità download singolo email (ripetuto N volte per media)</li>
              <li>• <strong>Batch Download</strong>: Testa download multiplo email in una chiamata</li>
              <li>• <strong>IMAP Health Check</strong>: Verifica stato server IMAP (connessione, folder, email)</li>
              <li>• Confronta i risultati per trovare configurazione ottimale</li>
              <li>• Esporta risultati JSON per analisi ulteriore</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

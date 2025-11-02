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

interface TestConfig {
  folder: string;
  testType: 'single' | 'batch' | 'batch-compare' | 'light-vs-full' | 'parallel' | 'imap-health';
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

// Suite completa di test per analisi ottimale
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

  // Load folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      setLoadingFolders(true);
      try {
        const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_folder',
            data: { handler: 'get_folders' }
          }
        });

        if (!error && data?.success && data?.folders) {
          const folderNames = data.folders.map((f: any) => f.name || f);
          setFolders(folderNames.length > 0 ? folderNames : ['INBOX']);
        }
      } catch (err) {
        console.error('Failed to load folders:', err);
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

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
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
            folder: config.folder,
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
        throw new Error(`Nessuna email trovata nella cartella "${config.folder}". Prova con "INBOX" o verifica che la cartella contenga email.`);
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
      const errorLog: TestError[] = []; // ✅ NUOVO: Error tracking

      if (config.testType === 'single') {
        // Test: Single Email Performance (con UIDs reali)
        console.log('🧪 [PERF TEST] Starting Single Email Test');
        
        for (let i = 0; i < (config.repetitions || 5); i++) {
          const iterStart = performance.now();
          const testUID = realUIDs[i % realUIDs.length]; // Usa UIDs reali in rotazione
          
          try {
            const { data, error: apiError } = await supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/email_message',
                data: {
                  handler: 'get_message',
                  uid: testUID,
                  folder: config.folder
                }
              }
            });

            totalApiCalls++;
            const iterTime = performance.now() - iterStart;
            times.push(iterTime);

            if (apiError) {
              errorCount++;
            }

            // Update live metrics
            setLiveMetrics({
              emailsProcessed: i + 1,
              currentSpeed: 1000 / iterTime, // emails/sec
              elapsed: (performance.now() - startTime) / 1000,
              apiCalls: totalApiCalls
            });

            setProgress(((i + 1) / (config.repetitions || 5)) * 100);

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (err) {
            errorCount++;
            console.error('❌ [PERF TEST] Request failed:', err);
          }
        }

      } else if (config.testType === 'batch') {
        // Test: Batch Download
        console.log('🧪 [PERF TEST] Starting Batch Test');
        
        const batchStart = performance.now();
        
        try {
          // ✅ NUOVO: Usa withTMWERetry
          const { data, error: apiError } = await withTMWERetry(
            () => supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/email_message',
                data: {
                  handler: 'get_messages',
                  folder: config.folder,
                  limit: config.batchSize || 25,
                  offset: 0,
                  include_attachments: false
                },
                requestTimeout: 30000 // ✅ NUOVO
              }
            }),
            'get_messages',
            (attempt) => {
              setLiveMetrics(prev => ({
                ...prev,
                apiCalls: prev.apiCalls + 1
              }));
            }
          );

          totalApiCalls++;
          const batchTime = performance.now() - batchStart;
          times.push(batchTime);

          // Parsing robusto per batch
          const batchMessages = data?.messages || data?.emails || data?.data?.messages || data?.data?.emails || [];
          const actualEmailCount = Array.isArray(batchMessages) ? batchMessages.length : 0;
          const batchSuccess = !apiError && actualEmailCount > 0;
          
          if (apiError || actualEmailCount === 0) {
            errorCount++;
            // ✅ NUOVO: Track error
            errorLog.push({
              type: categorizeError(apiError),
              message: apiError?.message || 'No emails retrieved',
              timestamp: new Date().toISOString(),
              testType: config.testType,
              folder: config.folder,
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
          // ✅ NUOVO: Track error
          errorLog.push({
            type: categorizeError(err),
            message: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
            testType: config.testType,
            folder: config.folder,
            handler: 'get_messages'
          });
        }

      } else if (config.testType === 'batch-compare') {
        // Test: Confronto Batch Size Diversi
        console.log('🧪 [PERF TEST] Starting Batch Comparison Test');
        const comparisonData: Array<{ batchSize: number; metrics: TestMetrics }> = [];
        const batchSizes = config.batchSizes || [5, 10, 25, 50];

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
                  folder: config.folder,
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

            // Parsing robusto per batch comparison
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

            // Delay tra test
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (err) {
            errorCount++;
            console.error(`❌ [PERF TEST] Batch ${batchSize} failed:`, err);
          }
        }

        // Calcola metriche aggregate
        const totalTime = performance.now() - startTime;
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const bestBatch = comparisonData.reduce((best, curr) => 
          curr.metrics.throughput > best.metrics.throughput ? curr : best
        );

        const testResult: TestResult = {
          config,
          metrics: {
            totalTime: Math.round(totalTime),
            avgTimePerEmail: Math.round(avgTime / (config.batchSize || 25)),
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
            ...generateRecommendations(bestBatch.metrics, { ...config, batchSize: bestBatch.batchSize })
          ],
          comparisonData
        };

        setResult(testResult);
        setIsRunning(false);
        return;

      } else if (config.testType === 'light-vs-full') {
        // Test: Confronto get_messages light (no attachments) vs full (with attachments)
        console.log('🧪 [PERF TEST] Starting Light vs Full Body Comparison Test');

        // Test 1: get_messages light (no attachments)
        const lightStart = performance.now();
        const { data: lightData, error: lightError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_messages',
              folder: config.folder,
              limit: config.batchSize || 25,
              offset: 0,
              include_attachments: false
            }
          }
        });
        const lightTime = performance.now() - lightStart;
        totalApiCalls++;

        setProgress(50);

        // Delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 2: get_messages full (with attachments)
        const fullStart = performance.now();
        const { data: fullData, error: fullError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_messages',
              folder: config.folder,
              limit: config.batchSize || 25,
              offset: 0,
              include_attachments: true
            }
          }
        });
        const fullTime = performance.now() - fullStart;
        totalApiCalls++;

        setProgress(100);

        // Verifica messaggi effettivamente ricevuti
        const lightMessages = lightData?.messages || [];
        const fullMessages = fullData?.messages || [];
        const lightSuccess = !lightError && lightMessages.length > 0;
        const fullSuccess = !fullError && fullMessages.length > 0;
        const actualEmailCount = Math.max(lightMessages.length, fullMessages.length) || (config.batchSize || 25);

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

        const testResult: TestResult = {
          config,
          metrics: lightMetrics, // Usa le metriche light come principali
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

        setResult(testResult);
        setIsRunning(false);
        return;

      } else if (config.testType === 'parallel') {
        // Test: Download Parallelo
        console.log('🧪 [PERF TEST] Starting Parallel Download Test');
        const parallelBatches = config.parallelBatches || 3;
        const batchSize = config.batchSize || 25;

        const parallelStart = performance.now();

        // Crea array di promesse per richieste parallele
        const promises = Array.from({ length: parallelBatches }, (_, i) =>
          supabase.functions.invoke('tmwe-api-proxy', {
            body: {
              endpoint: '/email_message',
              data: {
                handler: 'get_messages',
                folder: config.folder,
                limit: batchSize,
                offset: i * batchSize
              }
            }
          }).then(result => {
            totalApiCalls++;
            setProgress(((i + 1) / parallelBatches) * 100);
            return result;
          })
        );

        const results = await Promise.all(promises);
        const parallelTime = performance.now() - parallelStart;

        // Calcola success verificando messaggi ricevuti
        const successCount = results.filter(r => {
          const messages = r.data?.messages || [];
          return !r.error && messages.length > 0;
        }).length;
        
        // Conta email effettivamente ricevute
        const actualEmailCount = results.reduce((sum, r) => {
          return sum + (r.data?.messages?.length || 0);
        }, 0);

        const testResult: TestResult = {
          config,
          metrics: {
            totalTime: Math.round(parallelTime),
            avgTimePerEmail: actualEmailCount > 0 ? Math.round(parallelTime / actualEmailCount) : 0,
            minTime: Math.round(parallelTime),
            maxTime: Math.round(parallelTime),
            throughput: actualEmailCount > 0 ? Math.round((actualEmailCount / parallelTime) * 1000 * 100) / 100 : 0,
            apiCalls: parallelBatches,
            errors: parallelBatches - successCount,
            successRate: (successCount / parallelBatches) * 100
          },
          timestamp: new Date().toISOString(),
          recommendations: [
            `⚡ Download parallelo di ${parallelBatches} batch (${actualEmailCount} email totali)`,
            `🚀 Throughput: ${actualEmailCount > 0 ? Math.round((actualEmailCount / parallelTime) * 1000 * 100) / 100 : 0} email/sec`,
            parallelBatches < 5 ? '💡 Prova aumentare il parallelismo a 4-5 batch' : '✅ Buon livello di parallelismo',
            successCount === parallelBatches ? '✅ Tutti i batch completati con successo' : '⚠️ Alcuni batch falliti, verifica limiti API'
          ]
        };

        setResult(testResult);
        setIsRunning(false);
        return;
      
      } else if (config.testType === 'imap-health') {
        // ✅ NUOVO: Test IMAP Health Check
        console.log('🏥 [PERF TEST] IMAP Health Check');
        
        const healthStatus: IMAPHealthStatus = {
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
        try {
          const t1 = performance.now();
          await withTMWERetry(
            () => supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/email_account',
                data: { handler: 'get_account_info' },
                requestTimeout: 10000
              }
            }),
            'get_account_info'
          );
          healthStatus.accountConnectionTime = performance.now() - t1;
          healthStatus.accountConnection = true;
          console.log('✅ Account connection: OK');
        } catch (err: any) {
          healthStatus.issues.push(`Account connection error: ${err.message}`);
          errorLog.push({
            type: categorizeError(err),
            message: err.message,
            timestamp: new Date().toISOString(),
            testType: 'imap-health',
            folder: 'N/A',
            handler: 'get_account_info'
          });
        }
        
        setProgress(33);
        
        // Test 2: Folder Access
        try {
          const t2 = performance.now();
          await withTMWERetry(
            () => supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/email_folder',
                data: { handler: 'get_folders' },
                requestTimeout: 15000
              }
            }),
            'get_folders'
          );
          healthStatus.folderAccessTime = performance.now() - t2;
          healthStatus.folderAccess = true;
          console.log('✅ Folder access: OK');
        } catch (err: any) {
          healthStatus.issues.push(`Folder access error: ${err.message}`);
          errorLog.push({
            type: categorizeError(err),
            message: err.message,
            timestamp: new Date().toISOString(),
            testType: 'imap-health',
            folder: 'N/A',
            handler: 'get_folders'
          });
        }
        
        setProgress(66);
        
        // Test 3: Email Retrieval
        try {
          const t3 = performance.now();
          await withTMWERetry(
            () => supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/email_message',
                data: {
                  handler: 'get_messages',
                  folder: 'INBOX',
                  limit: 1,
                  offset: 0,
                  include_attachments: false
                },
                requestTimeout: 20000
              }
            }),
            'get_messages'
          );
          healthStatus.emailRetrievalTime = performance.now() - t3;
          healthStatus.emailRetrieval = true;
          console.log('✅ Email retrieval: OK');
        } catch (err: any) {
          healthStatus.issues.push(`Email retrieval error: ${err.message}`);
          errorLog.push({
            type: categorizeError(err),
            message: err.message,
            timestamp: new Date().toISOString(),
            testType: 'imap-health',
            folder: 'INBOX',
            handler: 'get_messages'
          });
        }
        
        setProgress(100);
        
        // Calcola overall health
        const healthScore = 
          (healthStatus.accountConnection ? 1 : 0) +
          (healthStatus.folderAccess ? 1 : 0) +
          (healthStatus.emailRetrieval ? 1 : 0);
        
        if (healthScore === 3) healthStatus.overallHealth = 'healthy';
        else if (healthScore >= 2) healthStatus.overallHealth = 'degraded';
        else healthStatus.overallHealth = 'critical';
        
        console.log(`🏥 Health Status: ${healthStatus.overallHealth.toUpperCase()}`);
        
        const healthTestResult: TestResult = {
          config,
          metrics: {
            totalTime: healthStatus.accountConnectionTime + healthStatus.folderAccessTime + healthStatus.emailRetrievalTime,
            avgTimePerEmail: 0,
            minTime: 0,
            maxTime: 0,
            throughput: 0,
            apiCalls: 3,
            errors: errorLog.length,
            successRate: (healthScore / 3) * 100
          },
          timestamp: new Date().toISOString(),
          recommendations: [
            healthStatus.overallHealth === 'healthy' ? '✅ IMAP server is healthy' : '⚠️ IMAP server has issues',
            ...healthStatus.issues.map(i => `❌ ${i}`),
            healthStatus.accountConnectionTime > 5000 ? '⚠️ Account connection is slow (>5s)' : '',
            healthStatus.folderAccessTime > 10000 ? '⚠️ Folder access is slow (>10s)' : '',
            healthStatus.emailRetrievalTime > 15000 ? '⚠️ Email retrieval is slow (>15s)' : ''
          ].filter(Boolean),
          errorLog,
          healthCheck: healthStatus
        };
        
        setResult(healthTestResult);
        setIsRunning(false);
        return;
      }

      const totalTime = performance.now() - startTime;

      // Calculate metrics
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const emailsProcessed = config.testType === 'single' 
        ? (config.repetitions || 5) 
        : (config.batchSize || 25);
      const throughput = (emailsProcessed / totalTime) * 1000; // emails/sec
      const successRate = ((times.length - errorCount) / times.length) * 100;

      const metrics: TestMetrics = {
        totalTime: Math.round(totalTime),
        avgTimePerEmail: Math.round(avgTime / (config.testType === 'single' ? 1 : (config.batchSize || 25))),
        minTime: Math.round(minTime),
        maxTime: Math.round(maxTime),
        throughput: Math.round(throughput * 100) / 100,
        apiCalls: totalApiCalls,
        errors: errorCount,
        successRate: Math.round(successRate * 100) / 100
      };

      // Generate recommendations
      const recommendations = generateRecommendations(metrics, config);

      const testResult: TestResult = {
        config,
        metrics,
        timestamp: new Date().toISOString(),
        recommendations,
        errorLog // ✅ NUOVO: Include error log
      };

      setResult(testResult);
      console.log('✅ [PERF TEST] Test completed:', testResult);
      
      // ✅ NUOVO: Log performance metrics
      await logPerformanceMetrics({
        test_type: config.testType,
        folder: config.folder,
        batch_size: config.batchSize || 25,
        throughput: metrics.throughput,
        success_rate: metrics.successRate,
        avg_time_per_email: metrics.avgTimePerEmail,
        errors: metrics.errors
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
  
  const runAllTests = async () => {
    const selectedSuiteConfig = SUITE_MAP[selectedSuite];
    if (!selectedSuiteConfig) {
      setError('Invalid suite selected');
      return;
    }

    console.log(`🚀 [TEST SUITE] Starting ${selectedSuiteConfig.name}...`);
    setIsRunningSuite(true);
    setCurrentTestIndex(0);
    setSuiteResults([]);
    setSuiteProgress(0);
    setError(null);
    
    const results: TestResult[] = [];
    const totalTests = selectedSuiteConfig.tests.length;
    
    try {
      for (let i = 0; i < selectedSuiteConfig.tests.length; i++) {
        const testConfig = selectedSuiteConfig.tests[i];
        setCurrentTestIndex(i);
        
        console.log(`\n📋 [TEST ${i + 1}/${totalTests}] Running: ${testConfig.testType} on ${testConfig.folder}`);
        
        // Aggiorna config
        setConfig(testConfig);
        
        // Aspetta per UI update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Esegui il test (riusa runPerformanceTest)
        setIsRunning(true);
        setProgress(0);
        setResult(null);
        
        // Esegui test in modo sincrono
        await new Promise<void>((resolve) => {
          (async () => {
            await runPerformanceTest();
            resolve();
          })();
        });
        
        // Aspetta che il risultato sia disponibile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recupera risultato dalla closure
        if (result) {
          results.push(result);
          setSuiteResults([...results]);
          console.log(`✅ [TEST ${i + 1}/${totalTests}] Completed: ${testConfig.testType}`);
        }
        
        // Aggiorna progress
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
      overallSuccessRate: (results.reduce((acc, r) => acc + r.metrics.successRate, 0) / results.length).toFixed(1),
      
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Folder</Label>
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
                <p className="text-lg font-bold">{liveMetrics.currentSpeed.toFixed(1)}/s</p>
              </div>
              <div className="text-center p-2 rounded-md bg-background/50">
                <p className="text-xs text-muted-foreground">Elapsed</p>
                <p className="text-lg font-bold">{liveMetrics.elapsed.toFixed(1)}s</p>
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
                      {(result.metadataComparison.withBody.totalTime / result.metadataComparison.metadataOnly.totalTime).toFixed(1)}x Faster
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
                        <div className="text-sm text-muted-foreground">{result.healthCheck.accountConnectionTime.toFixed(0)}ms</div>
                        <div className="mt-2 text-lg">{result.healthCheck.accountConnection ? '✅' : '❌'}</div>
                      </div>
                      
                      <div className={`p-4 border rounded-lg ${result.healthCheck.folderAccess ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-red-50 dark:bg-red-950 border-red-200'}`}>
                        <div className="font-semibold">Folder Access</div>
                        <div className="text-sm text-muted-foreground">{result.healthCheck.folderAccessTime.toFixed(0)}ms</div>
                        <div className="mt-2 text-lg">{result.healthCheck.folderAccess ? '✅' : '❌'}</div>
                      </div>
                      
                      <div className={`p-4 border rounded-lg ${result.healthCheck.emailRetrieval ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-red-50 dark:bg-red-950 border-red-200'}`}>
                        <div className="font-semibold">Email Retrieval</div>
                        <div className="text-sm text-muted-foreground">{result.healthCheck.emailRetrievalTime.toFixed(0)}ms</div>
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

        {/* ✅ NUOVO: Suite Comparative Report */}
        {suiteResults.length > 0 && !isRunningSuite && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Comparative Analysis Report
                <Badge variant="outline">{suiteResults.length} tests</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={Activity}
                  label="Tests Run"
                  value={suiteResults.length.toString()}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Success Rate"
                  value={`${(suiteResults.reduce((acc, r) => acc + r.metrics.successRate, 0) / suiteResults.length).toFixed(1)}%`}
                  trend={suiteResults.every(r => r.metrics.successRate === 100) ? 'up' : undefined}
                />
                <StatCard
                  icon={Zap}
                  label="Best Throughput"
                  value={`${Math.max(...suiteResults.map(r => r.metrics.throughput)).toFixed(1)}/s`}
                />
                <StatCard
                  icon={Clock}
                  label="Total Time"
                  value={`${(suiteResults.reduce((acc, r) => acc + r.metrics.totalTime, 0) / 1000).toFixed(1)}s`}
                />
              </div>
              
              {/* Performance by Test Type */}
              <div>
                <h4 className="font-semibold mb-3">Performance by Test Type:</h4>
                <div className="space-y-2">
                  {suiteResults.map((testResult, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{testResult.config.testType}</Badge>
                        <span className="text-sm text-muted-foreground">{testResult.config.folder}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold">{testResult.metrics.throughput.toFixed(1)} email/s</div>
                          <div className="text-xs text-muted-foreground">{testResult.metrics.avgTimePerEmail.toFixed(0)}ms avg</div>
                        </div>
                        <Badge variant={testResult.metrics.successRate === 100 ? "default" : "destructive"}>
                          {testResult.metrics.successRate}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recommendations */}
              <div>
                <h4 className="font-semibold mb-3">System Recommendations:</h4>
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Optimal Configuration Detected:</strong><br />
                    • Batch Size: {suiteResults.reduce((best, r) => r.metrics.throughput > best.metrics.throughput ? r : best).config.batchSize || 25}<br />
                    • Best Folder: {suiteResults.reduce((best, r) => r.metrics.successRate > best.metrics.successRate ? r : best).config.folder}<br />
                    • Recommended Method: {suiteResults.reduce((best, r) => r.metrics.throughput > best.metrics.throughput ? r : best).config.testType}<br />
                    • Overall Success Rate: {(suiteResults.reduce((acc, r) => acc + r.metrics.successRate, 0) / suiteResults.length).toFixed(1)}%
                  </AlertDescription>
                </Alert>
              </div>
              
              {/* Export Suite Results */}
              <Button 
                onClick={() => {
                  const json = JSON.stringify(suiteResults, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `test-suite-${new Date().toISOString()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Suite Results (JSON)
              </Button>
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

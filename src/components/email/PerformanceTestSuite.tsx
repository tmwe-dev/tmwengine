/**
 * Performance Test Suite - Analisi ottimizzazione importazione email
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Play, Download, TrendingUp, Clock, Activity, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/design-system/cards/StatCard';

interface TestConfig {
  folder: string;
  testType: 'single' | 'batch' | 'batch-compare' | 'metadata' | 'parallel';
  batchSize?: number;
  repetitions?: number;
  batchSizes?: number[]; // Per batch-compare
  parallelBatches?: number; // Per parallel test
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
  comparisonData?: Array<{ batchSize: number; metrics: TestMetrics }>; // Per batch-compare
  metadataComparison?: { withBody: TestMetrics; metadataOnly: TestMetrics }; // Per metadata test
}

export function PerformanceTestSuite() {
  const [config, setConfig] = useState<TestConfig>({
    folder: 'INBOX',
    testType: 'single',
    batchSize: 25,
    repetitions: 5,
    batchSizes: [5, 10, 25, 50],
    parallelBatches: 3
  });

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

      if (uidError || !uidData?.success || !uidData?.messages?.length) {
        throw new Error('Impossibile recuperare UIDs dalla cartella. Verifica che la cartella contenga email.');
      }

      const realUIDs = uidData.messages.map((m: any) => m.uid).filter(Boolean);
      console.log(`✅ [PERF TEST] Found ${realUIDs.length} UIDs`);

      if (realUIDs.length === 0) {
        throw new Error('Nessun UID trovato nella cartella.');
      }

      const startTime = performance.now();
      const times: number[] = [];
      let totalApiCalls = 1; // Già fatta una chiamata per gli UIDs
      let errorCount = 0;

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

            if (apiError || !data?.success) {
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
          const { data, error: apiError } = await supabase.functions.invoke('tmwe-api-proxy', {
            body: {
              endpoint: '/email_message',
              data: {
                handler: 'get_messages',
                folder: config.folder,
                limit: config.batchSize || 25,
                offset: 0
              }
            }
          });

          totalApiCalls++;
          const batchTime = performance.now() - batchStart;
          times.push(batchTime);

          if (apiError || !data?.success) {
            errorCount++;
          }

          const emailCount = data?.messages?.length || config.batchSize || 25;

          setLiveMetrics({
            emailsProcessed: emailCount,
            currentSpeed: (emailCount / batchTime) * 1000,
            elapsed: batchTime / 1000,
            apiCalls: totalApiCalls
          });

          setProgress(100);

        } catch (err) {
          errorCount++;
          console.error('❌ [PERF TEST] Batch request failed:', err);
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

            if (apiError || !data?.success) {
              batchErrors++;
            }

            const emailCount = data?.messages?.length || batchSize;
            const throughput = (emailCount / batchTime) * 1000;

            comparisonData.push({
              batchSize,
              metrics: {
                totalTime: Math.round(batchTime),
                avgTimePerEmail: Math.round(batchTime / emailCount),
                minTime: Math.round(batchTime),
                maxTime: Math.round(batchTime),
                throughput: Math.round(throughput * 100) / 100,
                apiCalls: 1,
                errors: batchErrors,
                successRate: batchErrors === 0 ? 100 : 0
              }
            });

            setLiveMetrics({
              emailsProcessed: emailCount * (i + 1),
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

      } else if (config.testType === 'metadata') {
        // Test: Confronto get_messages vs get_emails_metadata
        console.log('🧪 [PERF TEST] Starting Metadata Comparison Test');

        // Test 1: get_messages (con body)
        const withBodyStart = performance.now();
        const { data: withBodyData, error: withBodyError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_messages',
              folder: config.folder,
              limit: config.batchSize || 25,
              offset: 0
            }
          }
        });
        const withBodyTime = performance.now() - withBodyStart;
        totalApiCalls++;

        setProgress(50);

        // Delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 2: get_emails_metadata (solo metadata)
        const metadataStart = performance.now();
        const { data: metadataData, error: metadataError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_emails_metadata',
              folder: config.folder,
              limit: config.batchSize || 25,
              offset: 0
            }
          }
        });
        const metadataTime = performance.now() - metadataStart;
        totalApiCalls++;

        setProgress(100);

        const emailCount = config.batchSize || 25;
        const speedup = withBodyTime / metadataTime;

        const withBodyMetrics: TestMetrics = {
          totalTime: Math.round(withBodyTime),
          avgTimePerEmail: Math.round(withBodyTime / emailCount),
          minTime: Math.round(withBodyTime),
          maxTime: Math.round(withBodyTime),
          throughput: Math.round((emailCount / withBodyTime) * 1000 * 100) / 100,
          apiCalls: 1,
          errors: withBodyError ? 1 : 0,
          successRate: withBodyError ? 0 : 100
        };

        const metadataMetrics: TestMetrics = {
          totalTime: Math.round(metadataTime),
          avgTimePerEmail: Math.round(metadataTime / emailCount),
          minTime: Math.round(metadataTime),
          maxTime: Math.round(metadataTime),
          throughput: Math.round((emailCount / metadataTime) * 1000 * 100) / 100,
          apiCalls: 1,
          errors: metadataError ? 1 : 0,
          successRate: metadataError ? 0 : 100
        };

        const testResult: TestResult = {
          config,
          metrics: metadataMetrics, // Usa le metriche metadata come principali
          timestamp: new Date().toISOString(),
          recommendations: [
            `🚀 Speedup: ${speedup.toFixed(2)}x più veloce con metadata API`,
            `💡 Usa get_emails_metadata per liste email (non serve il body)`,
            `📧 Usa get_message solo per visualizzazione dettaglio singola email`,
            speedup > 3 ? '✅ Ottimo guadagno performance con metadata API' : '⚠️ Speedup limitato, verifica configurazione'
          ],
          metadataComparison: {
            withBody: withBodyMetrics,
            metadataOnly: metadataMetrics
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

        const successCount = results.filter(r => !r.error && r.data?.success).length;
        const totalEmails = batchSize * parallelBatches;

        const testResult: TestResult = {
          config,
          metrics: {
            totalTime: Math.round(parallelTime),
            avgTimePerEmail: Math.round(parallelTime / totalEmails),
            minTime: Math.round(parallelTime),
            maxTime: Math.round(parallelTime),
            throughput: Math.round((totalEmails / parallelTime) * 1000 * 100) / 100,
            apiCalls: parallelBatches,
            errors: parallelBatches - successCount,
            successRate: (successCount / parallelBatches) * 100
          },
          timestamp: new Date().toISOString(),
          recommendations: [
            `⚡ Download parallelo di ${parallelBatches} batch (${totalEmails} email totali)`,
            `🚀 Throughput: ${Math.round((totalEmails / parallelTime) * 1000 * 100) / 100} email/sec`,
            parallelBatches < 5 ? '💡 Prova aumentare il parallelismo a 4-5 batch' : '✅ Buon livello di parallelismo',
            successCount === parallelBatches ? '✅ Tutti i batch completati con successo' : '⚠️ Alcuni batch falliti, verifica limiti API'
          ]
        };

        setResult(testResult);
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
        recommendations
      };

      setResult(testResult);
      console.log('✅ [PERF TEST] Test completed:', testResult);

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Performance Test Suite
          <Badge variant="outline" className="ml-auto">BETA</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Configuration */}
        <div className="space-y-4">
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
                  <SelectItem value="metadata">⚡ Metadata vs Full Body</SelectItem>
                  <SelectItem value="parallel">🔄 Parallel Download</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Folder</Label>
              <Input
                value={config.folder}
                onChange={(e) => setConfig({ ...config, folder: e.target.value })}
                placeholder="INBOX"
              />
            </div>
          </div>

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

          {(config.testType === 'batch' || config.testType === 'metadata') && (
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

          <Button
            onClick={runPerformanceTest}
            disabled={isRunning || !config.folder}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-pulse" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Performance Test
              </>
            )}
          </Button>
        </div>

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
          </div>
        )}

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ℹ️ Come usare</AlertTitle>
          <AlertDescription className="text-xs">
            <ul className="space-y-1 mt-2">
              <li>• <strong>Single Email</strong>: Testa velocità download singolo email (ripetuto N volte per media)</li>
              <li>• <strong>Batch Download</strong>: Testa download multiplo email in una chiamata</li>
              <li>• Confronta i risultati per trovare configurazione ottimale</li>
              <li>• Esporta risultati JSON per analisi ulteriore</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

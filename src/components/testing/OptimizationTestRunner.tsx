import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, StopCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { getApiConfigFromDB } from '@/lib/tmwe-api-integrated';
import { OptimizationFlags } from './OptimizationControls';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  configName: string;
  responseTime: number;
  isBaseline?: boolean;
  flags: OptimizationFlags;
}

interface OptimizationTestRunnerProps {
  flags: OptimizationFlags;
  onResultsUpdate: (results: TestResult[]) => void;
}

export const OptimizationTestRunner = ({ flags, onResultsUpdate }: OptimizationTestRunnerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState('');
  const { toast } = useToast();

  const testConfigurations = [
    // === BATCH OPERATIONS (Mark as Read) ===
    {
      name: '📧 Batch Mark Read - Baseline',
      testType: 'batch_mark_read',
      flags: {
        enableLogging: true,
        useDoubleSerializat: true,
        useSequentialExecution: true,
        useTextResponse: true,
        benchmarkDelay: flags.benchmarkDelay
      },
      isBaseline: true
    },
    {
      name: '📧 Batch Mark Read - Parallel ⚡',
      testType: 'batch_mark_read',
      flags: {
        enableLogging: true,
        useDoubleSerializat: true,
        useSequentialExecution: false,
        useTextResponse: true,
        benchmarkDelay: flags.benchmarkDelay
      }
    },
    {
      name: '📧 Batch Mark Read - Full Opt ✅',
      testType: 'batch_mark_read',
      flags: {
        enableLogging: false,
        useDoubleSerializat: false,
        useSequentialExecution: false,
        useTextResponse: false,
        benchmarkDelay: flags.benchmarkDelay
      }
    },
    
    // === LIGHTWEIGHT GET FOLDERS ===
    {
      name: '📁 Fast Folders - Baseline',
      testType: 'fast_folders',
      flags: {
        enableLogging: true,
        useDoubleSerializat: true,
        useSequentialExecution: true,
        useTextResponse: true,
        benchmarkDelay: flags.benchmarkDelay
      }
    },
    {
      name: '📁 Fast Folders - No Logging 🪵',
      testType: 'fast_folders',
      flags: {
        enableLogging: false,
        useDoubleSerializat: true,
        useSequentialExecution: true,
        useTextResponse: true,
        benchmarkDelay: flags.benchmarkDelay
      }
    },
    {
      name: '📁 Fast Folders - Full Opt ✅',
      testType: 'fast_folders',
      flags: {
        enableLogging: false,
        useDoubleSerializat: false,
        useSequentialExecution: false,
        useTextResponse: false,
        benchmarkDelay: flags.benchmarkDelay
      }
    },
    
    // === HEAVY GET FOLDERS (original test) ===
    {
      name: '📊 Heavy Folders - Baseline',
      testType: 'heavy_folders',
      flags: {
        enableLogging: true,
        useDoubleSerializat: true,
        useSequentialExecution: true,
        useTextResponse: true,
        benchmarkDelay: flags.benchmarkDelay
      }
    },
    {
      name: '📊 Heavy Folders - Full Opt ✅',
      testType: 'heavy_folders',
      flags: {
        enableLogging: false,
        useDoubleSerializat: false,
        useSequentialExecution: false,
        useTextResponse: false,
        benchmarkDelay: flags.benchmarkDelay
      }
    }
  ];

  const runOptimizationTests = async () => {
    setIsRunning(true);
    setProgress(0);
    const results: TestResult[] = [];

    try {
      const config = await getApiConfigFromDB();
      if (!config?.accessToken) {
        toast({
          title: "Errore",
          description: "Access token non configurato",
          variant: "destructive"
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Errore",
          description: "Sessione non valida",
          variant: "destructive"
        });
        return;
      }

      for (let i = 0; i < testConfigurations.length; i++) {
        const testConfig = testConfigurations[i];
        setCurrentTest(testConfig.name);
        setProgress((i / testConfigurations.length) * 100);

        const startTime = performance.now();

        try {
          let response;
          
          // Determina endpoint e data in base al tipo di test
          if (testConfig.testType === 'batch_mark_read') {
            // Batch Mark as Read (5 messaggi fittizi per test)
            response = await supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/app.php?action=email_message',
                data: {
                  handler: 'mark_as_read',
                  message_ids: ['test1', 'test2', 'test3', 'test4', 'test5']
                },
                accessToken: config.accessToken,
                optimizationFlags: testConfig.flags
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
          } else if (testConfig.testType === 'fast_folders') {
            // Get Folders veloce (senza counts)
            response = await supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/app.php?action=email_folder',
                data: {
                  handler: 'get_folders',
                  include_counts: false,
                  hierarchy: false
                },
                accessToken: config.accessToken,
                optimizationFlags: testConfig.flags
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
          } else {
            // Heavy folders (test originale)
            response = await supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/app.php?action=email_folder',
                data: {
                  handler: 'get_folders',
                  include_counts: true,
                  hierarchy: true
                },
                accessToken: config.accessToken,
                optimizationFlags: testConfig.flags
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
          }

          const endTime = performance.now();

          if (response.error) {
            console.error(`Test ${testConfig.name} failed:`, response.error);
            continue;
          }

          results.push({
            configName: testConfig.name,
            responseTime: endTime - startTime,
            isBaseline: testConfig.isBaseline,
            flags: testConfig.flags
          });

        } catch (error) {
          console.error(`Test ${testConfig.name} error:`, error);
        }

        // Delay tra test
        if (i < testConfigurations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, testConfig.flags.benchmarkDelay));
        }
      }

      setProgress(100);
      onResultsUpdate(results);
      
      // 🔥 AUTO-SAVE AL DATABASE
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const baselineTime = results.find(r => r.isBaseline)?.responseTime || 0;
        
        if (user) {
          const { error: dbError } = await supabase.from('tmwe_api_benchmark_results').insert([{
            user_id: user.id,
            category: 'optimization_ab_test',
            total_suites: 1,
            total_tests: results.length,
            results: JSON.parse(JSON.stringify(results.map(r => ({
              variant_name: r.configName,
              response_time_ms: r.responseTime,
              success: true,
              optimization_flags: {
                enableLogging: r.flags.enableLogging,
                useDoubleSerializat: r.flags.useDoubleSerializat,
                useSequentialExecution: r.flags.useSequentialExecution,
                useTextResponse: r.flags.useTextResponse,
                benchmarkDelay: r.flags.benchmarkDelay
              },
              improvement_percentage: baselineTime && !r.isBaseline
                ? parseFloat(((baselineTime - r.responseTime) / baselineTime * 100).toFixed(2))
                : 0
            })))),
            avg_response_time_ms: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
            overall_success_rate: 100
          }]);
          
          if (dbError) {
            console.error('❌ Errore salvataggio DB:', dbError);
            toast({
              title: "Errore salvataggio",
              description: "Impossibile salvare i risultati al database",
              variant: "destructive"
            });
          } else {
            console.log('✅ Risultati salvati al database');
          }
        }
      } catch (error) {
        console.error('❌ Errore salvataggio DB:', error);
      }
      
      toast({
        title: "Test Completati e Salvati",
        description: `${results.length} configurazioni testate e salvate nel database`,
      });

    } catch (error) {
      console.error('Optimization test error:', error);
      toast({
        title: "Errore",
        description: "Errore durante i test di ottimizzazione",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={runOptimizationTests}
          disabled={isRunning}
          size="lg"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <StopCircle className="h-5 w-5 animate-pulse" />
              Testing in corso...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Run Optimization Tests
            </>
          )}
        </Button>
        <div className="text-sm text-muted-foreground">
          {testConfigurations.length} configurazioni da testare
        </div>
      </div>

      {isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{currentTest}</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  );
};

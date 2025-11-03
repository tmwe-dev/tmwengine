import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TestMethodCard } from './TestMethodCard';
import { ResultCard } from './ResultCard';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { 
  TestResult, 
  OptimizationFlags,
  PerformanceProfile,
  saveTestResultAsProfile,
  getActiveProfile,
  activateProfile as activateProfileDB,
  deactivateProfile,
  deleteProfile
} from '@/lib/performance-profiles';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface TestMethodConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  testType: 'single' | 'batch';
  batchSize: number;
}

const TEST_METHODS: TestMethodConfig[] = [
  {
    id: 'single',
    name: 'Single Email',
    icon: '📧',
    description: 'Test velocità email singola',
    testType: 'single',
    batchSize: 1
  },
  {
    id: 'batch-5',
    name: 'Batch 5',
    icon: '📦',
    description: 'Download 5 email in batch',
    testType: 'batch',
    batchSize: 5
  },
  {
    id: 'batch-10',
    name: 'Batch 10',
    icon: '📦',
    description: 'Download 10 email in batch',
    testType: 'batch',
    batchSize: 10
  },
  {
    id: 'batch-15',
    name: 'Batch 15',
    icon: '📦',
    description: 'Download 15 email in batch',
    testType: 'batch',
    batchSize: 15
  },
  {
    id: 'batch-20',
    name: 'Batch 20',
    icon: '📦',
    description: 'Download 20 email in batch',
    testType: 'batch',
    batchSize: 20
  }
];

export function PerformanceProfileConfigurator() {
  const { toast } = useToast();
  
  // Test configuration
  const [emailCount, setEmailCount] = useState(25);
  const [testSequential, setTestSequential] = useState(true);
  const [testParallel, setTestParallel] = useState(true);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  
  // Results
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  
  // Active profile
  const [activeProfile, setActiveProfile] = useState<PerformanceProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Load active profile on mount
  useEffect(() => {
    loadActiveProfile();
  }, []);

  const loadActiveProfile = async () => {
    try {
      setLoadingProfile(true);
      const profile = await getActiveProfile();
      setActiveProfile(profile);
    } catch (error) {
      console.error('Error loading active profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const runSingleTest = async (
    method: TestMethodConfig,
    executionMode: 'sequential' | 'parallel'
  ): Promise<TestResult | null> => {
    const testId = `${method.id}-${executionMode}`;
    setCurrentTest(testId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const optimizationFlags: OptimizationFlags = {
        enableLogging: false,
        useDoubleSerializat: false,
        useSequentialExecution: executionMode === 'sequential',
        useTextResponse: false,
        batchChunkSize: method.batchSize
      };

      // Prepare test request - simula chiamata API
      const startTime = Date.now();

      // Simula risposta (in produzione chiamare edge function)
      const mockResponse = {
        success: true,
        data: Array.from({ length: method.batchSize }, (_, i) => ({
          uid: i + 1,
          subject: `Test ${i + 1}`,
          from: 'test@example.com'
        }))
      };

      // Simula latenza
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const response = mockResponse;

      const testResult: TestResult = {
        id: testId,
        name: `${method.name} - ${executionMode === 'sequential' ? 'Seq' : 'Par'}`,
        testType: method.testType,
        batchSize: method.batchSize,
        executionMode,
        avgTime: executionTime,
        successRate: response?.success ? 100 : 0,
        repetitions: 1,
        optimizationFlags
      };

      return testResult;

    } catch (error: any) {
      console.error(`Test failed for ${method.name}:`, error);
      toast({
        title: "Test fallito",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setCurrentTest(null);
    }
  };

  const runTest = async (methodId: string) => {
    const method = TEST_METHODS.find(m => m.id === methodId);
    if (!method) return;

    const results: TestResult[] = [];

    if (testSequential) {
      const result = await runSingleTest(method, 'sequential');
      if (result) results.push(result);
    }

    if (testParallel) {
      const result = await runSingleTest(method, 'parallel');
      if (result) results.push(result);
    }

    setTestResults(prev => [...prev, ...results]);

    toast({
      title: "Test completato",
      description: `${method.name} testato con successo`
    });
  };

  const runAllTests = async () => {
    setTestResults([]);
    setSavedProfiles(new Set());

    for (const method of TEST_METHODS) {
      await runTest(method.id);
    }

    toast({
      title: "Tutti i test completati",
      description: `${testResults.length} configurazioni testate`
    });
  };

  const saveResult = async (result: TestResult) => {
    try {
      await saveTestResultAsProfile(result);
      setSavedProfiles(prev => new Set([...prev, result.id]));
      toast({
        title: "Profilo salvato",
        description: `${result.name} salvato con successo`
      });
    } catch (error: any) {
      toast({
        title: "Errore salvataggio",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const activateResult = async (result: TestResult) => {
    try {
      // Save first if not saved
      if (!savedProfiles.has(result.id)) {
        const profileId = await saveTestResultAsProfile(result);
        await activateProfileDB(profileId);
      } else {
        // Find profile by name and activate
        const { data: profiles } = await supabase
          .from('performance_profiles')
          .select('id')
          .eq('profile_name', result.name)
          .maybeSingle();
        
        if (profiles?.id) {
          await activateProfileDB(profiles.id);
        }
      }

      await loadActiveProfile();

      toast({
        title: "Profilo attivato",
        description: `${result.name} ora è il profilo attivo`
      });
    } catch (error: any) {
      toast({
        title: "Errore attivazione",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeactivateProfile = async () => {
    if (!activeProfile) return;

    try {
      await deactivateProfile(activeProfile.id);
      await loadActiveProfile();
      toast({
        title: "Profilo disattivato",
        description: "Nessun profilo attivo"
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile) return;

    try {
      await deleteProfile(activeProfile.id);
      await loadActiveProfile();
      toast({
        title: "Profilo eliminato",
        description: "Profilo rimosso con successo"
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetTests = () => {
    setTestResults([]);
    setSavedProfiles(new Set());
  };

  // Sort results by speed (fastest first)
  const sortedResults = [...testResults].sort((a, b) => a.avgTime - b.avgTime);
  const fastestTime = sortedResults[0]?.avgTime || 0;

  const calculateDelta = (time: number, baseline: number) => {
    if (baseline === 0 || time === baseline) return 0;
    return ((time - baseline) / baseline) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🎯 Performance Profile Configurator</h2>
          <p className="text-sm text-muted-foreground">
            Testa diverse configurazioni e seleziona la più veloce per Quick Download e Sync
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNA A: Metodi Test */}
        <div className="space-y-4">
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold text-sm">Metodi Disponibili</h3>
            
            {TEST_METHODS.map(method => (
              <TestMethodCard
                key={method.id}
                name={method.name}
                icon={method.icon}
                description={method.description}
                onTest={() => runTest(method.id)}
                isRunning={currentTest?.startsWith(method.id) || false}
                disabled={!testSequential && !testParallel}
              />
            ))}

            <Separator className="my-4" />

            <div className="space-y-3">
              <div>
                <Label className="text-xs">📧 Emails da testare</Label>
                <Input
                  type="number"
                  value={emailCount}
                  onChange={(e) => setEmailCount(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">🔄 Execution Mode</Label>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={testSequential}
                      onCheckedChange={(checked) => setTestSequential(!!checked)}
                      id="seq"
                    />
                    <label htmlFor="seq" className="text-sm cursor-pointer">
                      Sequential
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={testParallel}
                      onCheckedChange={(checked) => setTestParallel(!!checked)}
                      id="par"
                    />
                    <label htmlFor="par" className="text-sm cursor-pointer">
                      Parallel
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={runAllTests}
              className="w-full mt-4"
              disabled={currentTest !== null || (!testSequential && !testParallel)}
            >
              🧪 Test Tutti
            </Button>
          </div>
        </div>

        {/* COLONNA B: Risultati */}
        <div className="space-y-4">
          <div className="space-y-3 p-4 rounded-lg border">
            <h3 className="font-semibold text-sm">📊 Risultati (ordinati per velocità)</h3>

            {sortedResults.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nessun test eseguito. Avvia un test per vedere i risultati.
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {sortedResults.map((result, index) => (
                    <ResultCard
                      key={result.id}
                      rank={index + 1}
                      name={result.name}
                      time={result.avgTime}
                      vsBaseline={calculateDelta(result.avgTime, fastestTime)}
                      onSave={() => saveResult(result)}
                      onActivate={() => activateResult(result)}
                      isActive={activeProfile?.profile_name === result.name}
                      isSaved={savedProfiles.has(result.id)}
                    />
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={resetTests}
                    className="flex-1"
                  >
                    🗑️ Reset
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* COLONNA C: Active Profile */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg border-2 border-primary/50 bg-primary/5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              ✅ Profilo Attivo
            </h3>

            {loadingProfile ? (
              <LoadingState message="Caricamento profilo..." size="sm" />
            ) : activeProfile ? (
              <>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <p className="font-mono font-medium">{activeProfile.profile_name}</p>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <div className="mt-1">
                        <Badge variant="secondary">
                          {activeProfile.source_test_name === 'single' ? '📧 Single' : '📦 Batch'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Batch Size</Label>
                      <p className="font-medium">
                        {activeProfile.optimization_flags.batchChunkSize || '-'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Execution Mode</Label>
                    <div className="mt-1">
                      <Badge variant={
                        activeProfile.optimization_flags.useSequentialExecution
                          ? 'outline'
                          : 'default'
                      }>
                        {activeProfile.optimization_flags.useSequentialExecution
                          ? 'Sequential'
                          : 'Parallel'
                        }
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Performance</Label>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {activeProfile.avg_response_time_ms}ms
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Statistiche</Label>
                    <p className="text-xs text-muted-foreground">
                      Usato {activeProfile.usage_count} volte
                      {activeProfile.last_used_at && (
                        <>
                          <br />
                          Ultimo: {formatDistanceToNow(new Date(activeProfile.last_used_at), {
                            addSuffix: true,
                            locale: it
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleDeactivateProfile}
                    className="flex-1"
                    size="sm"
                  >
                    Disattiva
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteProfile}
                    className="flex-1"
                    size="sm"
                  >
                    Elimina
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-4">
                Nessun profilo attivo. Esegui test e salva una configurazione.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

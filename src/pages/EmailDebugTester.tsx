/**
 * Email Debug Tester - Test side-by-side delle funzioni di importazione
 * 
 * Confronta Quick Download, Single Normal, Single Performance
 * Monitoring Edge Function, comparison table, export CSV
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { DebugConfigPanel } from '@/components/email/testing/DebugConfigPanel';
import { ComparisonTable } from '@/components/email/testing/ComparisonTable';
import { EdgeFunctionMonitor } from '@/components/email/testing/EdgeFunctionMonitor';
import { QuickDownloadTester } from '@/components/email/testing/QuickDownloadTester';
import { SingleNormalTester } from '@/components/email/testing/SingleNormalTester';
import { SinglePerformanceTester } from '@/components/email/testing/SinglePerformanceTester';
import { supabase } from '@/integrations/supabase/client';
import { PlayCircle, Settings, Download } from 'lucide-react';
import { exportTestResultsToCSV } from '@/lib/email-testing-utils';
import { useToast } from '@/hooks/use-toast';
import type { TestResult } from '@/lib/email-testing-utils';

export default function EmailDebugTester() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([
    { method: 'Quick Download', downloaded: 0, failed: 0, duration: 0, status: 'idle' },
    { method: 'Single Normal', downloaded: 0, failed: 0, duration: 0, status: 'idle' },
    { method: 'Single Performance', downloaded: 0, failed: 0, duration: 0, status: 'idle' },
  ]);
  const [isSequentialTestRunning, setIsSequentialTestRunning] = useState(false);
  const [stressTestMode, setStressTestMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.tmwe_email) {
        setUserEmail(profile.tmwe_email);
      }
    } catch (error) {
      console.error('Error loading user email:', error);
    }
  };

  const updateTestResult = (method: string, updates: Partial<TestResult>) => {
    setTestResults(prev => 
      prev.map(result => 
        result.method === method 
          ? { ...result, ...updates } 
          : result
      )
    );
  };

  const handleExportCSV = () => {
    try {
      exportTestResultsToCSV(testResults);
      toast({
        title: '✅ Export completato',
        description: 'Risultati esportati in CSV',
      });
    } catch (error) {
      toast({
        title: '❌ Errore export',
        description: 'Impossibile esportare i risultati',
        variant: 'destructive',
      });
    }
  };

  const handleSequentialTest = async () => {
    setIsSequentialTestRunning(true);
    toast({
      title: '🚀 Test sequenziale avviato',
      description: 'Esecuzione di tutti i test in sequenza...',
    });

    // Reset results
    setTestResults([
      { method: 'Quick Download', downloaded: 0, failed: 0, duration: 0, status: 'idle' },
      { method: 'Single Normal', downloaded: 0, failed: 0, duration: 0, status: 'idle' },
      { method: 'Single Performance', downloaded: 0, failed: 0, duration: 0, status: 'idle' },
    ]);

    // TODO: Implementare test sequenziale
    // Per ora mostriamo solo il toast
    setTimeout(() => {
      setIsSequentialTestRunning(false);
      toast({
        title: '⏸️ Test sequenziale non implementato',
        description: 'Usa i pulsanti Test individuali per ora',
      });
    }, 2000);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          🔬 Email Import Debug & Testing
        </h1>
        <p className="text-muted-foreground">
          Testa tutte le funzioni di importazione side-by-side per trovare la configurazione perfetta
        </p>
      </div>

      {/* Config Panel */}
      <DebugConfigPanel 
        userEmail={userEmail}
        onOpenPreferences={() => setIsPreferencesDialogOpen(true)}
      />

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button 
          onClick={handleSequentialTest}
          disabled={isSequentialTestRunning}
          size="lg"
        >
          <PlayCircle className="h-5 w-5 mr-2" />
          {isSequentialTestRunning ? 'Test in corso...' : '🚀 Test All Sequentially'}
        </Button>

        <div className="flex items-center gap-2 px-4 py-2 border rounded-md">
          <input
            type="checkbox"
            id="stress-mode"
            checked={stressTestMode}
            onChange={(e) => setStressTestMode(e.target.checked)}
            className="cursor-pointer"
          />
          <label htmlFor="stress-mode" className="text-sm cursor-pointer">
            ⚡ Stress Test Mode (100 emails)
          </label>
        </div>

        <Button 
          onClick={handleExportCSV}
          variant="outline"
          size="lg"
        >
          <Download className="h-5 w-5 mr-2" />
          Export Results CSV
        </Button>
      </div>

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <QuickDownloadTester 
          userEmail={userEmail}
          stressTestMode={stressTestMode}
          onUpdateResult={(updates) => updateTestResult('Quick Download', updates)}
        />

        <SingleNormalTester 
          userEmail={userEmail}
          stressTestMode={stressTestMode}
          onUpdateResult={(updates) => updateTestResult('Single Normal', updates)}
        />

        <SinglePerformanceTester 
          userEmail={userEmail}
          stressTestMode={stressTestMode}
          onUpdateResult={(updates) => updateTestResult('Single Performance', updates)}
        />
      </div>

      {/* Comparison Table */}
      <ComparisonTable results={testResults} />

      {/* Edge Function Monitor */}
      <EdgeFunctionMonitor />

      {/* Preferences Dialog */}
      <Dialog open={isPreferencesDialogOpen} onOpenChange={setIsPreferencesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Folder Sync Preferences</DialogTitle>
          </DialogHeader>
          {userEmail && (
            <FolderSyncPreferencesManager 
              userEmail={userEmail}
              onPreferencesChanged={() => {
                setIsPreferencesDialogOpen(false);
                toast({
                  title: '✅ Preferenze aggiornate',
                  description: 'Le modifiche saranno applicate ai prossimi test',
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

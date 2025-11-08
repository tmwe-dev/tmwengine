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
import { supabase } from '@/integrations/supabase/client';
import { Settings, Download, Activity } from 'lucide-react';
import { exportTestResultsToCSV } from '@/lib/email-testing-utils';
import { useToast } from '@/hooks/use-toast';
import type { TestResult } from '@/lib/email-testing-utils';

export default function EmailDebugTester() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult>({
    method: 'Quick Download',
    downloaded: 0,
    failed: 0,
    duration: 0,
    status: 'idle'
  });
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

  const updateTestResult = (updates: Partial<TestResult>) => {
    setTestResults(prev => ({ ...prev, ...updates }));
  };

  const handleExportCSV = () => {
    try {
      exportTestResultsToCSV([testResults]);
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

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          🚀 Quick Email Download - Production Ready
        </h1>
        <p className="text-muted-foreground">
          Sistema di download ottimizzato con retry automatico, progress real-time e gestione errori
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
          onClick={handleExportCSV}
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Results CSV
        </Button>
      </div>

      {/* Real-Time Monitoring Panel */}
      <Card className="border-2 border-primary/20">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">📊 Download Real-Time</h2>
            <Badge variant={testResults.status === 'running' ? 'default' : 'secondary'}>
              {testResults.status === 'running' ? '🔄 In corso' : testResults.status === 'success' ? '✅ Completato' : '⏸️ Pronto'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm text-muted-foreground mb-1">✅ Scaricate</p>
              <p className="text-3xl font-mono font-bold text-green-600">
                {testResults.downloaded}
              </p>
            </div>
            
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-sm text-muted-foreground mb-1">⏭️ Skipped</p>
              <p className="text-3xl font-mono font-bold text-yellow-600">
                {testResults.failed || 0}
              </p>
            </div>
            
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-muted-foreground mb-1">⏱️ Durata</p>
              <p className="text-3xl font-mono font-bold text-blue-600">
                {testResults.duration}s
              </p>
            </div>
            
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-sm text-muted-foreground mb-1">⚡ Velocità</p>
              <p className="text-3xl font-mono font-bold text-purple-600">
                {testResults.duration > 0 
                  ? (testResults.downloaded / testResults.duration).toFixed(1) 
                  : '0'
                }
                <span className="text-sm ml-1">email/s</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Download Tester */}
      <QuickDownloadTester 
        userEmail={userEmail}
        stressTestMode={false}
        onUpdateResult={updateTestResult}
      />

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

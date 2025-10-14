import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TestResult {
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  response?: any;
  emailsBeforeSync?: number;
  emailsAfterSync?: number;
  emailsSaved?: number;
  error?: string;
}

export default function EmailSyncTest() {
  const { toast } = useToast();
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const getEmailCount = async () => {
    const { count, error } = await supabase
      .from('email_messages')
      .select('*', { count: 'exact', head: true })
      .eq('cartella', 'INBOX');
    
    if (error) throw error;
    return count || 0;
  };

  const testSyncFolder = async () => {
    setIsTestingSync(true);
    const result: TestResult = {
      method: 'Metodo deprecato - non più disponibile',
      startTime: Date.now(),
    };

    try {
      result.error = 'emailSyncApi.syncFolder() è stato deprecato. Usare Edge Function invece.';
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;

      setTestResult(result);

      toast({
        title: "⚠️ Metodo Deprecato",
        description: result.error,
        variant: "destructive",
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  const testEdgeFunction = async () => {
    setIsTestingSync(true);
    const result: TestResult = {
      method: 'Edge Function: tmwe-email-sync-master',
      startTime: Date.now(),
    };

    try {
      // 1. Count emails BEFORE sync
      result.emailsBeforeSync = await getEmailCount();
      toast({
        title: "📊 Test Edge Function Started",
        description: `Email in DB prima del sync: ${result.emailsBeforeSync}`,
      });

      // 2. Execute Edge Function
      const { data, error } = await supabase.functions.invoke('tmwe-email-sync-master', {
        body: {
          mode: 'incremental',
          folder_name: 'INBOX',
          max_emails: 100
        }
      });

      if (error) throw error;
      result.response = data;

      // 3. Count emails AFTER sync
      result.emailsAfterSync = await getEmailCount();
      result.emailsSaved = result.emailsAfterSync - result.emailsBeforeSync;

      // 4. Calculate duration
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;

      setTestResult(result);

      toast({
        title: "✅ Edge Function Test Completato",
        description: `Durata: ${(result.duration / 1000).toFixed(2)}s | Email salvate: ${result.emailsSaved}`,
      });
    } catch (error: any) {
      result.error = error.message;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      setTestResult(result);

      toast({
        title: "❌ Edge Function Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Email Sync Test</h1>
        <p className="text-muted-foreground">
          Verifica quale metodo salva effettivamente le email nel database Supabase
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test emailSyncApi.syncFolder - DEPRECATO */}
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle>Test A: API TMWE (Deprecato)</CardTitle>
            <CardDescription>emailSyncApi.syncFolder() non più disponibile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testSyncFolder} 
              disabled={true}
              variant="outline"
              className="w-full"
            >
              Metodo Deprecato
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Questo metodo non salvava nel DB Supabase. Usa Edge Function.
            </p>
          </CardContent>
        </Card>

        {/* Test Edge Function */}
        <Card>
          <CardHeader>
            <CardTitle>Test B: Edge Function</CardTitle>
            <CardDescription>tmwe-email-sync-master</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testEdgeFunction} 
              disabled={isTestingSync}
              className="w-full"
            >
              {isTestingSync ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Avvia Test Edge Function'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Risultati Test: {testResult.method}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Durata</p>
                <p className="text-2xl font-bold">
                  {testResult.duration ? `${(testResult.duration / 1000).toFixed(2)}s` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Salvate nel DB</p>
                <p className="text-2xl font-bold">
                  {testResult.emailsSaved !== undefined ? testResult.emailsSaved : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Prima</p>
                <p className="text-2xl font-bold">{testResult.emailsBeforeSync || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Dopo</p>
                <p className="text-2xl font-bold">{testResult.emailsAfterSync || 0}</p>
              </div>
            </div>

            {testResult.error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm font-medium text-destructive">Errore:</p>
                <p className="text-sm text-destructive">{testResult.error}</p>
              </div>
            )}

            {testResult.response && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Response Data:</p>
                <pre className="p-4 bg-muted rounded-md overflow-auto max-h-64 text-xs">
                  {JSON.stringify(testResult.response, null, 2)}
                </pre>
              </div>
            )}

            <div className={`p-4 rounded-md ${
              testResult.emailsSaved && testResult.emailsSaved > 0 
                ? 'bg-green-500/10 border border-green-500' 
                : 'bg-orange-500/10 border border-orange-500'
            }`}>
              <p className="font-semibold">
                {testResult.emailsSaved && testResult.emailsSaved > 0 
                  ? '✅ SALVA NEL DB SUPABASE' 
                  : '⚠️ NON SALVA NEL DB SUPABASE'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

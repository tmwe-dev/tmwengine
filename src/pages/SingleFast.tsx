/**
 * SINGLE FAST PAGE - Sincronizzazione massiva email standalone
 * Pagina minimalista dedicata con log real-time
 */

import { useState } from 'react';
import { PageLayout } from '@/components/design-system/layouts/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SingleFastLogViewer } from '@/components/email/SingleFastLogViewer';
import { SingleFastDatabaseViewer } from '@/components/email/SingleFastDatabaseViewer';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { PerformanceProfileConfigurator } from '@/components/testing/PerformanceProfileConfigurator';
import { useEmailDownload } from '@/hooks/useEmailDownload';
import { EmailErrorBin } from '@/components/email/EmailErrorBin';
import { Rocket, Settings, CheckCircle, XCircle, Pause, Play, Square, Loader2, Sliders, Zap } from 'lucide-react';
import { DownloadButtonWithLabel } from '@/components/design-system/buttons/DownloadButtonWithLabel';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function SingleFast() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  
  // ✅ UNICO HOOK: useEmailDownload con LucaStrategy
  const { isRunning, logs, progress, start, stop, reset } = useEmailDownload({
    strategy: 'luca'
  });

  // Carica email utente
  useState(() => {
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from('user_profiles')
          .select('tmwe_email')
          .eq('user_id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.tmwe_email) {
              setUserEmail(profile.tmwe_email);
            }
          });
      });
    });
  });

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <Rocket className="h-8 w-8 text-primary" />
          <span>Single Fast Email Sync</span>
        </div>
      }
      description="Sincronizzazione massiva email con log real-time e tabella temporanea"
      className="bg-gradient-to-b from-background to-background/50"
    >
      <div className="space-y-6">
        {/* Indicatore Cartella Corrente & Progresso */}
        {isRunning && progress.current_folder && (
          <Card className="bg-gradient-to-r from-blue-500/20 to-green-500/20 border-blue-500 sticky top-4 z-10 shadow-lg">
            <CardContent className="py-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-1">📁 {progress.current_folder}</h3>
                    <p className="text-sm text-muted-foreground">
                      🚀 Luca Method - Download incrementale
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email Scaricate</span>
                    <span className="font-mono font-semibold">
                      {progress.imported}
                      {progress.errors > 0 && (
                        <span className="text-red-600 ml-2">
                          ({progress.errors} errori)
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress 
                    value={100} 
                    className="h-3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottoni Azioni */}
        <div className="flex gap-4 items-center flex-wrap">
          <DownloadButtonWithLabel
            label={isRunning ? 'In corso...' : '🚀 Avvia Download'}
            icon={Rocket}
            strategy="luca"
            config={{
              batchSize: 25,
              maxConcurrent: 1
            }}
            edgeFunction="tmwe-api-proxy"
            internalFunction="LucaStrategy.execute()"
            onClick={start}
            disabled={isRunning}
            size="lg"
            className="min-w-[200px]"
          />
          
          {isRunning && (
            <Button
              size="lg"
              onClick={stop}
              variant="destructive"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
          
          {!isRunning && logs.length > 0 && (
            <Button
              size="lg"
              onClick={reset}
              variant="outline"
            >
              🔄 Reset
            </Button>
          )}
          
          {/* Bottone Performance Configurator */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                disabled={isRunning}
                className="border-primary text-primary hover:bg-primary/10"
              >
                <Sliders className="h-5 w-5" />
                <span className="ml-2">Performance</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>🎯 Performance Profile Configurator</DialogTitle>
              </DialogHeader>
              <PerformanceProfileConfigurator />
            </DialogContent>
          </Dialog>
          
          {/* Bottone Cestino Errori */}
          {userEmail && <EmailErrorBin userEmail={userEmail} />}
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowPreferences(true)}
            disabled={isRunning}
            className="ml-auto"
          >
            <Settings className="h-5 w-5" />
            <span className="ml-2">Configura Cartelle</span>
          </Button>
        </div>

        {/* Database Viewer Real-Time */}
        {userEmail && (
          <SingleFastDatabaseViewer 
            userEmail={userEmail} 
            isRunning={isRunning}
          />
        )}

        {/* Log Real-Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Download Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {logs.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Nessun log disponibile
                </p>
              )}
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    log.phase === 'error' ? 'bg-destructive/10 border-destructive' :
                    log.phase === 'completed' ? 'bg-green-500/10 border-green-500' :
                    log.phase === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                    'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-mono">{log.message}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Preferenze */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚙️ Configura Cartelle Sincronizzazione</DialogTitle>
          </DialogHeader>
          {userEmail && (
            <FolderSyncPreferencesManager
              userEmail={userEmail}
              onPreferencesChanged={() => {
                setShowPreferences(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

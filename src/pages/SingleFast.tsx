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
import { useSingleFast } from '@/hooks/useSingleFast';
import { useSingleFastPerformance } from '@/hooks/useSingleFastPerformance';
import { EmailErrorBin } from '@/components/email/EmailErrorBin';
import { Rocket, Settings, CheckCircle, XCircle, Pause, Play, Square, Loader2, Sliders, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function SingleFast() {
  // 🎯 STATO: Modalità normale o performance
  const [usePerformanceMode, setUsePerformanceMode] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  
  // ⚡ HOOK NORMALE (default)
  const normalMode = useSingleFast();
  
  // 🚀 HOOK PERFORMANCE (con ParallelDownloadController)
  const performanceMode = useSingleFastPerformance();
  
  // Seleziona quale hook usare basato sulla modalità
  const activeHook = usePerformanceMode ? performanceMode : normalMode;
  
  const { 
    isRunning, 
    logs, 
    tempResults, 
    pauseState,
    currentFolder,
    currentPhase,
    progress,
    emailProgress,
    pauseProcess,
    resumeProcess,
    stopProcess
  } = activeHook;
  
  // Cast per accedere a startSingleFast o startSingleFastPerformance
  const startFunction = usePerformanceMode 
    ? (performanceMode as any).startSingleFastPerformance 
    : (normalMode as any).startSingleFast;

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
        {/* Indicatore Cartella Corrente & Progresso Globale */}
        {isRunning && currentFolder && (
          <Card className="bg-gradient-to-r from-blue-500/20 to-green-500/20 border-blue-500 sticky top-4 z-10 shadow-lg">
            <CardContent className="py-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-1">📁 {currentFolder}</h3>
                    <p className="text-sm text-muted-foreground">
                      Cartella {progress.current} di {progress.total} • {currentPhase}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar Globale */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso Cartelle</span>
                    <span className="font-mono font-semibold">
                      {progress.current}/{progress.total}
                    </span>
                  </div>
                  <Progress 
                    value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} 
                    className="h-3"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email Importate</span>
                    <span className="font-mono font-semibold">
                      {emailProgress.imported}/{emailProgress.total}
                      {emailProgress.skipped > 0 && (
                        <span className="text-yellow-600 ml-2">
                          ({emailProgress.skipped} skippate)
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress 
                    value={emailProgress.total > 0 ? (emailProgress.imported / emailProgress.total) * 100 : 0} 
                    className="h-3"
                  />
                  {emailProgress.skipped > 0 && (
                    <p className="text-xs text-yellow-600">
                      ⚠️ {emailProgress.skipped} email temporaneamente skippate (retry automatico prossima sessione)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottoni Azioni */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* Switch Modalità */}
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-card">
            <Button
              size="sm"
              variant={!usePerformanceMode ? "default" : "ghost"}
              onClick={() => setUsePerformanceMode(false)}
              disabled={isRunning}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Normale
            </Button>
            <Button
              size="sm"
              variant={usePerformanceMode ? "default" : "ghost"}
              onClick={() => setUsePerformanceMode(true)}
              disabled={isRunning}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Performance
            </Button>
          </div>
          
          {/* Badge Profilo Attivo (solo in modalità Performance) */}
          {usePerformanceMode && 'activeProfile' in activeHook && (activeHook as any).activeProfile && (
            <Badge variant="outline" className="text-sm border-primary text-primary">
              ⚡ {(activeHook as any).activeProfile.profile_name}
            </Badge>
          )}
          
          <Button
            size="lg"
            onClick={startFunction}
            disabled={isRunning}
            className="min-w-[200px]"
          >
            {isRunning ? (
              <>
                <span className="animate-spin">⏳</span>
                <span className="ml-2">In corso...</span>
              </>
            ) : (
              <>
                {usePerformanceMode ? <Zap className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
                <span className="ml-2">
                  {usePerformanceMode ? '⚡ Avvia Performance' : '🚀 Avvia Normale'}
                </span>
              </>
            )}
          </Button>
          
          {isRunning && (
            <>
              {pauseState ? (
                <Button
                  size="lg"
                  onClick={resumeProcess}
                  variant="outline"
                  className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Riprendi
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={pauseProcess}
                  variant="outline"
                  className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausa
                </Button>
              )}
              
              <Button
                size="lg"
                onClick={stopProcess}
                variant="destructive"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
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
        <SingleFastLogViewer logs={logs} />

        {/* Risultati Tabella Temporanea */}
        {tempResults.length > 0 && (
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Risultati email_temp_index
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold">Cartella</th>
                      <th className="text-left p-3 font-semibold">UIDs Preparati</th>
                      <th className="text-left p-3 font-semibold">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempResults.map((result, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                        <td className="p-3 font-mono">{result.folder}</td>
                        <td className="p-3 font-mono">{result.uids}</td>
                        <td className="p-3">
                          {result.status === 'completed' ? (
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle className="h-4 w-4" />
                              <span>Completato</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-500">
                              <XCircle className="h-4 w-4" />
                              <span>Errore</span>
                            </div>
                          )}
                          {result.errorMessage && (
                            <div className="text-xs text-red-400 mt-1">
                              {result.errorMessage}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
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

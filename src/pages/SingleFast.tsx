/**
 * SINGLE FAST PAGE - Sincronizzazione massiva email standalone
 * Pagina minimalista dedicata con log real-time
 */

import { useState } from 'react';
import { PageLayout } from '@/components/design-system/layouts/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SingleFastLogViewer } from '@/components/email/SingleFastLogViewer';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { useSingleFast } from '@/hooks/useSingleFast';
import { Rocket, Settings, CheckCircle, XCircle, Pause, Play, Square } from 'lucide-react';

export default function SingleFast() {
  const { 
    isRunning, 
    logs, 
    tempResults, 
    pauseState,
    startSingleFast, 
    pauseProcess,
    resumeProcess,
    stopProcess
  } = useSingleFast();
  const [showPreferences, setShowPreferences] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

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
        {/* Bottoni Azioni */}
        <div className="flex gap-4 items-center flex-wrap">
          <Button
            size="lg"
            onClick={startSingleFast}
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
                <Rocket className="h-5 w-5" />
                <span className="ml-2">🚀 Single Fast</span>
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

/**
 * Quick Email Downloader - Background download system
 * Componente UI completamente isolato
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  Zap,
  FolderOpen,
  CheckCircle2,
  Clock,
  Gauge,
  Settings,
  Sliders
} from 'lucide-react';
import emailFolderGif from '@/assets/email-folder-unscreen.gif';
import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { PerformanceProfileConfigurator } from '@/components/testing/PerformanceProfileConfigurator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSyncPreferences, filterFolders } from '@/lib/email-sync-preferences';
import { getActiveProfile, type PerformanceProfile } from '@/lib/performance-profiles';

interface QuickSyncStats {
  downloaded: number;
  inserted: number;
  duration: number;
  avgSpeed: number;
  errors: number;
}

interface QuickEmailDownloaderProps {
  onDownloadComplete?: (stats: QuickSyncStats) => void;
  onStatsUpdate?: (stats: Record<string, number>) => void;
  preSelectedFolders?: string[];
}

interface FolderQuickOption {
  name: string;
  display: string;
  selected: boolean;
}

export function QuickEmailDownloader({ onDownloadComplete, onStatsUpdate, preSelectedFolders = [] }: QuickEmailDownloaderProps) {
  const [quickFolders, setQuickFolders] = useState<FolderQuickOption[]>([]);
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [activeProfile, setActiveProfile] = useState<PerformanceProfile | null>(null);
  const [useTestFunction, setUseTestFunction] = useState(false); // ✅ NUOVO stato toggle
  const { toast } = useToast();
  
  // Background download hook
  const { status: bgStatus, startDownload, isDownloading, reset: resetDownload } = useBackgroundDownload();

  useEffect(() => {
    loadQuickFolders();
    loadUserEmail();
    loadActiveProfile();
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

  const loadActiveProfile = async () => {
    try {
      const profile = await getActiveProfile();
      setActiveProfile(profile);
    } catch (error) {
      console.error('Error loading active profile:', error);
    }
  };

  const handlePerformanceDialogChange = (open: boolean) => {
    setIsPerformanceDialogOpen(open);
    
    if (!open) {
      loadActiveProfile();
    }
  };

  // Sincronizza selezione quando le cartelle vengono caricate
  useEffect(() => {
    if (quickFolders.length === 0 || preSelectedFolders.length === 0) {
      return;
    }

    const updatedFolders = quickFolders.map(folder => {
      const normalizedFolderName = (folder.name || '').trim().toLowerCase();
      const shouldBeSelected = preSelectedFolders.some(pre => 
        (pre || '').trim().toLowerCase() === normalizedFolderName
      );

      return {
        ...folder,
        selected: shouldBeSelected
      };
    });

    const selectedCount = updatedFolders.filter(f => f.selected).length;

    if (selectedCount !== quickFolders.filter(f => f.selected).length) {
      setQuickFolders(updatedFolders);
    }
  }, [quickFolders, preSelectedFolders]);

  const loadQuickFolders = async () => {
    setIsQuickLoading(true);
    try {
      const quickResponse = await emailFolderApi.getFolders({ 
        include_counts: false,
        skipCache: true
      });

      const quickFoldersList = Array.isArray(quickResponse) 
        ? quickResponse 
        : (quickResponse?.data || quickResponse?.folders || []);
      
      const quickMapped = quickFoldersList.map((f: any) => {
        const folderName = f.name || f;
        const normalizedName = (folderName || '').trim().toLowerCase();
        
        return {
          name: folderName,
          display: f.display_name || folderName,
          selected: preSelectedFolders.length > 0 
            ? preSelectedFolders.some(pre => 
                (pre || '').trim().toLowerCase() === normalizedName
              )
            : (normalizedName === 'inbox')
        };
      });

      setQuickFolders(quickMapped);
      
      await loadQuickStats();

    } catch (error: any) {
      console.error('❌ Quick folders error:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile caricare le cartelle',
        variant: 'destructive',
      });
    } finally {
      setIsQuickLoading(false);
    }
  };

  const loadQuickStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return;

      const { data: allQuickEmails } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', profile.tmwe_email)
        .eq('sync_status', 'fun_email_backup');

      if (allQuickEmails) {
        const quickCounts: Record<string, number> = {};
        allQuickEmails.forEach(email => {
          const folderKey = email.cartella || 'INBOX';
          quickCounts[folderKey] = (quickCounts[folderKey] || 0) + 1;
        });
        onStatsUpdate?.(quickCounts);
      }

    } catch (error) {
      console.warn('Stats load warning:', error);
    }
  };

  const toggleQuickFolder = (folderName: string) => {
    setQuickFolders(prev =>
      prev.map(f => f.name === folderName ? { ...f, selected: !f.selected } : f)
    );
  };

  const toggleQuickSelectAll = () => {
    const allQuickSelected = quickFolders.every(f => f.selected);
    setQuickFolders(prev => prev.map(f => ({ ...f, selected: !allQuickSelected })));
  };

  const handleStartBackgroundDownload = async () => {
    const selectedFolders = quickFolders.filter(f => f.selected).map(f => f.name);
    
    if (selectedFolders.length === 0) {
      toast({
        title: '⚠️ Nessuna cartella selezionata',
        description: 'Seleziona almeno una cartella da sincronizzare',
        variant: 'destructive',
      });
      return;
    }

    if (!userEmail) {
      toast({
        title: '❌ Errore',
        description: 'Email utente non trovata',
        variant: 'destructive',
      });
      return;
    }

    // ✅ Determina quale funzione usare
    const functionName = useTestFunction 
      ? 'background-email-sync-test' 
      : 'background-email-sync';

    console.log(`🎯 [QuickDownload] Using Edge Function: ${functionName}`);

    toast({
      title: useTestFunction ? '🧪 Test Mode Attivo' : '🚀 Download Standard',
      description: useTestFunction 
        ? `Download ottimizzato di ${selectedFolders.length} cartelle (solo email nuove)...`
        : `Download completo di ${selectedFolders.length} cartelle...`,
    });

    const result = await startDownload(selectedFolders, userEmail, functionName);

    if (!result.success) {
      toast({
        title: '❌ Errore',
        description: result.error || 'Impossibile avviare il download',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadFromPreferences = async () => {
    if (!userEmail) {
      toast({
        title: '❌ Errore',
        description: 'Email utente non trovata',
        variant: 'destructive',
      });
      return;
    }

    try {
      const preferences = await getSyncPreferences(userEmail);
      
      if (!preferences || preferences.included_folders.length === 0) {
        toast({
          title: '⚠️ Nessuna preferenza configurata',
          description: 'Configura le tue preferenze prima di avviare la sincronizzazione',
          variant: 'destructive',
        });
        return;
      }

      // ✅ Determina quale funzione usare
      const functionName = useTestFunction 
        ? 'background-email-sync-test' 
        : 'background-email-sync';

      const result = await startDownload(preferences.included_folders, userEmail, functionName);

      if (!result.success) {
        toast({
          title: '❌ Errore',
          description: result.error || 'Impossibile avviare il download',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '🚀 Sync avviata',
          description: `Download di ${preferences.included_folders.length} cartelle dalle preferenze...`,
        });
      }
    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message || 'Errore durante il caricamento delle preferenze',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold">Quick Download V3</h3>
          <Badge variant="default" className="bg-yellow-500">
            ⚡ Background Mode
          </Badge>
        </div>
      </div>

      {/* Progress Card (visible durante download) */}
      {bgStatus.status !== 'idle' && (
        <Card className="border-purple-500 border-2 shadow-lg shadow-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="h-4 w-4 animate-pulse text-purple-500" />
                Download in corso
              </span>
              <Badge variant={
                bgStatus.status === 'completed' ? 'default' :
                bgStatus.status === 'error' ? 'destructive' :
                'secondary'
              }>
                {bgStatus.status === 'running' ? '⚡ In corso' :
                 bgStatus.status === 'pending' ? '⏳ Avvio' :
                 bgStatus.status === 'completed' ? '✅ Completato' :
                 bgStatus.status === 'error' ? '❌ Errore' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Progresso</span>
                <span className="text-muted-foreground">
                  {bgStatus.completedFolders.length} / {bgStatus.foldersToSync.length} cartelle
                </span>
              </div>
              <Progress 
                value={(bgStatus.completedFolders.length / bgStatus.foldersToSync.length) * 100 || 0} 
                className="h-[1px] bg-purple-100 dark:bg-purple-900" 
              />
            </div>

            {/* Cartella corrente */}
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-purple-500" />
              <span className="font-medium truncate">{bgStatus.currentFolder || 'Preparazione...'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats durante download */}
      {bgStatus.status !== 'idle' && (
        <div className="flex items-center justify-around gap-6 px-4 animate-fade-in">
          {/* Scaricate */}
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-green-500">
              {bgStatus.overallDownloaded.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Scaricate
            </div>
          </div>

          {/* GIF Animata con badge velocità */}
          <div className="relative">
            <img 
              src={emailFolderGif} 
              alt="Email downloading animation" 
              className="w-20 h-20 object-contain"
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-background px-2 py-0.5 rounded-full shadow-sm border border-purple-500/30">
              {bgStatus.speed?.toFixed(1) || '0'}/s
            </div>
          </div>

          {/* Totali */}
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-blue-500">
              {bgStatus.overallTotal.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Download className="h-3 w-3" />
              Totali
            </div>
          </div>
        </div>
      )}

      {/* Tempo stimato */}
      {bgStatus.status === 'running' && bgStatus.eta > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
          <Clock className="h-4 w-4" />
          <span className="font-medium">~{Math.round(bgStatus.eta)}s rimanenti</span>
        </div>
      )}

      {/* Sync da Preferenze */}
      {bgStatus.status === 'idle' && (
        <Card className="border-purple-500 border-2 bg-purple-50/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              Sync da Preferenze
              
              {activeProfile && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-green-500/20 text-green-400 border border-green-500/30"
                >
                  🎯 {activeProfile.profile_name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sincronizza automaticamente solo le cartelle configurate nelle preferenze.
            </p>
            
            <div className="flex gap-2">
              {/* Pulsante Performance Configurator */}
              <Dialog open={isPerformanceDialogOpen} onOpenChange={handlePerformanceDialogChange}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-primary text-primary">
                    <Sliders className="h-4 w-4" />
                    Performance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>🎯 Performance Profile Configurator</DialogTitle>
                  </DialogHeader>
                  <PerformanceProfileConfigurator />
                </DialogContent>
              </Dialog>

              {/* Pulsante Configura Preferenze */}
              <Dialog open={isPreferencesDialogOpen} onOpenChange={setIsPreferencesDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Configura
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>⚙️ Preferenze Sincronizzazione</DialogTitle>
                  </DialogHeader>
                  {userEmail && (
                    <FolderSyncPreferencesManager
                      userEmail={userEmail}
                      onPreferencesChanged={() => {
                        loadQuickFolders();
                        setIsPreferencesDialogOpen(false);
                        toast({
                          title: '✅ Preferenze salvate',
                          description: 'Le tue preferenze di sincronizzazione sono state aggiornate',
                        });
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>

              {/* Pulsante Avvia Sync */}
              <Button
                className="flex-1 border-purple-500 text-purple-600 hover:bg-purple-50"
                variant="outline"
                size="sm"
                onClick={handleDownloadFromPreferences}
                disabled={isQuickLoading || isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                Avvia Sync da Preferenze
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder Selection */}
      {bgStatus.status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Seleziona Cartelle
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleQuickSelectAll}
              >
                {quickFolders.every(f => f.selected) ? 'Deseleziona' : 'Seleziona'} tutte
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isQuickLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Caricamento cartelle...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {quickFolders.map(folder => (
                  <Button
                    key={folder.name}
                    variant={folder.selected ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => toggleQuickFolder(folder.name)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {folder.display}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Mode Toggle - PRIMA del pulsante Start */}
      {bgStatus.status === 'idle' && (
        <Card className="border-yellow-500 border-2 bg-yellow-50/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🧪</div>
                <div>
                  <p className="font-semibold text-sm">
                    Modalità Test (Pre-check Duplicati)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {useTestFunction 
                      ? '✅ Attiva - Scarica solo email nuove (più veloce)'
                      : '⚠️ Disattiva - Usa funzione standard (scarica tutto)'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={useTestFunction ? 'default' : 'outline'} className="text-xs">
                  {useTestFunction ? 'NEW 🚀' : 'OLD'}
                </Badge>
                <Switch
                  checked={useTestFunction}
                  onCheckedChange={setUseTestFunction}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
            
            {useTestFunction && (
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs">
                <strong>💡 Ottimizzazione attiva:</strong> Il sistema verifica quali email sono già presenti 
                nel database prima di scaricarle, risparmiando tempo e banda.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start Button */}
      {bgStatus.status === 'idle' && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleStartBackgroundDownload}
          disabled={isQuickLoading || isDownloading || quickFolders.filter(f => f.selected).length === 0}
        >
          {isQuickLoading ? (
            <>
              <Download className="h-5 w-5 mr-2 animate-spin" />
              Caricamento cartelle...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              Avvia Quick Download
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Quick Email Downloader - Versione semplificata con LucaStrategy
 * Migrato da loop custom progressivo (1012 righe) → useEmailDownload (250 righe)
 */

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Zap, FolderOpen, Settings, Sliders } from 'lucide-react';
import { DownloadButtonWithLabel } from '@/components/design-system/buttons/DownloadButtonWithLabel';
import emailFolderGif from '@/assets/email-folder-unscreen.gif';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { PerformanceProfileConfigurator } from '@/components/testing/PerformanceProfileConfigurator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSyncPreferences } from '@/lib/email-sync-preferences';
import { getActiveProfile, type PerformanceProfile } from '@/lib/performance-profiles';
import { RealtimeEmailInsertionMonitor } from './RealtimeEmailInsertionMonitor';
import { useEmailDownload } from '@/hooks/useEmailDownload';

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
  onDownloadStatusChange?: (isActive: boolean) => void;
}

interface FolderQuickOption {
  name: string;
  display: string;
  selected: boolean;
}

export const QuickEmailDownloader = forwardRef<
  { startDownload: (folders?: string[]) => Promise<void> }, 
  QuickEmailDownloaderProps
>(({ onDownloadComplete, onStatsUpdate, preSelectedFolders = [], onDownloadStatusChange }, ref) => {
  const [quickFolders, setQuickFolders] = useState<FolderQuickOption[]>([]);
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [activeProfile, setActiveProfile] = useState<PerformanceProfile | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ✅ NUOVO: usa useEmailDownload invece di loop custom
  const { isRunning, logs, progress, start, stop } = useEmailDownload({
    strategy: 'luca'
  });

  useEffect(() => {
    loadQuickFolders();
    loadUserEmail();
    loadActiveProfile();
  }, []);

  useEffect(() => {
    onDownloadStatusChange?.(isRunning);
  }, [isRunning, onDownloadStatusChange]);

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
    if (!open) loadActiveProfile();
  };

  useEffect(() => {
    if (quickFolders.length === 0 || preSelectedFolders.length === 0) return;

    const updatedFolders = quickFolders.map(folder => {
      const normalizedFolderName = (folder.name || '').trim().toLowerCase();
      const shouldBeSelected = preSelectedFolders.some(pre => 
        (pre || '').trim().toLowerCase() === normalizedFolderName
      );
      return { ...folder, selected: shouldBeSelected };
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
      
      let userPreferences = null;
      if (userEmail) {
        userPreferences = await getSyncPreferences(userEmail);
      }
      
      const quickMapped = quickFoldersList.map((f: any) => {
        const folderName = f.name || f;
        const normalizedName = (folderName || '').trim().toLowerCase();
        
        let isSelected = false;
        if (preSelectedFolders.length > 0) {
          isSelected = preSelectedFolders.some(pre => 
            (pre || '').trim().toLowerCase() === normalizedName
          );
        } else if (userPreferences && userPreferences.included_folders.length > 0) {
          isSelected = userPreferences.included_folders.some(inc => 
            (inc || '').trim().toLowerCase() === normalizedName
          );
        } else {
          isSelected = (normalizedName === 'inbox');
        }
        
        return {
          name: folderName,
          display: f.display_name || folderName,
          selected: isSelected
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

  // ✅ NUOVO: avvia download con cartelle selezionate
  const startDownload = async (explicitFolders?: string[]) => {
    const selectedFolders = explicitFolders || quickFolders.filter(f => f.selected).map(f => f.name);
    
    if (selectedFolders.length === 0) {
      toast({
        title: '⚠️ Nessuna cartella selezionata',
        description: 'Seleziona almeno una cartella da sincronizzare',
        variant: 'default',
      });
      return;
    }

    setStartTime(Date.now());
    await start(selectedFolders);

    // Stats finali
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const avgSpeed = duration > 0 ? Math.round(progress.imported / duration) : 0;

    onDownloadComplete?.({
      downloaded: progress.imported,
      inserted: progress.imported,
      duration,
      avgSpeed,
      errors: progress.errors
    });

    await loadQuickStats();
    queryClient.invalidateQueries({ queryKey: ['fun-email-quick-stats'] });
  };

  useImperativeHandle(ref, () => ({
    startDownload
  }));

  const progressPercent = progress.total > 0 
    ? Math.round((progress.imported / progress.total) * 100) 
    : (isRunning ? 100 : 0);

  return (
    <>
      <RealtimeEmailInsertionMonitor isActive={isRunning} userEmail={userEmail} />
      
      <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <span>Quick Email Sync</span>
            {activeProfile && (
              <Badge variant="outline" className="ml-auto">
                ⚡ {activeProfile.profile_name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning && (
            <>
              <div className="flex items-center justify-center gap-4">
                <img src={emailFolderGif} alt="Download" className="w-16 h-16" />
                <div>
                  <p className="font-semibold">📂 {progress.current_folder}</p>
                  <p className="text-sm text-muted-foreground">
                    {progress.imported} scaricate • {progress.errors} errori
                  </p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </>
          )}

          {!isRunning && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleQuickSelectAll}
                className="w-full"
              >
                {quickFolders.every(f => f.selected) ? 'Deseleziona tutto' : 'Seleziona tutto'}
              </Button>
              
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {quickFolders.map(folder => (
                  <Button
                    key={folder.name}
                    variant={folder.selected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleQuickFolder(folder.name)}
                    className="justify-start"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {folder.display}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isRunning ? (
              <>
                <DownloadButtonWithLabel
                  label="🚀 Avvia"
                  icon={Download}
                  strategy="sequential"
                  config={{ batchSize: 25 }}
                  edgeFunction="tmwe-api-proxy"
                  internalFunction="LucaStrategy.execute()"
                  onClick={() => startDownload()}
                  disabled={quickFolders.filter(f => f.selected).length === 0}
                  className="flex-1"
                />
                <Dialog open={isPreferencesDialogOpen} onOpenChange={setIsPreferencesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Preferenze Sincronizzazione</DialogTitle>
                    </DialogHeader>
                    {userEmail && (
                      <FolderSyncPreferencesManager
                        userEmail={userEmail}
                        onPreferencesChanged={() => {
                          setIsPreferencesDialogOpen(false);
                          loadQuickFolders();
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
                <Dialog open={isPerformanceDialogOpen} onOpenChange={handlePerformanceDialogChange}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Sliders className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Performance Configurator</DialogTitle>
                    </DialogHeader>
                    <PerformanceProfileConfigurator />
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Button variant="destructive" onClick={stop} className="flex-1">
                🛑 Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
});

QuickEmailDownloader.displayName = 'QuickEmailDownloader';

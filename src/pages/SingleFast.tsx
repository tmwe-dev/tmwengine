import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Settings, FolderSync, StopCircle, RotateCcw, TestTube2, Rocket, ArrowLeft, Loader2, Database, Unlock, Square, Sliders, FolderTree, Shield } from "lucide-react";
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { useEmailDownload } from '@/hooks/useEmailDownload';
import { PageLayout } from '@/components/design-system/layouts/PageLayout';
import { SplitLayout } from '@/components/design-system/layouts/SplitLayout';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { PerformanceProfileConfigurator } from '@/components/testing/PerformanceProfileConfigurator';
import { EmailErrorBin } from '@/components/email/EmailErrorBin';
import { LiveEmailViewer } from '@/components/email/LiveEmailViewer';
import { DownloadLock } from '@/lib/email/core/DownloadLock';
import { TripleStorage } from '@/lib/email/core/TripleStorage';
import { useToast } from '@/hooks/use-toast';

export default function SingleFast() {
  const navigate = useNavigate();
  const [showPreferences, setShowPreferences] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [dbStats, setDbStats] = useState<{folder: string; count: number; max_uid: number}[]>([]);
  const [lockStatus, setLockStatus] = useState<'locked' | 'free'>('free');
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'expired'>('checking');
  const { toast } = useToast();
  
  const { 
    isRunning, 
    logs, 
    progress, 
    start, 
    stop, 
    reset 
  } = useEmailDownload({
    sequenceStrategies: ['luca', 'clean'] // Rollback: Luca Strategy + Clean Strategy
  });

  const simpleDownload = useEmailDownload({
    strategy: 'simple',
    customFolders: ['INBOX', 'Sent']
  });

  const masterDownload = useEmailDownload({
    strategy: 'master',
    customFolders: ['INBOX', 'Sent']
  });

  const edgeSyncDownload = useEmailDownload({
    strategy: 'edge-sync',
    customFolders: ['INBOX', 'Sent']
  });

  const activeDownload = isRunning ? { isRunning, logs, progress } : (simpleDownload.isRunning ? simpleDownload : (masterDownload.isRunning ? masterDownload : edgeSyncDownload));
  const anyDownloadRunning = isRunning || simpleDownload.isRunning || masterDownload.isRunning || edgeSyncDownload.isRunning;

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tmwe_email')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.tmwe_email) {
          setUserEmail(profile.tmwe_email);
        }
      }
    };
    getUserEmail();
  }, []);

  // 🆕 Load DB stats and lock status
  useEffect(() => {
    if (!userEmail) return;

    const loadStats = async () => {
      // Get lock status
      const storage = new TripleStorage();
      const lock = new DownloadLock(storage);
      setLockStatus(lock.isLocked() ? 'locked' : 'free');

      // Get DB stats for main folders
      const folders = ['INBOX', 'Sent', 'Drafts'];
      const stats = [];

      for (const folder of folders) {
        const { count } = await supabase
          .from('email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_email', userEmail)
          .eq('cartella', folder);

        const { data: maxData } = await supabase
          .from('email_messages')
          .select('message_id')
          .eq('user_email', userEmail)
          .eq('cartella', folder)
          .order('message_id', { ascending: false })
          .limit(1)
          .maybeSingle();

        let max_uid = 0;
        if (maxData?.message_id) {
          const parts = maxData.message_id.split('/');
          max_uid = parseInt(parts[parts.length - 1], 10) || 0;
        }

        stats.push({ folder, count: count || 0, max_uid });
      }

      setDbStats(stats);
    };

    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [userEmail]);

  // ✅ Check TMWE token validity
  useEffect(() => {
    if (!userEmail) return;

    const checkToken = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setTokenStatus('expired');
          return;
        }
        
        const { data: creds } = await supabase
          .from('user_tmwe_credentials')
          .select('expires_at')
          .eq('email', userEmail)
          .single();
        
        if (!creds || !creds.expires_at) {
          setTokenStatus('expired');
        } else {
          const expiresAt = new Date(creds.expires_at);
          setTokenStatus(expiresAt > new Date() ? 'valid' : 'expired');
        }
      } catch (error) {
        console.error('Token check error:', error);
        setTokenStatus('expired');
      }
    };
    
    checkToken();
    const interval = setInterval(checkToken, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [userEmail]);

  const handleForceReleaseLock = () => {
    const storage = new TripleStorage();
    const lock = new DownloadLock(storage);
    lock.forceRelease();
    setLockStatus('free');
    toast({
      title: '🔓 Lock Released',
      description: 'Download lock has been force released. You can now start a new download.',
    });
  };

  const handleTestFolderTree = async () => {
    console.log('🔍 Testing Folder Tree APIs...');
    toast({
      title: 'Testing Folder APIs',
      description: 'Check browser console for detailed results',
    });

    try {
      // Test 1: getFolders with hierarchy and counts
      console.log('📁 Test 1: getFolders({ include_counts: true, hierarchy: true })');
      const folders = await emailSearchApi.getFolders({
        include_counts: true,
        hierarchy: true
      });
      console.log('✅ Folders with counts:', folders);

      // Test 2: getFolderTree
      console.log('🌳 Test 2: getFolderTree()');
      const tree = await emailSearchApi.getFolderTree();
      console.log('✅ Folder Tree:', tree);

      // Test 3: getFolderInfo for INBOX
      console.log('📮 Test 3: getFolderInfo("INBOX")');
      const inboxInfo = await emailSearchApi.getFolderInfo('INBOX');
      console.log('✅ INBOX Info:', inboxInfo);

      toast({
        title: '✅ Tests Completed',
        description: 'All folder tree tests completed successfully. Check console for details.',
      });
    } catch (error: any) {
      console.error('❌ Folder tree test error:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const relevantLogs = (isRunning ? logs : simpleDownload.logs).filter(log => 
    log.phase === 'completed' ||
    log.phase === 'importing' ||
    log.phase === 'error' ||
    (log.phase === 'preparing' && log.message.includes('FASE'))
  );

  return (
    <PageLayout 
      title="📧 Email Sync Center" 
      description="🚀 Master Strategy: Ultimate Reliability"
      backButton={
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/funnemail?tab=management')}
          title="Torna a FUN Email"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <SplitLayout
        ratio="1/3"
        gap="md"
        left={
          <div className="space-y-3">
            {/* Progress Card Minimale */}
            {(isRunning || simpleDownload.isRunning) && (progress.current_folder || simpleDownload.progress.current_folder) && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        📁 {(isRunning ? progress.current_folder : simpleDownload.progress.current_folder)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isRunning ? progress.imported : simpleDownload.progress.imported} email • {isRunning ? progress.errors : simpleDownload.progress.errors} errori
                      </p>
                    </div>
                  </div>
                  <Progress value={100} className="h-1 mt-2" />
                </CardContent>
              </Card>
            )}

            {/* 🆕 System Status Panel */}
            <Card className="border-muted">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Lock:</span>
                  <span className={lockStatus === 'locked' ? 'text-destructive font-medium' : 'text-primary'}>
                    {lockStatus === 'locked' ? '🔒 Locked' : '🔓 Free'}
                  </span>
                </div>
                {dbStats.length > 0 && (
                  <div className="space-y-1">
                    {dbStats.map(stat => (
                      <div key={stat.folder} className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{stat.folder}:</span>
                        <span className="font-mono">{stat.count} emails (max UID: {stat.max_uid})</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 🆕 Token Expiry Warning */}
            {tokenStatus === 'expired' && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="py-3 px-3">
                  <div className="flex items-start gap-2">
                    <Unlock className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-destructive">
                        Token TMWE scaduto
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Devi ri-autenticarti per scaricare email
                      </p>
                      <Button
                        size="sm"
                        onClick={() => window.location.href = '/tmwe/callback'}
                        className="mt-2 h-6 text-xs"
                      >
                        🔐 Ri-autentica
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bottoni Compatti */}
            <div className="flex flex-col gap-2">
              {/* 🆕 Force Release Lock Button */}
              {lockStatus === 'locked' && !isRunning && (
                <Button
                  size="sm"
                  onClick={handleForceReleaseLock}
                  variant="outline"
                  className="w-full justify-start h-8 text-xs border-destructive text-destructive hover:bg-destructive/10"
                >
                  <Unlock className="h-3 w-3 mr-2" />
                  🔓 Force Release Lock
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => start()}
                disabled={isRunning || simpleDownload.isRunning || tokenStatus === 'expired'}
                className="w-full justify-start h-8 text-xs"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    In corso...
                  </>
                ) : (
                  <>
                    <Rocket className="h-3 w-3 mr-2" />
                    🚀 Master Download
                  </>
                )}
              </Button>

              {/* 🆕 Simple Downloader Test Button */}
              <Button
                size="sm"
                onClick={() => simpleDownload.start()}
                disabled={isRunning || simpleDownload.isRunning || tokenStatus === 'expired'}
                variant="outline"
                className="w-full justify-start h-8 text-xs border-primary text-primary hover:bg-primary/10"
              >
                {simpleDownload.isRunning ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 mr-2" />
                    🧪 Simple Downloader Test
                  </>
                )}
              </Button>

              {/* 🆕 Folder Tree Test Button */}
              <Button
                size="sm"
                onClick={handleTestFolderTree}
                disabled={anyDownloadRunning || tokenStatus === 'expired'}
                variant="outline"
                className="w-full justify-start h-8 text-xs border-muted-foreground/30 hover:bg-muted/50"
              >
                <FolderTree className="h-3 w-3 mr-2" />
                🗂️ Test Folder Tree
              </Button>

              {/* 🆕 Edge Sync v2 Test Button */}
              <Button
                size="sm"
                onClick={() => edgeSyncDownload.start()}
                disabled={anyDownloadRunning || tokenStatus === 'expired'}
                variant="outline"
                className="w-full justify-start h-8 text-xs border-emerald-500/50 hover:bg-emerald-500/10"
              >
                <Shield className="h-3 w-3 mr-2 text-emerald-500" />
                🚀 Edge Sync v2 (Secure)
              </Button>
              
              {(isRunning || simpleDownload.isRunning) && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (isRunning) stop();
                    if (simpleDownload.isRunning) simpleDownload.stop();
                  }}
                  variant="destructive"
                  className="w-full h-8 text-xs"
                >
                  <Square className="h-3 w-3 mr-2" />
                  Stop
                </Button>
              )}
              
              {(!isRunning && !simpleDownload.isRunning && (logs.length > 0 || simpleDownload.logs.length > 0)) && (
                <Button
                  size="sm"
                  onClick={() => {
                    reset();
                    simpleDownload.reset();
                  }}
                  variant="outline"
                  className="w-full h-8 text-xs"
                >
                  Reset
                </Button>
              )}

              {/* Utilità Compatte */}
              <div className="pt-2 border-t space-y-2">
                <Dialog open={showPerformance} onOpenChange={setShowPerformance}>
                  <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isRunning || simpleDownload.isRunning}
                  className="w-full justify-start h-7 text-xs"
                    >
                      <Sliders className="h-3 w-3 mr-2" />
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
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPreferences(true)}
                  disabled={isRunning || simpleDownload.isRunning}
                  className="w-full justify-start h-7 text-xs"
                >
                  <Settings className="h-3 w-3 mr-2" />
                  Configura Cartelle
                </Button>
                
                {userEmail && <EmailErrorBin userEmail={userEmail} compact />}
              </div>
            </div>

            {/* Log Compatti */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-medium">📋 Logs</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {relevantLogs.slice(-10).reverse().map((log, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded text-[10px] font-mono ${
                          log.phase === 'error' ? 'bg-destructive/10' :
                          log.phase === 'completed' ? 'bg-primary/10' :
                          'bg-muted/50'
                        }`}
                      >
                        {log.message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        }
        right={
          <LiveEmailViewer
            userEmail={userEmail}
            isRunning={isRunning || simpleDownload.isRunning}
            importedCount={isRunning ? progress.imported : simpleDownload.progress.imported}
          />
        }
      />

      {/* Dialog Configurazione Cartelle */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurazione Cartelle Email</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-1">
            {userEmail && (
              <FolderSyncPreferencesManager
                userEmail={userEmail}
                onPreferencesChanged={() => setShowPreferences(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

/**
 * Quick Download Tester - Wrapper per testare QuickEmailDownloader
 */

import { useState, useRef } from 'react';
import { TestMethodCard } from '@/components/testing/TestMethodCard';
import type { TestResult } from '@/lib/email-testing-utils';
import { QuickEmailDownloader } from '@/components/email/QuickEmailDownloader';
import { getSyncPreferences } from '@/lib/email-sync-preferences';

interface QuickDownloadTesterProps {
  userEmail: string;
  stressTestMode: boolean;
  onUpdateResult: (updates: Partial<TestResult>) => void;
}

export function QuickDownloadTester({ 
  userEmail, 
  stressTestMode, 
  onUpdateResult 
}: QuickDownloadTesterProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ downloaded: 0, failed: 0, duration: 0 });
  const startTimeRef = useRef<number>(0);
  const quickDownloaderRef = useRef<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleStatsUpdate = (statsUpdate: Record<string, number>) => {
    const totalDownloaded = Object.values(statsUpdate).reduce((sum, val) => sum + val, 0);
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    setStats(prev => ({ ...prev, downloaded: totalDownloaded, duration }));
    
    onUpdateResult({
      status: 'running',
      downloaded: totalDownloaded,
      failed: stats.failed,
      duration
    });
    
    addLog(`📊 Downloaded: ${totalDownloaded} email`);
  };

  const handleDownloadComplete = (completeStats: any) => {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    setStats({
      downloaded: completeStats.downloaded || 0,
      failed: completeStats.errors || 0,
      duration
    });
    
    onUpdateResult({
      status: completeStats.errors > 0 ? 'error' : 'success',
      downloaded: completeStats.downloaded || 0,
      failed: completeStats.errors || 0,
      duration
    });
    
    addLog(`✅ Completato: ${completeStats.downloaded} downloaded, ${completeStats.errors} errors`);
  };

  const handleDownloadStatusChange = (isActive: boolean) => {
    setIsRunning(isActive);
    
    if (isActive) {
      startTimeRef.current = Date.now();
      setLogs([]);
      setStats({ downloaded: 0, failed: 0, duration: 0 });
      onUpdateResult({ status: 'running', downloaded: 0, failed: 0, duration: 0 });
      addLog('🚀 Quick Download avviato...');
      addLog('⚙️ Modalità: OLD LOGIC (100 batch, 10 parallel, 200ms throttle)');
    }
  };

  const handleTest = async () => {
    if (!quickDownloaderRef.current || !userEmail) return;

    // Carica le preferenze dell'utente
    const prefs = await getSyncPreferences(userEmail);
    
    // Se non ci sono cartelle configurate, usa INBOX come default
    const foldersToSync = prefs.included_folders.length > 0 
      ? prefs.included_folders 
      : ['INBOX'];

    addLog(`📂 Cartelle da sincronizzare: ${foldersToSync.length}`);
    addLog(`📋 ${foldersToSync.join(', ')}`);

    // Lancia download con le cartelle reali
    quickDownloaderRef.current.startDownload(foldersToSync);
  };

  return (
    <>
      {/* QuickEmailDownloader nascosto che fa il lavoro vero */}
      <div style={{ display: 'none' }}>
        <QuickEmailDownloader
          ref={quickDownloaderRef}
          onStatsUpdate={handleStatsUpdate}
          onDownloadComplete={handleDownloadComplete}
          onDownloadStatusChange={handleDownloadStatusChange}
          preSelectedFolders={[]}
        />
      </div>

      {/* UI visibile del test */}
      <TestMethodCard
        name="Quick Download"
        icon="⚡"
        description="OLD LOGIC - Batch 100, 10 parallel, 200ms throttle"
        onTest={handleTest}
        isRunning={isRunning}
        disabled={!userEmail}
        logs={logs}
        status={isRunning ? 'running' : (stats.downloaded > 0 ? 'success' : 'idle')}
      />
    </>
  );
}

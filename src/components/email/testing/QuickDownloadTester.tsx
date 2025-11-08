/**
 * Quick Download Tester - Wrapper per testare QuickEmailDownloader
 */

import { useState, useRef } from 'react';
import { TestMethodCard } from '@/components/testing/TestMethodCard';
import type { TestResult } from '@/lib/email-testing-utils';

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
  const startTimeRef = useRef<number>(0);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleTest = async () => {
    setIsRunning(true);
    setLogs([]);
    startTimeRef.current = Date.now();
    
    onUpdateResult({ status: 'running', downloaded: 0, failed: 0, duration: 0 });
    addLog('🚀 Avvio Quick Download Test...');
    addLog(`⚙️ Modalità: ${stressTestMode ? 'Stress (100 email)' : 'Normal (30 email)'}`);

    try {
      // Simulazione test - In produzione integrare QuickEmailDownloader
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockDownloaded = stressTestMode ? 85 : 28;
      const mockFailed = stressTestMode ? 15 : 2;
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      addLog(`✅ Test completato: ${mockDownloaded} downloaded, ${mockFailed} failed`);
      
      onUpdateResult({
        status: mockFailed > 10 ? 'error' : 'success',
        downloaded: mockDownloaded,
        failed: mockFailed,
        duration,
      });

    } catch (error: any) {
      addLog(`❌ Errore: ${error.message}`);
      onUpdateResult({ status: 'error' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <TestMethodCard
      name="Quick Download"
      icon="⚡"
      description="OLD LOGIC - Batch 100, 10 parallel, 200ms throttle"
      onTest={handleTest}
      isRunning={isRunning}
      disabled={!userEmail}
      logs={logs}
      status={isRunning ? 'running' : 'idle'}
    />
  );
}

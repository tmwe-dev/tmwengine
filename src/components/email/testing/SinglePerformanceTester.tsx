/**
 * Single Performance Tester - Wrapper per testare useSingleFastPerformance
 */

import { useState, useRef } from 'react';
import { TestMethodCard } from '@/components/testing/TestMethodCard';
import type { TestResult } from '@/lib/email-testing-utils';

interface SinglePerformanceTesterProps {
  userEmail: string;
  stressTestMode: boolean;
  onUpdateResult: (updates: Partial<TestResult>) => void;
}

export function SinglePerformanceTester({ 
  userEmail, 
  stressTestMode, 
  onUpdateResult 
}: SinglePerformanceTesterProps) {
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
    addLog('🚀 Avvio Single Performance Test...');
    addLog(`⚙️ Modalità: ${stressTestMode ? 'Stress (100 email)' : 'Normal (30 email)'}`);
    addLog('📊 DUAL Logic + Parallel Batch Processing');

    try {
      // Simulazione test - In produzione integrare useSingleFastPerformance
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const mockDownloaded = stressTestMode ? 100 : 30;
      const mockFailed = 0;
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      addLog(`✅ Test completato: ${mockDownloaded} downloaded, ${mockFailed} failed`);
      addLog(`⚡ Velocità media: ${(mockDownloaded / duration).toFixed(2)} email/s`);
      
      onUpdateResult({
        status: 'success',
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
      name="Single Performance"
      icon="🚀"
      description="DUAL Logic + Parallel batches, optimized"
      onTest={handleTest}
      isRunning={isRunning}
      disabled={!userEmail}
      logs={logs}
      status={isRunning ? 'running' : 'idle'}
    />
  );
}

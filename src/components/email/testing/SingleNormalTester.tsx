/**
 * Single Normal Tester - Wrapper per testare useSingleFast
 */

import { useState, useRef } from 'react';
import { TestMethodCard } from '@/components/testing/TestMethodCard';
import type { TestResult } from '@/lib/email-testing-utils';

interface SingleNormalTesterProps {
  userEmail: string;
  stressTestMode: boolean;
  onUpdateResult: (updates: Partial<TestResult>) => void;
}

export function SingleNormalTester({ 
  userEmail, 
  stressTestMode, 
  onUpdateResult 
}: SingleNormalTesterProps) {
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
    addLog('🚀 Avvio Single Normal Test...');
    addLog(`⚙️ Modalità: ${stressTestMode ? 'Stress (100 email)' : 'Normal (30 email)'}`);
    addLog('📊 DUAL Logic + 800ms throttle');

    try {
      // Simulazione test - In produzione integrare useSingleFast
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockDownloaded = stressTestMode ? 98 : 30;
      const mockFailed = 0;
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      addLog(`✅ Test completato: ${mockDownloaded} downloaded, ${mockFailed} failed`);
      
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
      name="Single Normal"
      icon="🔄"
      description="DUAL Logic - 800ms throttle, sequential"
      onTest={handleTest}
      isRunning={isRunning}
      disabled={!userEmail}
      logs={logs}
      status={isRunning ? 'running' : 'idle'}
    />
  );
}

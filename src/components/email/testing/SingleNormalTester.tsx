/**
 * Single Normal Tester - Wrapper per testare useSingleFast
 */

import { useState, useRef, useEffect } from 'react';
import { TestMethodCard } from '@/components/testing/TestMethodCard';
import type { TestResult } from '@/lib/email-testing-utils';
import { useSingleFast } from '@/hooks/useSingleFast';

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
  const {
    isRunning,
    logs: hookLogs,
    emailProgress,
    startSingleFast,
    stopProcess,
    pauseProcess,
    resumeProcess
  } = useSingleFast();

  const startTimeRef = useRef<number>(0);

  const handleTest = async () => {
    startTimeRef.current = Date.now();
    onUpdateResult({ status: 'running', downloaded: 0, failed: 0, duration: 0 });
    
    await startSingleFast();
  };

  // Converti logs hook in formato string[] per TestMethodCard
  const logsString = hookLogs.map(l => 
    `[${l.timestamp.toLocaleTimeString()}] ${l.message}`
  );

  // Aggiorna stats in tempo reale
  useEffect(() => {
    if (emailProgress.imported > 0 || emailProgress.skipped > 0) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      onUpdateResult({
        status: isRunning ? 'running' : 'success',
        downloaded: emailProgress.imported,
        failed: emailProgress.skipped,
        duration
      });
    }
  }, [emailProgress, isRunning, onUpdateResult]);

  return (
    <TestMethodCard
      name="Single Normal"
      icon="🔄"
      description="DUAL Logic - 800ms throttle, sequential"
      onTest={handleTest}
      onStop={stopProcess}
      onPause={pauseProcess}
      onResume={resumeProcess}
      isRunning={isRunning}
      disabled={!userEmail}
      logs={logsString}
      status={isRunning ? 'running' : (emailProgress.imported > 0 ? 'success' : 'idle')}
    />
  );
}

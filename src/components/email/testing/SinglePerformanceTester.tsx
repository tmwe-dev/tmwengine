/**
 * Single Performance Tester - Wrapper per testare useSingleFastPerformance
 */

import { useState, useRef, useEffect } from 'react';
import { TestMethodCard } from '@/components/testing/TestMethodCard';
import type { TestResult } from '@/lib/email-testing-utils';
import { useSingleFastPerformance } from '@/hooks/useSingleFastPerformance';

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
  const {
    isRunning,
    logs: hookLogs,
    emailProgress,
    activeProfile,
    startSingleFastPerformance,
    stopProcess,
    pauseProcess,
    resumeProcess
  } = useSingleFastPerformance();

  const startTimeRef = useRef<number>(0);

  const handleTest = async () => {
    startTimeRef.current = Date.now();
    onUpdateResult({ status: 'running', downloaded: 0, failed: 0, duration: 0 });
    
    await startSingleFastPerformance();
  };

  const logsString = hookLogs.map(l => 
    `[${l.timestamp.toLocaleTimeString()}] ${l.message}`
  );

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
      name="Single Performance"
      icon="🚀"
      description={`PARALLEL - ${activeProfile?.optimization_flags?.batchChunkSize || 10} concurrent`}
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

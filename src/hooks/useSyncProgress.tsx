import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SyncProgress {
  id: string;
  sync_log_id: string;
  folder_name: string;
  total_messages: number;
  processed_messages: number;
  current_batch: number;
  batch_size: number;
  status: 'in_progress' | 'completed' | 'error';
  last_offset: number;
  errors: any[];
  started_at: string;
  updated_at: string;
  completed_at?: string;
}

interface UseSyncProgressReturn {
  progress: SyncProgress | null;
  isLoading: boolean;
  error: string | null;
  percentage: number;
  estimatedTimeRemaining: number;
  startRealTimeTracking: (progressId: string) => void;
  stopRealTimeTracking: () => void;
}

export const useSyncProgress = (): UseSyncProgressReturn => {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  const percentage = progress && progress.total_messages > 0 
    ? Math.round((progress.processed_messages / progress.total_messages) * 100)
    : 0;

  const estimatedTimeRemaining = (() => {
    if (!progress || !progress.started_at || progress.processed_messages === 0) return 0;
    
    const elapsed = Date.now() - new Date(progress.started_at).getTime();
    const rate = progress.processed_messages / elapsed; // messaggi per ms
    const remaining = progress.total_messages - progress.processed_messages;
    return remaining / rate; // ms rimanenti
  })();

  const startRealTimeTracking = (progressId: string) => {
    setIsLoading(true);
    setError(null);

    // Fetch initial data
    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('email_sync_progress')
          .select('*')
          .eq('id', progressId)
          .single();

        if (error) throw error;
        setProgress({
          ...data,
          status: data.status as 'in_progress' | 'completed' | 'error'
        } as SyncProgress);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();

    // Setup real-time subscription
    const channel = supabase
      .channel('sync-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_sync_progress',
          filter: `id=eq.${progressId}`
        },
        (payload) => {
          console.log('Progress update received:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const newProgress = {
              ...payload.new,
              status: (payload.new as any).status as 'in_progress' | 'completed' | 'error'
            } as SyncProgress;
            setProgress(newProgress);
            
            // Auto-stop tracking quando completato
            if (newProgress.status === 'completed' || newProgress.status === 'error') {
              setTimeout(() => {
                setSubscription(null);
                if (subscription) {
                  supabase.removeChannel(subscription);
                }
              }, 2000);
            }
          }
        }
      )
      .subscribe();

    setSubscription(channel);
  };

  const stopRealTimeTracking = () => {
    if (subscription) {
      supabase.removeChannel(subscription);
      setSubscription(null);
    }
    setProgress(null);
  };

  useEffect(() => {
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [subscription]);

  return {
    progress,
    isLoading,
    error,
    percentage,
    estimatedTimeRemaining,
    startRealTimeTracking,
    stopRealTimeTracking
  };
};
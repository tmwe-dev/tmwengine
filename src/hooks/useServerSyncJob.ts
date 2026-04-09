import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SyncJob {
  id: string;
  user_id: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  folders: string[];
  current_folder: string | null;
  total_to_download: number;
  downloaded_count: number;
  skipped_count: number;
  error_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useServerSyncJob() {
  const [job, setJob] = useState<SyncJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load active job on mount
  useEffect(() => {
    loadActiveJob();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const loadActiveJob = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from('email_sync_jobs')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['running', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error loading active job:', fetchError);
      return;
    }

    if (data) {
      const typedJob = data as unknown as SyncJob;
      setJob(typedJob);
      subscribeToJob(typedJob.id);
    }
  }, []);

  const subscribeToJob = useCallback((jobId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`sync-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_sync_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const updated = payload.new as unknown as SyncJob;
          setJob(updated);
          if (updated.status === 'completed' || updated.status === 'error') {
            setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
              }
            }, 3000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  const startJob = useCallback(async (folders: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('email_sync_jobs')
        .insert({
          user_id: user.id,
          status: 'running',
          folders,
          total_to_download: 0,
          downloaded_count: 0,
          skipped_count: 0,
          error_count: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const typedJob = data as unknown as SyncJob;
      setJob(typedJob);
      subscribeToJob(typedJob.id);

      // Trigger the worker edge function
      supabase.functions.invoke('email-sync-worker', {
        body: { job_id: typedJob.id }
      }).catch(err => console.error('Worker invocation error:', err));

      return typedJob;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [subscribeToJob]);

  const pauseJob = useCallback(async () => {
    if (!job) return;
    await supabase
      .from('email_sync_jobs')
      .update({ status: 'paused' })
      .eq('id', job.id);
  }, [job]);

  const resumeJob = useCallback(async () => {
    if (!job) return;
    await supabase
      .from('email_sync_jobs')
      .update({ status: 'running' })
      .eq('id', job.id);
    
    subscribeToJob(job.id);

    supabase.functions.invoke('email-sync-worker', {
      body: { job_id: job.id }
    }).catch(err => console.error('Worker resume error:', err));
  }, [job, subscribeToJob]);

  const stopJob = useCallback(async () => {
    if (!job) return;
    await supabase
      .from('email_sync_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', job.id);
  }, [job]);

  const clearJob = useCallback(() => {
    setJob(null);
    setError(null);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const percentage = job && job.total_to_download > 0
    ? Math.round((job.downloaded_count / job.total_to_download) * 100)
    : 0;

  return {
    job,
    isLoading,
    error,
    percentage,
    startJob,
    pauseJob,
    resumeJob,
    stopJob,
    clearJob,
    isActive: job?.status === 'running' || job?.status === 'paused',
  };
}

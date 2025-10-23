import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CallAnalyticsParams {
  callType: 'audio' | 'video';
  callerId: string;
  calleeId: string;
  roomId?: string;
}

interface CallAnalytics {
  logId: string | null;
  startCall: () => Promise<void>;
  updateStatus: (status: 'ringing' | 'connected' | 'ended' | 'failed' | 'rejected', errorMessage?: string) => Promise<void>;
  endCall: (durationSeconds?: number) => Promise<void>;
  incrementIceCandidates: () => void;
  setVideoQuality: (quality: 'low' | 'medium' | 'high' | 'auto') => void;
}

export const useCallAnalytics = (params: CallAnalyticsParams): CallAnalytics => {
  const [logId, setLogId] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const connectionTimeRef = useRef<number | null>(null);
  const iceCandidatesCount = useRef(0);
  const videoQualityRef = useRef<'low' | 'medium' | 'high' | 'auto'>('auto');

  const startCall = useCallback(async () => {
    startTimeRef.current = Date.now();
    
    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        call_type: params.callType,
        caller_id: params.callerId,
        callee_id: params.calleeId,
        room_id: params.roomId,
        status: 'initiated',
        ice_candidates_count: 0,
        video_quality: params.callType === 'video' ? videoQualityRef.current : null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[CallAnalytics] ❌ Error creating log:', error);
      return;
    }

    if (data) {
      setLogId(data.id);
      console.log('[CallAnalytics] ✅ Call log created:', data.id);
    }
  }, [params.callType, params.callerId, params.calleeId, params.roomId]);

  const updateStatus = useCallback(async (
    status: 'ringing' | 'connected' | 'ended' | 'failed' | 'rejected',
    errorMessage?: string
  ) => {
    if (!logId) {
      console.warn('[CallAnalytics] ⚠️ No log ID, skipping status update');
      return;
    }

    const updates: any = { status };

    // Traccia tempo di connessione al primo "connected"
    if (status === 'connected' && startTimeRef.current && !connectionTimeRef.current) {
      connectionTimeRef.current = Date.now() - startTimeRef.current;
      updates.connection_time_ms = connectionTimeRef.current;
      console.log('[CallAnalytics] 📊 Connection time:', connectionTimeRef.current, 'ms');
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', logId);

    if (error) {
      console.error('[CallAnalytics] ❌ Error updating status:', error);
    } else {
      console.log('[CallAnalytics] ✅ Status updated:', status);
    }
  }, [logId]);

  const endCall = useCallback(async (durationSeconds?: number) => {
    if (!logId) {
      console.warn('[CallAnalytics] ⚠️ No log ID, skipping end call');
      return;
    }

    const calculatedDuration = durationSeconds || 
      (startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0);

    const { error } = await supabase
      .from('call_logs')
      .update({
        status: 'ended',
        duration_seconds: calculatedDuration,
        ice_candidates_count: iceCandidatesCount.current,
        video_quality: params.callType === 'video' ? videoQualityRef.current : null,
      })
      .eq('id', logId);

    if (error) {
      console.error('[CallAnalytics] ❌ Error ending call:', error);
    } else {
      console.log('[CallAnalytics] ✅ Call ended, duration:', calculatedDuration, 's');
    }

    // Reset
    setLogId(null);
    startTimeRef.current = null;
    connectionTimeRef.current = null;
    iceCandidatesCount.current = 0;
  }, [logId, params.callType]);

  const incrementIceCandidates = useCallback(() => {
    iceCandidatesCount.current++;
  }, []);

  const setVideoQuality = useCallback((quality: 'low' | 'medium' | 'high' | 'auto') => {
    videoQualityRef.current = quality;
  }, []);

  return {
    logId,
    startCall,
    updateStatus,
    endCall,
    incrementIceCandidates,
    setVideoQuality,
  };
};

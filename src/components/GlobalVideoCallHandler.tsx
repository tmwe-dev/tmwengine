import { useEffect, useState } from 'react';
import { NativeVideoCallDialog } from './intranet/NativeVideoCallDialog';
import { supabase } from '@/integrations/supabase/client';

interface VideoCallState {
  targetUserId: string;
  targetUserName: string;
  roomId: string;
  isIncoming: boolean;
}

export const GlobalVideoCallHandler = () => {
  const [currentUserId, setCurrentUserId] = useState('');
  const [videoCallState, setVideoCallState] = useState<VideoCallState | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || '');
    });

    const handleOpenVideoCall = async (event: Event) => {
      const customEvent = event as CustomEvent<VideoCallState>;
      console.log('[GlobalVideoCallHandler] 📹 Opening video call dialog:', customEvent.detail);
      
      if (videoCallState) {
        console.warn('[GlobalVideoCallHandler] ⚠️ Already in a call, rejecting');
        
        const channel = supabase.channel(`user-calls-${customEvent.detail.targetUserId}`);
        await channel.subscribe();
        await channel.send({
          type: 'broadcast',
          event: 'call-rejected',
          payload: { from: currentUserId, to: customEvent.detail.targetUserId, reason: 'busy' }
        });
        await channel.unsubscribe();
        return;
      }
      
      setVideoCallState(customEvent.detail);
    };

    window.addEventListener('open-video-call-dialog', handleOpenVideoCall);

    return () => {
      window.removeEventListener('open-video-call-dialog', handleOpenVideoCall);
    };
  }, [videoCallState]);

  if (!videoCallState || !currentUserId) return null;

  return (
    <NativeVideoCallDialog
      isOpen={true}
      onClose={() => {
        console.log('[GlobalVideoCallHandler] Closing video call dialog');
        setVideoCallState(null);
        sessionStorage.removeItem('acceptedVideoCall');
        sessionStorage.removeItem('pendingIncomingCall');
        sessionStorage.removeItem('callAccepted');
      }}
      targetUserId={videoCallState.targetUserId}
      targetUserName={videoCallState.targetUserName}
      currentUserId={currentUserId}
      roomId={videoCallState.roomId}
      isIncoming={videoCallState.isIncoming}
    />
  );
};

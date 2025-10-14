import { useEffect, useState } from 'react';
import { useGlobalCallHandler } from '@/hooks/useGlobalCallHandler';
import { IncomingCallDialog } from '@/components/call/IncomingCallDialog';
import { supabase } from '@/integrations/supabase/client';

export const GlobalCallHandler = ({ children }: { children: React.ReactNode }) => {
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || '');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || '');
    });

    return () => subscription.unsubscribe();
  }, []);

  const { incomingCall, acceptCall, rejectCall } = useGlobalCallHandler(currentUserId);

  return (
    <>
      <IncomingCallDialog
        isOpen={!!incomingCall}
        callerName={incomingCall?.callerName || ''}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
      {children}
    </>
  );
};

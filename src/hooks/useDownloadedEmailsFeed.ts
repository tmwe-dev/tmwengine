import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedEmail {
  id: string;
  subject: string | null;
  sender: string | null;
  folder_name: string | null;
  created_at: string;
}

export function useDownloadedEmailsFeed(limit = 50) {
  const [realtimeEmails, setRealtimeEmails] = useState<FeedEmail[]>([]);

  const query = useQuery({
    queryKey: ['downloaded-emails-feed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_messages')
        .select('id, subject, sender, folder_name, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as FeedEmail[];
    },
  });

  // Realtime INSERT subscription
  useEffect(() => {
    const channel = supabase
      .channel('email-feed-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_messages',
        },
        (payload) => {
          const newEmail = payload.new as FeedEmail;
          setRealtimeEmails(prev => [newEmail, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  // Merge realtime with query data
  const allEmails = [...realtimeEmails, ...(query.data ?? [])];
  const uniqueEmails = Array.from(
    new Map(allEmails.map(e => [e.id, e])).values()
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return {
    emails: uniqueEmails,
    isLoading: query.isLoading,
    error: query.error,
  };
}

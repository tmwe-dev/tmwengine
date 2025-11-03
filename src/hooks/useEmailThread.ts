import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cleanSubject, sortEmailsByDate } from '@/lib/email-thread-utils';
import { subDays } from 'date-fns';

const THREAD_PAGE_SIZE = 20;
const THREAD_TIME_WINDOW_DAYS = 30;

interface UseEmailThreadOptions {
  emailId?: string;
  initialLimit?: number;
}

interface EmailThreadResult {
  emails: any[];
  totalCount: number;
  currentEmailIndex: number;
  hasMore: boolean;
  isLoading: boolean;
}

export const useEmailThread = (
  options: UseEmailThreadOptions
): EmailThreadResult & { loadMore: () => void } => {
  const { emailId, initialLimit = THREAD_PAGE_SIZE } = options;
  const [limit, setLimit] = useState(initialLimit);

  const { data, isLoading } = useQuery({
    queryKey: ['email-thread', emailId, limit],
    queryFn: async () => {
      if (!emailId) return { emails: [], totalCount: 0, currentEmailIndex: -1 };

      // 1. Recupera l'email corrente
      const { data: currentEmail, error: currentError } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', emailId)
        .single();

      if (currentError || !currentEmail) {
        console.error('Error fetching current email:', currentError);
        return { emails: [], totalCount: 0, currentEmailIndex: -1 };
      }

      // 2. Pulisce il subject per il matching
      const cleaned = cleanSubject(currentEmail.subject);
      const timeWindowStart = subDays(
        new Date(currentEmail.data_ricezione),
        THREAD_TIME_WINDOW_DAYS
      );

      // 3. Estrai tutti i partecipanti (mittente + destinatari)
      const participants = new Set<string>();
      participants.add(currentEmail.from_email);

      // Aggiungi destinatari (gestisci sia string che array)
      if (currentEmail.to_email) {
        if (Array.isArray(currentEmail.to_email)) {
          currentEmail.to_email.forEach((email: string) => participants.add(email));
        } else if (typeof currentEmail.to_email === 'string') {
          participants.add(currentEmail.to_email);
        }
      }

      // Costruisci filtro OR dinamico per tutti i partecipanti
      const orFilters = Array.from(participants)
        .flatMap(participant => [
          `from_email.eq.${participant}`,
          `to_email.ilike.*${participant}*`
        ])
        .join(',');

      // 4. Query fuzzy con time window + filtro TUTTI i partecipanti
      const { data: threadEmails, error: threadError, count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact' })
        .ilike('subject', `%${cleaned}%`)
        .gte('data_ricezione', timeWindowStart.toISOString())
        .or(orFilters)
        .order('data_ricezione', { ascending: true })
        .limit(limit);

      if (threadError) {
        console.error('Error fetching thread:', threadError);
        return { 
          emails: [currentEmail], 
          totalCount: 1, 
          currentEmailIndex: 0 
        };
      }

      // 4. Ordina e trova l'indice dell'email corrente
      const sortedEmails = sortEmailsByDate(threadEmails || []);
      const currentIndex = sortedEmails.findIndex(
        e => e.id === emailId
      );

      return {
        emails: sortedEmails,
        totalCount: count || sortedEmails.length,
        currentEmailIndex: currentIndex >= 0 ? currentIndex : 0
      };
    },
    enabled: !!emailId,
    staleTime: 5 * 60 * 1000, // 5 minuti
    gcTime: 30 * 60 * 1000 // 30 minuti
  });

  return {
    emails: data?.emails || [],
    totalCount: data?.totalCount || 0,
    currentEmailIndex: data?.currentEmailIndex || 0,
    hasMore: (data?.totalCount || 0) > limit,
    isLoading,
    loadMore: () => setLimit(prev => prev + THREAD_PAGE_SIZE)
  };
};

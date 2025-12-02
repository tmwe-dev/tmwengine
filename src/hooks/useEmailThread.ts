import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cleanSubject, sortEmailsByDate } from '@/lib/email-thread-utils';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { subDays } from 'date-fns';

const THREAD_PAGE_SIZE = 20;
const THREAD_TIME_WINDOW_DAYS = 30;

interface UseEmailThreadOptions {
  emailId?: string;
  tmweEmailId?: number;  // 🆕 TMWE API email_id for Zero-Sync
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
  const { emailId, tmweEmailId, initialLimit = THREAD_PAGE_SIZE } = options;
  const [limit, setLimit] = useState(initialLimit);

  const { data, isLoading } = useQuery({
    queryKey: ['email-thread', emailId, tmweEmailId, limit],
    queryFn: async () => {
      // 🆕 ZERO-SYNC: Try TMWE API first if tmweEmailId is available
      if (tmweEmailId) {
        console.log('🌐 [useEmailThread] Using TMWE API (Zero-Sync mode)');
        return await fetchThreadFromTMWEApi(tmweEmailId, limit);
      }

      // Fallback: Legacy local DB query
      if (!emailId) return { emails: [], totalCount: 0, currentEmailIndex: -1 };
      
      console.log('⚠️ [useEmailThread] Using legacy DB (no tmweEmailId)');
      return await fetchThreadFromLocalDB(emailId, limit);
    },
    enabled: !!emailId || !!tmweEmailId,
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

// 🆕 TMWE API Thread Fetching (Zero-Sync Architecture)
async function fetchThreadFromTMWEApi(tmweEmailId: number, limit: number) {
  try {
    // 1. Get the current email detail from TMWE API
    const emailResponse = await emailSearchApi.getEmailDetail({
      email_id: tmweEmailId,
      include_body: true,
      timeout: 15
    });

    if (!emailResponse?.success || !emailResponse?.email) {
      console.error('❌ [useEmailThread] TMWE API email not found');
      return { emails: [], totalCount: 0, currentEmailIndex: -1 };
    }

    const currentEmail = emailResponse.email;
    const cleaned = cleanSubject(currentEmail.subject || '');
    
    // 2. Search for related emails in the thread
    const searchResponse = await emailSearchApi.searchEmails({
      query: cleaned,
      limit: limit,
      timeout: 15
    });

    const threadEmails = searchResponse?.emails || [];
    
    // 3. Filter by participants (sender/recipient match)
    const participants = new Set<string>();
    participants.add(currentEmail.from?.email || currentEmail.from_email || '');
    
    if (currentEmail.to) {
      const toEmails = Array.isArray(currentEmail.to) ? currentEmail.to : [currentEmail.to];
      toEmails.forEach((t: any) => {
        const email = typeof t === 'string' ? t : t?.email;
        if (email) participants.add(email);
      });
    }

    // Filter and deduplicate
    const filteredEmails = threadEmails.filter((email: any) => {
      const fromEmail = email.from?.email || email.from_email || '';
      return participants.has(fromEmail) || 
             email.email_id === tmweEmailId;
    });

    // Ensure current email is included
    const hasCurrentEmail = filteredEmails.some((e: any) => e.email_id === tmweEmailId);
    if (!hasCurrentEmail) {
      filteredEmails.unshift(currentEmail);
    }

    // 4. Normalize and sort emails
    const normalizedEmails = filteredEmails.map((email: any) => ({
      id: email.email_id?.toString() || email.id,
      tmwe_email_id: email.email_id,
      subject: email.subject,
      from_email: email.from?.email || email.from_email,
      to_email: email.to,
      body_text: email.body_text || email.snippet,
      body_html: email.body_html,
      data_ricezione: email.date || email.received_at,
      has_attachments: email.has_attachments,
      folder_name: email.folder || email.folder_name
    }));

    // Sort by date (newest first)
    const sortedEmails = normalizedEmails.sort((a: any, b: any) => 
      new Date(b.data_ricezione).getTime() - new Date(a.data_ricezione).getTime()
    );

    const currentIndex = sortedEmails.findIndex(
      (e: any) => e.tmwe_email_id === tmweEmailId
    );

    console.log('✅ [useEmailThread] TMWE thread loaded:', {
      totalEmails: sortedEmails.length,
      currentIndex
    });

    return {
      emails: sortedEmails,
      totalCount: sortedEmails.length,
      currentEmailIndex: currentIndex >= 0 ? currentIndex : 0
    };
  } catch (error) {
    console.error('❌ [useEmailThread] TMWE API error:', error);
    return { emails: [], totalCount: 0, currentEmailIndex: -1 };
  }
}

// 🚫 ZERO-SYNC: Legacy local DB fallback removed
// All thread functionality now requires tmwe_email_id
async function fetchThreadFromLocalDB(emailId: string, limit: number) {
  console.warn('⚠️ [useEmailThread] Legacy DB access attempted - Zero-Sync requires tmwe_email_id');
  console.warn('📌 [useEmailThread] Thread view requires emails to be fetched via TMWE API');
  
  return {
    emails: [],
    totalCount: 0,
    currentEmailIndex: -1,
    note: 'Thread view requires tmwe_email_id (Zero-Sync architecture)'
  };
}

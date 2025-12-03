/**
 * useSmartInboxZeroSync - Zero-Sync Smart Inbox Hook
 * 
 * ✅ Fetches emails directly from TMWE API (no local sync)
 * ✅ Uses tmwe_classifications for classification data
 * ✅ On-demand classification for unclassified emails
 * ✅ Pagination and group filtering
 * 
 * PROTECTED: Uses TMWEApiClient (do not modify)
 * 
 * BACKUP: 2025-12-03
 */

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { ClassificationApi, TMWEClassification } from '@/lib/tmwe/api/ClassificationApi';
import { useUserEmail } from '@/hooks/useUserEmail';
import { useState, useMemo, useCallback } from 'react';

// Types
export interface SmartInboxEmail {
  tmwe_email_id: number;
  subject: string;
  from_email: string;
  from_name?: string;
  date: string;
  is_read: boolean;
  has_attachments: boolean;
  folder_name: string;
  body_preview?: string;
  // Classification data
  classification?: TMWEClassification | null;
  is_classified: boolean;
  is_classifying?: boolean;
}

export interface SmartInboxFilters {
  folder: string;
  group_name?: string | null;
  unread_only?: boolean;
  search_query?: string;
}

export interface GroupStats {
  group_name: string;
  count: number;
  unread: number;
}

const PAGE_SIZE = 30;

/**
 * Main hook for Zero-Sync Smart Inbox
 */
export const useSmartInboxZeroSync = (filters: SmartInboxFilters) => {
  const queryClient = useQueryClient();
  const { data: userEmail, isLoading: userEmailLoading } = useUserEmail();
  const [classifyingIds, setClassifyingIds] = useState<Set<number>>(new Set());

  // =========================================================================
  // 1. Fetch emails from TMWE API with pagination
  // =========================================================================
  const {
    data: emailsData,
    isLoading: emailsLoading,
    error: emailsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchEmails,
  } = useInfiniteQuery({
    queryKey: ['smart-inbox-emails', filters.folder, filters.search_query, filters.unread_only],
    queryFn: async ({ pageParam = 1 }) => {
      if (filters.search_query) {
        return emailSearchApi.searchEmails({
          query: filters.search_query,
          search_folder: filters.folder,
          page: pageParam,
          limit: PAGE_SIZE,
        });
      }
      
      return emailSearchApi.getEmailsMetadata({
        folder: filters.folder,
        page: pageParam,
        limit: PAGE_SIZE,
        is_seen: filters.unread_only ? false : undefined,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const pagination = lastPage?.pagination;
      if (!pagination) return undefined;
      const currentPage = pagination.page || allPages.length;
      const totalPages = pagination.total_pages || Math.ceil((pagination.total || 0) / PAGE_SIZE);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userEmail,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // =========================================================================
  // 2. Fetch all user classifications from tmwe_classifications
  // =========================================================================
  const {
    data: classifications,
    isLoading: classificationsLoading,
    refetch: refetchClassifications,
  } = useQuery({
    queryKey: ['tmwe-classifications', userEmail],
    queryFn: () => ClassificationApi.getByUser(userEmail!, 500),
    enabled: !!userEmail,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create a map for O(1) lookup
  const classificationsMap = useMemo(() => {
    const map = new Map<number, TMWEClassification>();
    (classifications || []).forEach(c => map.set(c.tmwe_email_id, c));
    return map;
  }, [classifications]);

  // =========================================================================
  // 3. Merge emails with classifications
  // =========================================================================
  const allEmails = useMemo(() => {
    const pages = emailsData?.pages || [];
    const rawEmails: SmartInboxEmail[] = [];

    pages.forEach(page => {
      const emails = page?.results || page?.emails || [];
      emails.forEach((email: any) => {
        const tmwe_email_id = email.email_id || email.id;
        if (!tmwe_email_id) return;

        const classification = classificationsMap.get(tmwe_email_id) || null;
        
        rawEmails.push({
          tmwe_email_id,
          subject: email.subject || '(Sin asunto)',
          from_email: email.from_email || email.from?.email || '',
          from_name: email.from_name || email.from?.name,
          date: email.date || email.received_date,
          is_read: email.is_seen ?? email.read ?? false,
          has_attachments: email.has_attachments ?? false,
          folder_name: email.folder_name || email.folder || filters.folder,
          body_preview: email.body_preview || email.snippet,
          classification,
          is_classified: !!classification,
          is_classifying: classifyingIds.has(tmwe_email_id),
        });
      });
    });

    return rawEmails;
  }, [emailsData, classificationsMap, classifyingIds, filters.folder]);

  // =========================================================================
  // 4. Filter by group_name if specified
  // =========================================================================
  const filteredEmails = useMemo(() => {
    if (!filters.group_name) return allEmails;
    return allEmails.filter(email => 
      email.classification?.group_name === filters.group_name
    );
  }, [allEmails, filters.group_name]);

  // =========================================================================
  // 5. Calculate group statistics
  // =========================================================================
  const groupStats = useMemo((): GroupStats[] => {
    const statsMap = new Map<string, { count: number; unread: number }>();
    
    // Add "Todos" first
    statsMap.set('__all__', { count: allEmails.length, unread: allEmails.filter(e => !e.is_read).length });
    
    // Add "Sin clasificar"
    const unclassified = allEmails.filter(e => !e.is_classified);
    statsMap.set('__unclassified__', { count: unclassified.length, unread: unclassified.filter(e => !e.is_read).length });
    
    // Group by classification
    allEmails.forEach(email => {
      if (email.classification?.group_name) {
        const name = email.classification.group_name;
        const existing = statsMap.get(name) || { count: 0, unread: 0 };
        existing.count++;
        if (!email.is_read) existing.unread++;
        statsMap.set(name, existing);
      }
    });

    return Array.from(statsMap.entries()).map(([group_name, stats]) => ({
      group_name,
      ...stats,
    }));
  }, [allEmails]);

  // =========================================================================
  // 6. On-demand classification mutation
  // =========================================================================
  const classifyMutation = useMutation({
    mutationFn: async (email: SmartInboxEmail) => {
      if (!userEmail) throw new Error('User email not available');
      
      // Mark as classifying
      setClassifyingIds(prev => new Set(prev).add(email.tmwe_email_id));
      
      try {
        // Call AI classification edge function
        const { data, error } = await fetch(
          `https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/tmwe-email-ai-classify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A',
            },
            body: JSON.stringify({
              email_id: email.tmwe_email_id,
              subject: email.subject,
              from_email: email.from_email,
              body_preview: email.body_preview,
              user_email: userEmail,
            }),
          }
        ).then(r => r.json());

        if (error) throw new Error(error);
        
        // Save classification to tmwe_classifications
        const classification = await ClassificationApi.create({
          tmwe_email_id: email.tmwe_email_id,
          user_email: userEmail,
          sender_email: email.from_email,
          subject: email.subject,
          group_name: data?.group_name || 'General',
          group_type: data?.group_type || 'auto',
          ai_model: data?.model || 'unknown',
          confidence: data?.confidence,
          reasoning: data?.reasoning,
        });

        return classification;
      } finally {
        setClassifyingIds(prev => {
          const next = new Set(prev);
          next.delete(email.tmwe_email_id);
          return next;
        });
      }
    },
    onSuccess: () => {
      // Refresh classifications
      queryClient.invalidateQueries({ queryKey: ['tmwe-classifications'] });
    },
  });

  // =========================================================================
  // 7. Batch classification
  // =========================================================================
  const classifyBatch = useCallback(async (emails: SmartInboxEmail[]) => {
    const unclassified = emails.filter(e => !e.is_classified && !e.is_classifying);
    
    // Classify in batches of 5 to avoid overwhelming the API
    const BATCH_SIZE = 5;
    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
      const batch = unclassified.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(email => classifyMutation.mutateAsync(email)));
    }
  }, [classifyMutation]);

  // =========================================================================
  // 8. Refresh all data
  // =========================================================================
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchEmails(),
      refetchClassifications(),
    ]);
  }, [refetchEmails, refetchClassifications]);

  return {
    // Data
    emails: filteredEmails,
    allEmails,
    groupStats,
    classificationsMap,
    
    // Loading states
    isLoading: emailsLoading || classificationsLoading || userEmailLoading,
    isLoadingMore: isFetchingNextPage,
    isClassifying: classifyingIds.size > 0,
    classifyingCount: classifyingIds.size,
    
    // Error state
    error: emailsError,
    
    // Pagination
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    
    // Actions
    classifyEmail: classifyMutation.mutate,
    classifyBatch,
    refreshAll,
    
    // User email
    userEmail,
  };
};

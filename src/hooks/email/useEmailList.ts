/**
 * Hook for fetching and managing email list with pagination
 * ✅ REFACTORED: Uses ONLY email_search API (no Supabase sync required)
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { mapApiEmailToComponent } from '@/lib/email/email-transformers';

interface UseEmailListParams {
  selectedFolder: string;
  searchQuery: string;
  selectedSender: string | null;
}

export const useEmailList = ({ selectedFolder, searchQuery, selectedSender }: UseEmailListParams) => {
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedFolder, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        let result;
        // ✅ Use searchEmails for search queries, getEmailsMetadata for listing
        if (searchQuery) {
          // Full-text search with Elasticsearch
          result = await emailSearchApi.searchEmails({ 
            query: searchQuery, 
            search_folder: selectedFolder,
            page: pageParam,
            limit: 30
          });
        } else {
          // ✅ List emails from MySQL (faster and always up-to-date)
          result = await emailSearchApi.getEmailsMetadata({
            folder: selectedFolder,
            page: pageParam,
            limit: 30
          });
        }
        
        return result;
      } catch (error) {
        console.error('❌ [API ERROR] email_search failed:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const pagination = lastPage?.pagination;
      
      if (!pagination) return undefined;
      
      const currentPage = pagination.page || allPages.length;
      const totalPages = pagination.total_pages || Math.ceil(
        (pagination.total || 0) / (pagination.limit || 30)
      );
      
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    refetchOnMount: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const emailsFromPages = (messagesData?.pages || []).flatMap(page => {
    const messages = page?.results || page?.emails || [];
    if (!Array.isArray(messages)) return [];
    return messages.map(mapApiEmailToComponent);
  });

  const emails = selectedSender 
    ? emailsFromPages.filter(email => email.from === selectedSender)
    : emailsFromPages;

  // ✅ Extract folder stats from first page metadata (avoid duplicate API calls)
  const folderStats = messagesData?.pages?.[0]?.metadata ? {
    total: messagesData.pages[0].metadata.total_messages || 0,
    unread: messagesData.pages[0].metadata.unseen_count || 0,
    flagged: messagesData.pages[0].metadata.flagged_count || 0,
    size_bytes: messagesData.pages[0].metadata.size_bytes || 0,
    folder_name: messagesData.pages[0].metadata.folder_name || selectedFolder,
  } : null;

  return {
    emails,
    emailsFromPages,
    loading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    folderStats, // ✅ Return folder stats to avoid duplicate calls
  };
};

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
      console.log('🚀 [API CALL] Fetching emails from email_search API:', {
        folder: selectedFolder,
        searchQuery,
        page: pageParam,
        timestamp: new Date().toISOString()
      });
      
      try {
        let result;
        // ✅ ALWAYS use email_search API (MySQL + Elasticsearch)
        if (searchQuery) {
          // Full-text search with Elasticsearch
          result = await emailSearchApi.searchEmails({ 
            query: searchQuery, 
            search_folder: selectedFolder,
            page: pageParam,
            limit: 30
          });
        } else {
          // ✅ CORRECCIÓN: Use searchEmails with wildcard for listing all emails
          // El endpoint /email_search no tiene handler "get_messages", solo "search_emails"
          result = await emailSearchApi.searchEmails({
            query: '*',  // Wildcard para obtener todos los emails
            search_folder: selectedFolder,
            page: pageParam,
            limit: 30
          });
        }
        
        console.log('✅ [API RESPONSE] email_search returned:', {
          hasResult: !!result,
          resultKeys: result ? Object.keys(result) : 'null',
          success: result?.success,
          dataType: result?.data ? typeof result.data : 'no data',
          dataIsArray: Array.isArray(result?.data),
          dataLength: Array.isArray(result?.data) ? result.data.length : 'not array',
          messagesLength: result?.messages?.length,
          emailsLength: result?.emails?.length,
          rawResult: JSON.stringify(result).substring(0, 500)
        });
        
        return result;
      } catch (error) {
        console.error('❌ [API ERROR] email_search failed:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const pagination = lastPage?.pagination;
      if (!pagination) {
        // Fallback to old behavior
        const messages = lastPage?.messages || [];
        if (messages.length === 0 || messages.length < 30) return undefined;
        return allPages.length + 1;
      }
      
      const currentPage = pagination.page || allPages.length;
      const totalPages = pagination.pages || Math.ceil((pagination.total || 0) / (pagination.limit || 30));
      
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  console.log('🔍 messagesData structure:', {
    hasPages: !!messagesData?.pages,
    pagesCount: messagesData?.pages?.length,
    messagesLoading,
    messagesError: !!messagesError
  });

  const emailsFromPages = (messagesData?.pages || []).flatMap(page => {
    console.log('📦 API Response Structure:', {
      pageKeys: page ? Object.keys(page) : 'null',
      hasResults: !!page?.results,
      resultsLength: page?.results?.length,
      total: page?.total,
      fullStructure: JSON.stringify(page).substring(0, 300)
    });
    
    // ✅ CORRECCIÓN FINAL: search_emails devuelve response.results[]
    const messages = page?.results || [];
    
    if (!Array.isArray(messages)) {
      console.warn('⚠️ Messages is not an array:', messages);
      return [];
    }
    
    if (messages.length > 0) {
      console.log('📧 First message structure:', messages[0]);
    }
    
    return messages.map(mapApiEmailToComponent);
  });

  // Logging de conversión de fechas
  if (emailsFromPages.length > 0 && emailsFromPages[0].date) {
    console.log('📅 Date conversion:', {
      original: messagesData?.pages?.[0]?.emails?.[0]?.date,
      converted: emailsFromPages[0].date,
      localString: new Date(emailsFromPages[0].date).toLocaleString('it-IT')
    });
  }

  // Filter emails by selected sender
  const emails = selectedSender 
    ? emailsFromPages.filter(email => email.from === selectedSender)
    : emailsFromPages;

  console.log('📬 Emails ready for render:', {
    emailsFromPagesCount: emailsFromPages.length,
    emailsToUseCount: emailsFromPages.length,
    finalEmailsCount: emails.length,
    messagesLoading,
    hasData: !!messagesData
  });

  return {
    emails,
    emailsFromPages,
    loading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};

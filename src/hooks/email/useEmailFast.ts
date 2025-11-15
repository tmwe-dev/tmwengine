import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

/**
 * Hook unificado para operaciones de LECTURA usando API_SEARCH
 * ⚡ Performance: 10-100x más rápido que queries DB directas
 */

interface EmailPageData {
  emails: any[];
  total: number;
  nextPage: number;
}

// ============================================
// LISTA DE EMAILS (con paginación infinita)
// ============================================
export const useEmailListFast = (params: {
  folder: string;
  limit?: number;
  filters?: {
    is_seen?: boolean;
    is_flagged?: boolean;
    has_attachments?: boolean;
    date_from?: string;
    date_to?: string;
  };
}) => {
  return useInfiniteQuery<EmailPageData>({
    queryKey: ['emails-fast', params.folder, params.filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const response = await emailSearchApi.getEmailsMetadata({
        folder: params.folder,
        page,
        limit: params.limit || 50,
        ...params.filters
      });
      
      return {
        emails: response?.data?.messages || response?.messages || [],
        total: response?.data?.total || response?.total || 0,
        nextPage: page + 1
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.emails.length, 0);
      return loadedCount < lastPage.total ? lastPage.nextPage : undefined;
    },
    staleTime: 30000, // Cache 30s
    refetchOnWindowFocus: false
  });
};

// ============================================
// ESTADÍSTICAS DE CARPETA
// ============================================
export const useEmailStatsFast = (folder?: string) => {
  return useQuery({
    queryKey: ['email-stats-fast', folder],
    queryFn: () => emailSearchApi.getStatistics({ folder }),
    staleTime: 60000, // Cache 1 min
    refetchInterval: 60000 // Auto-refresh cada 1 min
  });
};

// ============================================
// CONTADOR DE NO LEÍDOS (para badges)
// ============================================
export const useUnreadCountsFast = (folders?: string[]) => {
  return useQuery({
    queryKey: ['unread-counts-fast', folders],
    queryFn: () => emailSearchApi.getUnreadCount({ folders }),
    staleTime: 20000, // Cache 20s
    refetchInterval: 30000 // Auto-refresh cada 30s
  });
};

// ============================================
// ÁRBOL DE CARPETAS
// ============================================
export const useFolderTreeFast = () => {
  return useQuery({
    queryKey: ['folder-tree-fast'],
    queryFn: () => emailSearchApi.getFolderTree(),
    staleTime: 5 * 60000, // Cache 5 min
    refetchOnMount: false
  });
};

// ============================================
// BÚSQUEDA FULLTEXT
// ============================================
export const useEmailSearchFast = (params: {
  query: string;
  filters?: {
    date_from?: string;
    date_to?: string;
    search_folder?: string;
    has_attachments?: boolean;
  };
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['email-search-fast', params.query, params.filters],
    queryFn: () => emailSearchApi.searchEmails({
      query: params.query,
      limit: 50,
      ...params.filters
    }),
    enabled: params.enabled !== false && params.query.length > 0,
    staleTime: 60000 // Cache 1 min
  });
};

// ============================================
// HILOS DE CONVERSACIÓN
// ============================================
export const useEmailThreadFast = (params: {
  messageId?: string;
  folder?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['email-thread-fast', params.messageId, params.folder],
    queryFn: () => emailSearchApi.getThreads({
      message_id: params.messageId,
      folder: params.folder,
      limit: 50
    }),
    enabled: params.enabled !== false && (!!params.messageId || !!params.folder),
    staleTime: 30000 // Cache 30s
  });
};

// ============================================
// BÚSQUEDA POR REMITENTE
// ============================================
export const useEmailsBySenderFast = (params: {
  sender: string;
  folder?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['emails-by-sender-fast', params.sender, params.folder],
    queryFn: () => emailSearchApi.searchBySender({
      sender: params.sender,
      folder: params.folder,
      limit: 100
    }),
    enabled: params.enabled !== false && params.sender.length > 0,
    staleTime: 60000 // Cache 1 min
  });
};

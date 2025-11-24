/**
 * Hook para prefetch del siguiente email
 * Carga anticipada del email siguiente para navegación instantánea
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

interface UseEmailPrefetchParams {
  emailIds: string[];
  currentIndex: number;
  folder: string;
}

export const useEmailPrefetch = ({ 
  emailIds, 
  currentIndex, 
  folder 
}: UseEmailPrefetchParams) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const nextEmailId = emailIds[currentIndex + 1];
    
    if (nextEmailId) {
      queryClient.prefetchQuery({
        queryKey: ['message', nextEmailId, folder],
        queryFn: () => emailSearchApi.getEmailDetail({
          uid: parseInt(nextEmailId, 10),
          folder: folder,
          include_body: true,
          timeout: 15
        }),
        staleTime: 5 * 60 * 1000
      });
    }
    
    const prevEmailId = emailIds[currentIndex - 1];
    
    if (prevEmailId) {
      queryClient.prefetchQuery({
        queryKey: ['message', prevEmailId, folder],
        queryFn: () => emailSearchApi.getEmailDetail({
          uid: parseInt(prevEmailId, 10),
          folder: folder,
          include_body: true,
          timeout: 15
        }),
        staleTime: 5 * 60 * 1000
      });
    }
  }, [currentIndex, emailIds, folder, queryClient]);
};

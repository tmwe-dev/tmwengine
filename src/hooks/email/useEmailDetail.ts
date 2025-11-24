/**
 * Hook for fetching detailed email content
 * Uses TMWE Email Search RPC API for fast content retrieval
 */
import { useQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { convertToString, convertToArray } from '@/lib/email/email-transformers';
import { extractEmailBody, extractEmailSubject } from '@/lib/email/email-body-utils';

interface UseEmailDetailParams {
  selectedEmailId: string | null;
  selectedFolder: string;
}

export const useEmailDetail = ({ selectedEmailId, selectedFolder }: UseEmailDetailParams) => {
  const { data: emailDetailResponse, isLoading: isLoadingDetail, error: detailError } = useQuery({
    queryKey: ['message', selectedEmailId, selectedFolder],
    queryFn: async () => {
      console.log('🔍 Fetching email detail with UID:', selectedEmailId);
      
      // ✅ LECTURA: Usar /email_search para obtener contenido (rápido vía Elasticsearch)
      const result = await emailSearchApi.getEmailDetail({ 
        uid: parseInt(selectedEmailId!, 10),
        folder: selectedFolder,
        include_body: true,
        timeout: 15
      });
      
      console.log('✅ Email detail received from /email_search:', result);
      console.log('📧 Raw API response structure:', JSON.stringify(result, null, 2));
      console.log('📧 Available fields:', Object.keys(result || {}));
      
      // ✅ Mark as read will be handled automatically by EmailDetail component
      // via onMarkAsRead callback using fast RPC API
      
      return result;
    },
    enabled: !!selectedEmailId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // ✅ Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // ✅ Mantener en memoria 10 min (antes cacheTime)
    refetchOnWindowFocus: false, // ✅ No refetch al cambiar tab
  });

  // Map API response to component format - handle both possible response structures
  const selectedEmail = emailDetailResponse ? (() => {
    // Check if response is empty array or has no data
    if (Array.isArray(emailDetailResponse) && emailDetailResponse.length === 0) {
      console.warn('⚠️ API returned empty array for message');
      return null;
    }

    // Try to get the message from response - try multiple paths
    const msg = emailDetailResponse.message || 
                emailDetailResponse.data || 
                emailDetailResponse.email ||
                emailDetailResponse;
    
    if (!msg || typeof msg !== 'object') {
      console.warn('⚠️ No valid message data in response:', emailDetailResponse);
      return null;
    }

    console.log('📧 Processing message:', msg);
    console.log('📧 Message fields:', Object.keys(msg));

    // Access header data correctly from the TMWE API response structure
    const header = msg.header || msg;

    // Extract body and subject using utility functions
    const bodyContent = extractEmailBody(msg, header);
    const subjectContent = extractEmailSubject(msg, header);

    console.log('📧 Extracted body length:', typeof bodyContent === 'string' ? bodyContent.length : 0);
    console.log('📧 Extracted subject:', subjectContent);

    // Advanced debugging for empty body
    if (!bodyContent || bodyContent === '<p>No content available</p>') {
      console.warn('⚠️ BODY VACÍO - Estructura msg completa:', JSON.stringify(msg, null, 2));
      console.warn('⚠️ BODY VACÍO - Campos disponibles:', Object.keys(msg));
      console.warn('⚠️ BODY VACÍO - Header completo:', header);
    }

    return {
      id: String(header.uid || msg.uid || msg.id || selectedEmailId),
      subject: subjectContent,
      from: convertToString(header.from || msg.from),
      to: convertToArray(header.to || msg.to),
      cc: convertToArray(header.cc || msg.cc),
      date: header.date || msg.date || new Date().toISOString(),
      body: bodyContent,
      attachments: msg.attachments || header.attachments || [],
    };
  })() : null;

  return {
    email: selectedEmail,
    loading: isLoadingDetail,
    error: detailError,
  };
};

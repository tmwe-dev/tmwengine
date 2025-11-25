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
    queryKey: ['message', selectedEmailId],  // ✅ Simplified (no folder needed)
    queryFn: async () => {
      // ✅ Parse selectedEmailId (string) to integer for API
      const emailIdNum = parseInt(selectedEmailId!, 10);
      
      console.log('🔍 [useEmailDetail] Fetching detail:', {
        selectedEmailId_original: selectedEmailId,
        selectedEmailId_type: typeof selectedEmailId,
        emailIdNum_parsed: emailIdNum,
        emailIdNum_type: typeof emailIdNum,
        isValid: !isNaN(emailIdNum)
      });
      
      if (isNaN(emailIdNum)) {
        throw new Error(`Invalid email_id: ${selectedEmailId}`);
      }
      
      const result = await emailSearchApi.getEmailDetail({ 
        email_id: emailIdNum,  // ✅ Use email_id (integer)
        include_body: true,
        timeout: 15
      });
      
      return result;
    },
    enabled: !!selectedEmailId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // ✅ Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // ✅ Mantener en memoria 10 min (antes cacheTime)
    refetchOnWindowFocus: false, // ✅ No refetch al cambiar tab
  });

  // Map API response to component format - handle get_email_detail response
  const selectedEmail = emailDetailResponse ? (() => {
    // ✅ Handle response structure from get_email_detail
    const email = emailDetailResponse.email || 
                  emailDetailResponse.data || 
                  emailDetailResponse;
    
    if (!email || typeof email !== 'object') {
      console.warn('⚠️ No valid email data in response:', emailDetailResponse);
      return null;
    }

    console.log('📧 Processing email from get_email_detail:', email);
    console.log('📧 Email fields:', Object.keys(email));

    // ✅ According to API docs, response has: body_text, body_html, subject, from, etc.
    const bodyContent = email.body_html || email.body_text || email.body || '';
    const subjectContent = email.subject || '(Sin asunto)';

    return {
      id: String(email.id || email.email_id || selectedEmailId),
      subject: subjectContent,
      from: convertToString(email.from),
      to: convertToArray(email.to),
      cc: convertToArray(email.cc),
      date: email.date || new Date().toISOString(),
      body: bodyContent,
      attachments: email.attachments || [],
    };
  })() : null;

  return {
    email: selectedEmail,
    loading: isLoadingDetail,
    error: detailError,
  };
};

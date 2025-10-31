/**
 * 🆕 HOOK: Recupero automatico logo aziendale
 * Integrazione con edge function fetch-company-logo
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractDomain } from '@/lib/smart-inbox-utils';

interface LogoResult {
  logo_url: string | null;
  source: 'cache' | 'clearbit' | 'favicon' | 'not_found';
}

/**
 * Recupera logo aziendale da email (con cache automatica)
 */
export function useCompanyLogo(email: string | null | undefined) {
  return useQuery({
    queryKey: ['company-logo', email],
    queryFn: async (): Promise<LogoResult> => {
      if (!email) {
        return { logo_url: null, source: 'not_found' };
      }

      const domain = extractDomain(email);
      if (!domain) {
        return { logo_url: null, source: 'not_found' };
      }

      // 1️⃣ CHECK cache locale prima
      const { data: cached } = await supabase
        .from('company_logos')
        .select('logo_url')
        .eq('domain', domain.toLowerCase())
        .maybeSingle();

      if (cached?.logo_url) {
        return { logo_url: cached.logo_url, source: 'cache' };
      }

      // 2️⃣ FETCH via edge function
      try {
        const { data, error } = await supabase.functions.invoke('fetch-company-logo', {
          body: { domain }
        });

        if (error) throw error;

        return {
          logo_url: data?.logo_url || null,
          source: data?.source || 'not_found'
        };
      } catch (err) {
        console.error('[useCompanyLogo] Error fetching logo:', err);
        return { logo_url: null, source: 'not_found' };
      }
    },
    enabled: !!email,
    staleTime: 1000 * 60 * 60 * 24, // Cache 24h
    gcTime: 1000 * 60 * 60 * 24 * 7, // Garbage collect dopo 7 giorni
  });
}

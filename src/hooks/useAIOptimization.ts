import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDomainCache, saveDomainCache, type DomainClassification } from '@/lib/email-domain-cache';

const KNOWN_PROVIDERS = [
  'gmail', 'googlemail', 'outlook', 'hotmail', 'live', 'yahoo', 'icloud',
  'protonmail', 'proton', 'zoho', 'fastmail', 'hey',
  'libero', 'alice', 'virgilio', 'tiscali', 'tin', 'msn'
];

interface OptimizationProgress {
  total: number;
  checked: number;
  optimized: number;
  cached: number;
}

/**
 * Hook per ottimizzazione nomi mittenti con AI
 */
export const useAIOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);

  /**
   * Ottimizza nomi mittenti usando AI + cache
   */
  const optimizeSenderNames = async (
    senders: Array<{ email: string; companyName: string }>
  ): Promise<Map<string, string>> => {
    setIsOptimizing(true);
    
    try {
      // Step 1: Estrai domini unici e raggruppa email
      const domainMap = new Map<string, string[]>();
      senders.forEach(s => {
        const domain = s.email.split('@')[1]?.toLowerCase();
        if (!domain) return;
        
        if (!domainMap.has(domain)) domainMap.set(domain, []);
        domainMap.get(domain)!.push(s.email);
      });

      const uniqueDomains = Array.from(domainMap.keys());
      
      setProgress({
        total: uniqueDomains.length,
        checked: 0,
        optimized: 0,
        cached: 0
      });

      // Step 2: Filtra domini già in cache o noti
      const domainsToCheck: string[] = [];
      const optimizedNames = new Map<string, string>();

      for (const domain of uniqueDomains) {
        // Check provider noto
        const mainDomain = domain.split('.')[0];
        if (KNOWN_PROVIDERS.includes(mainDomain)) {
          // Usa parte locale per provider
          const emails = domainMap.get(domain)!;
          emails.forEach(email => {
            const localPart = email.split('@')[0];
            const formattedName = localPart
              .replace(/[._-]/g, ' ')
              .split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
            optimizedNames.set(email, formattedName);
          });
          
          setProgress(p => p ? { ...p, checked: p.checked + 1 } : null);
          continue;
        }

        // Check cache locale
        const cached = getDomainCache(domain);
        if (cached) {
          const emails = domainMap.get(domain)!;
          const nameToUse = cached.isProvider 
            ? emails[0].split('@')[0].replace(/[._-]/g, ' ')
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ')
            : cached.companyName;
            
          emails.forEach(email => {
            optimizedNames.set(email, nameToUse);
          });
          
          setProgress(p => p ? { ...p, checked: p.checked + 1, cached: p.cached + 1 } : null);
          continue;
        }

        domainsToCheck.push(domain);
      }

      // Step 3: Chiama AI solo per domini non cachati
      if (domainsToCheck.length > 0) {
        console.log('Calling AI for domains:', domainsToCheck);
        
        const { data, error } = await supabase.functions.invoke('classify-email-domain', {
          body: { domains: domainsToCheck }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        console.log('AI classification response:', data);

        const results = data.results || [];
        
        // Salva in cache
        const cacheEntries: DomainClassification[] = results.map((r: any) => ({
          domain: r.domain,
          isProvider: r.is_provider,
          companyName: r.company_name,
          timestamp: Date.now()
        }));
        
        saveDomainCache(cacheEntries);

        // Applica risultati AI
        results.forEach((result: any) => {
          const emails = domainMap.get(result.domain) || [];
          emails.forEach(email => {
            if (result.is_provider) {
              // Provider → usa parte locale
              const localPart = email.split('@')[0];
              const formattedName = localPart
                .replace(/[._-]/g, ' ')
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
              optimizedNames.set(email, formattedName);
            } else {
              // Azienda → usa nome AI
              optimizedNames.set(email, result.company_name);
            }
          });
        });

        setProgress(p => p ? { 
          ...p, 
          checked: p.checked + domainsToCheck.length, 
          optimized: domainsToCheck.length 
        } : null);
      }

      return optimizedNames;
      
    } finally {
      setIsOptimizing(false);
      // Reset progress dopo 2 secondi
      setTimeout(() => setProgress(null), 2000);
    }
  };

  return { optimizeSenderNames, isOptimizing, progress };
};

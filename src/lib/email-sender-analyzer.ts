/**
 * Analizzatore mittenti email - Sistema isolato FunEmail
 * Estrae domini, nomi azienda, statistiche
 */

import { supabase } from '@/integrations/supabase/client';
import type { SenderAnalysis, EmailSenderGroup } from '@/types/email-management';

/**
 * Estrae nome società da email
 * "info@barilla.com" → "Barilla"
 * "support@google.com" → "Google"
 */
export function extractCompanyName(email: string): string {
  try {
    const match = email.match(/@([^.]+)\./);
    if (!match) return email.split('@')[0] || email;
    
    let domain = match[1];
    domain = domain.replace(/^(mail|smtp|webmail|email)\./, '');
    domain = domain.replace(/[-_]/g, ' ');
    
    return domain
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
  } catch (error) {
    console.error('Error extracting company name:', error);
    return email;
  }
}

/**
 * Estrae dominio da email
 */
export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : email;
}

/**
 * Analizza tutti i mittenti nel DB per l'utente
 */
export async function analyzeSenders(userEmail: string): Promise<SenderAnalysis[]> {
  console.log('🔍 Analisi mittenti per:', userEmail);
  
  try {
    // ✅ Paginazione manuale per superare limite implicito client Supabase (~1000 rows)
    const pageSize = 1000;
    const allEmails: any[] = [];
    let page = 0;
    let hasMore = true;

    console.log('🔄 Inizio caricamento email con paginazione...');

    while (hasMore && allEmails.length < 20000) { // Max 20k email per evitare timeout
      const rangeStart = page * pageSize;
      const rangeEnd = (page + 1) * pageSize - 1;
      
      const { data: emailsData, error: emailError } = await supabase
        .from('email_messages')
        .select('from_email, data_ricezione')
        .eq('user_email', userEmail)
        .order('data_ricezione', { ascending: false })
        .range(rangeStart, rangeEnd);
      
      if (emailError) throw emailError;
      if (!emailsData || emailsData.length === 0) break;
      
      allEmails.push(...emailsData);
      hasMore = emailsData.length === pageSize;
      page++;
      
      console.log(`📄 Pagina ${page}: +${emailsData.length} email (totale: ${allEmails.length})`);
    }

    console.log(`✅ Caricamento completato: ${allEmails.length} email totali`);
    
    if (allEmails.length === 0) {
      console.warn('⚠️ Nessun mittente trovato nel DB');
      return [];
    }
    
    // Aggrega i mittenti in memoria (molto più veloce che fare RPC pesanti)
    const senderMap = new Map<string, {
      count: number;
      firstSeen: Date;
      lastSeen: Date;
    }>();
    
    allEmails.forEach(email => {
      if (!email.from_email) return;
      
      const existing = senderMap.get(email.from_email);
      const emailDate = new Date(email.data_ricezione);
      
      if (existing) {
        existing.count++;
        if (emailDate < existing.firstSeen) existing.firstSeen = emailDate;
        if (emailDate > existing.lastSeen) existing.lastSeen = emailDate;
      } else {
        senderMap.set(email.from_email, {
          count: 1,
          firstSeen: emailDate,
          lastSeen: emailDate
        });
      }
    });
    
    console.log(`📧 Trovati ${senderMap.size} mittenti unici nel DB`);
    
    const { data: rules, error: rulesError } = await supabase
      .from('email_sender_rules')
      .select('sender_email, group_id, email_sender_groups(*)');
    
    if (rulesError) console.warn('Warn loading rules:', rulesError);
    
    const rulesMap = new Map<string, EmailSenderGroup>();
    rules?.forEach(rule => {
      if (rule.sender_email && rule.email_sender_groups) {
        rulesMap.set(
          rule.sender_email.toLowerCase(),
          rule.email_sender_groups as any as EmailSenderGroup
        );
      }
    });
    
    // Mappa i mittenti aggregati in SenderAnalysis
    const analyses: SenderAnalysis[] = Array.from(senderMap.entries()).map(([email, stats]) => {
      const domain = extractDomain(email);
      const companyName = extractCompanyName(email);
      const currentGroup = rulesMap.get(email.toLowerCase());
      
      return {
        email,
        domain,
        companyName,
        emailCount: stats.count,
        firstSeen: stats.firstSeen.toISOString(),
        lastSeen: stats.lastSeen.toISOString(),
        hasAttachments: false, // Rimosso per performance
        topSubjectKeywords: [],
        avgSubjectLength: 0,
        isClassified: !!currentGroup,
        currentGroup,
      };
    });
    
    console.log(`✅ Analisi completata: ${analyses.length} mittenti`);
    console.log(`📊 Classificati: ${analyses.filter(a => a.isClassified).length}`);
    console.log(`❓ Non classificati: ${analyses.filter(a => !a.isClassified).length}`);
    
    return analyses;
    
  } catch (error) {
    console.error('❌ Errore analisi mittenti:', error);
    throw error;
  }
}

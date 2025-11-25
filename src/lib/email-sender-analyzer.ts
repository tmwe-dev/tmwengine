/**
 * Analizzatore mittenti email - Sistema isolato FunEmail
 * 🆕 Zero-Sync Architecture: Uses TMWE API instead of email_messages
 * Estrae domini, nomi azienda, statistiche
 */

import { supabase } from '@/integrations/supabase/client';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
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
 * 🆕 Zero-Sync: Analizza mittenti via TMWE API invece di email_messages
 */
export async function analyzeSenders(
  userEmail: string,
  userId: string
): Promise<SenderAnalysis[]> {
  console.log('🔍 [Zero-Sync] Analisi mittenti per:', userEmail);
  
  try {
    // 🆕 ZERO-SYNC: Fetch sender statistics from TMWE API
    console.log('🌐 [Zero-Sync] Fetching sender data from TMWE API...');
    
    let allEmails: Array<{ from_email: string; date: string }> = [];
    
    try {
      // Try TMWE API first (Zero-Sync mode) using getEmailsMetadata
      const searchResult = await emailSearchApi.getEmailsMetadata({
        folder: 'INBOX',
        limit: 5000,           // Fetch max emails for analysis
        timeout: 30
      });
      
      if (searchResult?.emails && searchResult.emails.length > 0) {
        allEmails = searchResult.emails.map((email: any) => ({
          from_email: email.from?.email || email.from_email || email.sender || '',
          date: email.date || email.received_at || new Date().toISOString()
        })).filter((e: any) => e.from_email);
        
        console.log(`🌐 [Zero-Sync] TMWE API returned ${allEmails.length} emails`);
      }
    } catch (tmweError) {
      console.warn('⚠️ [Zero-Sync] TMWE API failed, falling back to local DB:', tmweError);
    }
    
    // Fallback to local DB if TMWE API fails or returns empty
    if (allEmails.length === 0) {
      console.log('📦 [Fallback] Using local email_messages table...');
      
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore && allEmails.length < 20000) {
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
        
        allEmails.push(...emailsData.map(e => ({
          from_email: e.from_email,
          date: e.data_ricezione
        })));
        hasMore = emailsData.length === pageSize;
        page++;
      }
      
      console.log(`📦 [Fallback] Local DB returned ${allEmails.length} emails`);
    }

    console.log(`✅ Caricamento completato: ${allEmails.length} email totali`);
    
    if (allEmails.length === 0) {
      console.warn('⚠️ Nessun mittente trovato');
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
      const emailDate = new Date(email.date);
      
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
      .select('sender_email, group_id, email_sender_groups(*)')
      .eq('user_id', userId);
    
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
    
    // 🆕 Load AI suggestions pending
    const { data: aiSuggestions, error: aiError } = await supabase
      .from('ai_categorization_suggestions')
      .select('sender_email, status')
      .eq('status', 'pending');
    
    if (aiError) console.warn('Warn loading AI suggestions:', aiError);
    
    const aiSuggestionsSet = new Set<string>();
    aiSuggestions?.forEach(suggestion => {
      if (suggestion.sender_email) {
        aiSuggestionsSet.add(suggestion.sender_email.toLowerCase());
      }
    });
    
    console.log(`🤖 Trovati ${aiSuggestionsSet.size} mittenti con suggerimenti AI pending`);
    
    // Mappa i mittenti aggregati in SenderAnalysis
    const analyses: SenderAnalysis[] = Array.from(senderMap.entries()).map(([email, stats]) => {
      const domain = extractDomain(email);
      const companyName = extractCompanyName(email);
      const currentGroup = rulesMap.get(email.toLowerCase());
      const hasAISuggestion = aiSuggestionsSet.has(email.toLowerCase());
      
      // 🔍 Debug logging per suggerimenti AI
      if (hasAISuggestion) {
        console.log(`🤖 Sender with AI suggestion: ${email} - isClassified: true`);
      }
      
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
        isClassified: !!currentGroup || hasAISuggestion,
        currentGroup,
      };
    });
    
  const classifiedWithRule = analyses.filter(a => !!rulesMap.get(a.email.toLowerCase())).length;
  const classifiedWithAI = analyses.filter(a => aiSuggestionsSet.has(a.email.toLowerCase())).length;
  const unclassified = analyses.filter(a => !a.isClassified).length;
  
  console.log(`✅ Analisi completata: ${analyses.length} mittenti totali`);
  console.log(`📊 Classificati con regola: ${classifiedWithRule}`);
  console.log(`🤖 Classificati con suggerimento AI: ${classifiedWithAI}`);
  console.log(`✅ Totale classificati: ${classifiedWithRule + classifiedWithAI}`);
  console.log(`❓ Non classificati: ${unclassified}`);
    
    return analyses;
    
  } catch (error) {
    console.error('❌ Errore analisi mittenti:', error);
    throw error;
  }
}

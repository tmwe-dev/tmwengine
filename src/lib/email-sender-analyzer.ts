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
    // Usa aggregazione lato DB invece di scaricare tutte le email
    const { data: senderStats, error: emailError } = await supabase
      .rpc('analyze_senders_aggregated', { 
        p_user_email: userEmail 
      });
    
    if (emailError) throw emailError;
    
    if (!senderStats || senderStats.length === 0) {
      console.warn('⚠️ Nessun mittente trovato nel DB');
      return [];
    }
    
    console.log(`📧 Trovati ${senderStats.length} mittenti unici nel DB`);
    
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
    
    // Mappa i risultati aggregati dal DB direttamente in SenderAnalysis
    const analyses: SenderAnalysis[] = senderStats.map(stat => {
      const domain = extractDomain(stat.from_email);
      const companyName = extractCompanyName(stat.from_email);
      const currentGroup = rulesMap.get(stat.from_email.toLowerCase());
      
      return {
        email: stat.from_email,
        domain,
        companyName,
        emailCount: Number(stat.email_count),
        firstSeen: new Date(stat.first_seen).toISOString(),
        lastSeen: new Date(stat.last_seen).toISOString(),
        hasAttachments: stat.has_attachments,
        topSubjectKeywords: [], // Rimosso: troppo pesante da calcolare
        avgSubjectLength: 0,    // Rimosso: non necessario
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

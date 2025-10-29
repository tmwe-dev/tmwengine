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
    const { data: emails, error: emailError } = await supabase
      .from('email_messages')
      .select('from_email, subject, data_ricezione, attachments')
      .eq('user_email', userEmail)
      .eq('sync_status', 'fun_email_backup')
      .order('data_ricezione', { ascending: false });
    
    if (emailError) throw emailError;
    
    if (!emails || emails.length === 0) {
      console.warn('⚠️ Nessuna email trovata nel DB');
      return [];
    }
    
    console.log(`📧 Trovate ${emails.length} email nel DB`);
    
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
    
    const senderMap = new Map<string, {
      emails: any[];
      firstSeen: Date;
      lastSeen: Date;
    }>();
    
    emails.forEach(email => {
      const sender = (email.from_email || '').toLowerCase().trim();
      if (!sender || !sender.includes('@')) return;
      
      if (!senderMap.has(sender)) {
        senderMap.set(sender, {
          emails: [],
          firstSeen: new Date(email.data_ricezione),
          lastSeen: new Date(email.data_ricezione),
        });
      }
      
      const senderData = senderMap.get(sender)!;
      senderData.emails.push(email);
      
      const date = new Date(email.data_ricezione);
      if (date < senderData.firstSeen) senderData.firstSeen = date;
      if (date > senderData.lastSeen) senderData.lastSeen = date;
    });
    
    console.log(`👥 Trovati ${senderMap.size} mittenti unici`);
    
    const analyses: SenderAnalysis[] = [];
    
    for (const [email, data] of senderMap.entries()) {
      const domain = extractDomain(email);
      const companyName = extractCompanyName(email);
      
      const hasAttachments = data.emails.some(e => 
        Array.isArray(e.attachments) && e.attachments.length > 0
      );
      
      const avgSubjectLength = Math.round(
        data.emails.reduce((sum, e) => sum + ((e.subject || '').length), 0) / data.emails.length
      );
      
      const allWords = data.emails
        .flatMap(e => (e.subject || '').toLowerCase().split(/\s+/))
        .filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(w));
      
      const wordCounts: Record<string, number> = {};
      allWords.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
      
      const topKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
      
      const currentGroup = rulesMap.get(email);
      
      analyses.push({
        email,
        domain,
        companyName,
        emailCount: data.emails.length,
        firstSeen: data.firstSeen.toISOString(),
        lastSeen: data.lastSeen.toISOString(),
        hasAttachments,
        topSubjectKeywords: topKeywords,
        avgSubjectLength,
        isClassified: !!currentGroup,
        currentGroup,
      });
    }
    
    analyses.sort((a, b) => b.emailCount - a.emailCount);
    
    console.log(`✅ Analisi completata: ${analyses.length} mittenti`);
    console.log(`📊 Classificati: ${analyses.filter(a => a.isClassified).length}`);
    console.log(`❓ Non classificati: ${analyses.filter(a => !a.isClassified).length}`);
    
    return analyses;
    
  } catch (error) {
    console.error('❌ Errore analisi mittenti:', error);
    throw error;
  }
}

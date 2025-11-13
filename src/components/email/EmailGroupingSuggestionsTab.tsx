/**
 * Tab Suggerimenti AI Raggruppamento - Sistema completamente isolato
 * Estratto da EmailManagementTab per migliorare modularità
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Brain, RefreshCw, LayoutGrid, List, Mail, FolderKanban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeSenders } from '@/lib/email-sender-analyzer';
import type { EmailSenderGroup, SenderAnalysis, GroupingSuggestion } from '@/types/email-management';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GroupingSuggestionCard } from './management/GroupingSuggestionCard';
import { GroupingSuggestionRow } from './management/GroupingSuggestionRow';
import { AIConfigurationGuide } from './management/AIConfigurationGuide';
import { SuggestionProgressDialog, SuggestionProgress } from './management/SuggestionProgressDialog';
import { CompanyProfileSettings } from '../intranet/CompanyProfileSettings';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { detectCountryFromEmail } from '@/lib/email-utils';
import { useGlobalAIAgent } from '@/hooks/useGlobalAIAgent';
import { GlobalAIAgentSelector } from '@/components/ai/GlobalAIAgentSelector';

export function EmailGroupingSuggestionsTab() {
  const { getAIPayload } = useGlobalAIAgent();
  // 🆕 State per dati locali (self-contained)
  const [groups, setGroups] = useState<EmailSenderGroup[]>([]);
  const [senders, setSenders] = useState<SenderAnalysis[]>([]);
  const [assignedSenders, setAssignedSenders] = useState<Map<string, SenderAnalysis[]>>(new Map());
  const [isLoadingData, setIsLoadingData] = useState(true);
  // 🤖 Sistema Raggruppamento Suggerito
  const [groupingSuggestions, setGroupingSuggestions] = useState<GroupingSuggestion[]>([]);
  
  // 🔤 Ordinamento suggerimenti
  const [sortBy, setSortBy] = useState<'domain' | 'group' | 'country' | 'email_count'>('domain');
  
  // 📧 Conteggi email per mittente (caricati in bulk)
  const [emailCounts, setEmailCounts] = useState<Map<string, number>>(new Map());
  
  // 🔄 Suggerimenti ordinati in base a sortBy
  const sortedSuggestions = useMemo(() => {
    if (!groupingSuggestions || groupingSuggestions.length === 0) return [];
    
    const sorted = [...groupingSuggestions];
    
    if (sortBy === 'domain') {
      // Ordina per dominio email (parte dopo @)
      sorted.sort((a, b) => {
        const domainA = a.sender_email.split('@')[1] || '';
        const domainB = b.sender_email.split('@')[1] || '';
        return domainA.localeCompare(domainB);
      });
    } else if (sortBy === 'group') {
      // Ordina per nome gruppo primario (suggerimento con confidence più alta)
      sorted.sort((a, b) => {
        const groupA = a.suggested_groups[0]?.group_name || '';
        const groupB = b.suggested_groups[0]?.group_name || '';
        return groupA.localeCompare(groupB);
      });
    } else if (sortBy === 'country') {
      // Ordina per paese (bandiera)
      sorted.sort((a, b) => {
        const countryA = detectCountryFromEmail(a.sender_email) || 'ZZ';
        const countryB = detectCountryFromEmail(b.sender_email) || 'ZZ';
        return countryA.localeCompare(countryB);
      });
    } else if (sortBy === 'email_count') {
      // Ordina per numero email (decrescente)
      sorted.sort((a, b) => {
        const countA = emailCounts.get(a.sender_email) || 0;
        const countB = emailCounts.get(b.sender_email) || 0;
        return countB - countA; // Decrescente
      });
    }
    
    return sorted;
  }, [groupingSuggestions, sortBy, emailCounts]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [aiConfigError, setAiConfigError] = useState<string | null>(null);
  
  // 🎯 Progress Dialog per generazione suggerimenti
  const [suggestionProgress, setSuggestionProgress] = useState<SuggestionProgress | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  
  // 🔢 Filtro email minime per mittente
  const [minimumEmailCount, setMinimumEmailCount] = useState<number>(2);
  
  // 🆕 Vista griglia/elenco
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // 🧠 Knowledge Base Generator (Phase 2)
  const [isGeneratingKB, setIsGeneratingKB] = useState(false);
  const [kbProgress, setKbProgress] = useState<{
    current: number;
    total: number;
    currentGroup: string;
    logs: string[];
  } | null>(null);
  
  const { toast } = useToast();

  // 🆕 Carica dati completi (gruppi + mittenti + assegnazioni)
  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) {
        toast({
          title: '⚠️ Configurazione mancante',
          description: 'Email TMWE non configurata nel profilo',
          variant: 'default',
        });
        return;
      }

      // Carica gruppi
      const { data: groupsData, error: groupsError } = await supabase
        .from('email_sender_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Analizza mittenti
      const analysis = await analyzeSenders(profile.tmwe_email, user.id);
      const unclassified = analysis.filter(s => !s.isClassified);
      setSenders(unclassified);

      // Carica assegnazioni
      const { data: rulesData } = await supabase
        .from('email_sender_rules')
        .select('sender_email, group_id')
        .eq('user_id', user.id);

      const sendersMap = new Map<string, SenderAnalysis[]>();
      for (const group of (groupsData || [])) {
        const groupRules = rulesData?.filter(r => r.group_id === group.id) || [];
        const groupSenders = analysis.filter(s => 
          groupRules.some(r => r.sender_email === s.email)
        );
        sendersMap.set(group.id, groupSenders);
      }
      setAssignedSenders(sendersMap);

      // Carica suggerimenti
      await loadGroupingSuggestions(profile.tmwe_email);

      console.log(`✅ Dati caricati: ${groupsData?.length || 0} gruppi, ${unclassified.length} mittenti non classificati`);

    } catch (error: any) {
      console.error('❌ Errore caricamento dati:', error);
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile caricare i dati',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Carica dati all'avvio
  useEffect(() => {
    loadData();
  }, []);

  // 🤖 Carica suggerimenti AI dalla tabella
  const loadGroupingSuggestions = async (userEmail: string) => {
    try {
      const { data: suggestions, error } = await supabase
        .from('email_sender_grouping_suggestions' as any)
        .select('*')
        .eq('user_email', userEmail)
        .eq('status', 'pending')
        .order('analyzed_at', { ascending: false });

      if (error) throw error;

      if (suggestions && suggestions.length > 0) {
        // 🔴 FILTRO: Rimuovi suggerimenti per mittenti già classificati
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingRules } = await supabase
            .from('email_sender_rules')
            .select('sender_email')
            .eq('user_id', user.id)
            .in('sender_email', suggestions.map((s: any) => s.sender_email));
          
          const classifiedEmails = new Set(existingRules?.map(r => r.sender_email) || []);
          const validSuggestions = suggestions.filter((s: any) => !classifiedEmails.has(s.sender_email));
          
          console.log(`🤖 Caricati ${validSuggestions.length} suggerimenti validi (${classifiedEmails.size} mittenti già classificati)`);
          setGroupingSuggestions(validSuggestions as unknown as GroupingSuggestion[]);
          
          // 📧 Carica conteggi email in bulk per tutti i suggerimenti
          if (validSuggestions.length > 0) {
            const senderEmails = validSuggestions.map((s: any) => s.sender_email);
            const { data: emailData } = await supabase
              .from('email_messages')
              .select('from_email')
              .eq('user_email', userEmail)
              .in('from_email', senderEmails);
            
            // Conta occorrenze
            const counts = new Map<string, number>();
            emailData?.forEach(row => {
              counts.set(row.from_email, (counts.get(row.from_email) || 0) + 1);
            });
            
            setEmailCounts(counts);
            console.log(`📧 Caricati conteggi email per ${counts.size} mittenti`);
          }
        } else {
          setGroupingSuggestions(suggestions as unknown as GroupingSuggestion[]);
          console.log(`🤖 Caricati ${suggestions.length} suggerimenti AI pending`);
        }
        
        // 🔴 DISABILITATO - Popup ora si apre solo su richiesta utente
        // setShowSuggestionsDialog(true);
      }
    } catch (error: any) {
      console.error('❌ Errore caricamento suggerimenti:', error);
    }
  };


  // 🧠 Handler generazione Knowledge Base (top 3 gruppi)
  const handleGenerateGroupKB = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) {
        toast({
          title: '⚠️ Configurazione mancante',
          description: 'Email TMWE non configurata',
          variant: 'default',
        });
        return;
      }

      // Filtra gruppi con 3+ mittenti e ordina per count (top 3)
      const groupsWithSenders = groups
        .map(g => ({
          ...g,
          senderCount: (assignedSenders.get(g.id) || []).length
        }))
        .filter(g => g.senderCount >= 3)
        .sort((a, b) => b.senderCount - a.senderCount)
        .slice(0, 3); // TOP 3 ONLY

      if (groupsWithSenders.length === 0) {
        toast({
          title: '⚠️ Nessun gruppo qualificato',
          description: 'Servono almeno 3 mittenti per gruppo',
          variant: 'default',
        });
        return;
      }

      setIsGeneratingKB(true);
      setKbProgress({
        current: 0,
        total: groupsWithSenders.length,
        currentGroup: '',
        logs: [`🧠 Avvio generazione KB per ${groupsWithSenders.length} gruppi (top 3)`]
      });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < groupsWithSenders.length; i++) {
        const group = groupsWithSenders[i];
        
        setKbProgress(prev => prev ? {
          ...prev,
          current: i + 1,
          currentGroup: group.nome_gruppo,
          logs: [...prev.logs, `\n📊 [${i + 1}/${groupsWithSenders.length}] Gruppo: ${group.nome_gruppo} (${group.senderCount} mittenti)`]
        } : null);

        try {
          const { data, error } = await supabase.functions.invoke('generate-group-context', {
            body: {
              group_id: group.id,
              user_email: profile.tmwe_email,
              ...getAIPayload()
            }
          });

          if (error) throw error;

          successCount++;
          setKbProgress(prev => prev ? {
            ...prev,
            logs: [...prev.logs, `✅ Context generato (quality: ${(data.quality_score * 100).toFixed(0)}%, samples: ${data.sample_count})`]
          } : null);

          // Delay between requests (rate limiting)
          if (i < groupsWithSenders.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error: any) {
          errorCount++;
          console.error(`❌ KB generation error for ${group.nome_gruppo}:`, error);
          setKbProgress(prev => prev ? {
            ...prev,
            logs: [...prev.logs, `❌ Errore: ${error.message || 'Unknown error'}`]
          } : null);
        }
      }

      setKbProgress(prev => prev ? {
        ...prev,
        logs: [
          ...prev.logs,
          `\n🎯 COMPLETATO: ${successCount} successi, ${errorCount} errori`,
          successCount > 0 ? '✅ Knowledge Base pronta per uso in suggerimenti AI' : ''
        ]
      } : null);

      if (successCount > 0) {
        toast({
          title: '✅ Knowledge Base generata',
          description: `${successCount} contesti creati su ${groupsWithSenders.length} gruppi`,
        });
      } else {
        toast({
          title: '❌ Generazione fallita',
          description: 'Nessun contesto generato. Verifica configurazione AI.',
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      console.error('❌ KB generation error:', error);
      toast({
        title: '❌ Errore generazione KB',
        description: error.message || 'Errore imprevisto',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingKB(false);
    }
  };

  // 🤖 NUOVO SISTEMA - Genera suggerimenti raggruppamento con progresso live
  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) {
        throw new Error('Email TMWE non configurata');
      }

      // STEP 1: Carica suggerimenti esistenti per evitare duplicati
      const { data: existingSuggestions, error: suggestionsError } = await supabase
        .from('email_sender_grouping_suggestions' as any)
        .select('sender_email')
        .eq('user_email', profile.tmwe_email)
        .in('status', ['pending', 'accepted']) as { data: Array<{ sender_email: string }> | null, error: any };

      if (suggestionsError) {
        console.error('❌ Errore caricamento suggerimenti esistenti:', suggestionsError);
        throw suggestionsError;
      }

      // STEP 2: Crea Set di email già elaborate
      const alreadyProcessedEmails = new Set(
        (existingSuggestions || []).map(s => s.sender_email)
      );

      console.log(`📊 Mittenti già con suggerimento: ${alreadyProcessedEmails.size}`);

      // STEP 3: Filtra per non classificati + email count minimo
      const totalUnclassified = senders.filter(s => !s.isClassified);
      const qualifiedSenders = totalUnclassified.filter(s => s.emailCount >= minimumEmailCount);
      const unclassifiedSenders = qualifiedSenders.filter(s => !alreadyProcessedEmails.has(s.email));

      console.log(`📊 Mittenti totali non classificati: ${totalUnclassified.length}`);
      console.log(`🔢 Mittenti con almeno ${minimumEmailCount} email: ${qualifiedSenders.length}`);
      console.log(`✅ Mittenti già elaborati (skip): ${alreadyProcessedEmails.size}`);
      console.log(`🆕 Mittenti nuovi da elaborare: ${unclassifiedSenders.length}`);
      
      // Gestione caso "Nessun mittente qualificato"
      if (qualifiedSenders.length === 0) {
        toast({
          title: '⚠️ Nessun mittente ripetitivo trovato',
          description: `Tutti i mittenti non classificati hanno meno di ${minimumEmailCount} email. Prova ad abbassare il limite minimo.`,
        });
        return;
      }
      
      if (unclassifiedSenders.length === 0) {
        if (alreadyProcessedEmails.size > 0) {
          toast({
            title: '✅ Tutti i mittenti già elaborati',
            description: `${alreadyProcessedEmails.size} suggerimenti già presenti. Verifica il dialog suggerimenti.`,
          });
          
          // Ricarica suggerimenti e mostra dialog
          await loadGroupingSuggestions(profile.tmwe_email);
          setShowSuggestionsDialog(true);
        } else {
          toast({
            title: 'Nessun mittente da classificare',
            description: 'Tutti i mittenti sono già assegnati a un gruppo',
          });
        }
        return;
      }

      // Inizializza progresso e mostra dialog
      setSuggestionProgress({
        current: 0,
        total: unclassifiedSenders.length,
        currentSender: '',
        currentCompany: '',
        successCount: 0,
        errorCount: 0,
        logs: [
          {
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `📊 Trovati ${totalUnclassified.length} mittenti non classificati`
          },
          {
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `🔢 Filtrati ${qualifiedSenders.length} mittenti con almeno ${minimumEmailCount} email`
          },
          {
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `✅ ${alreadyProcessedEmails.size} mittenti già con suggerimento AI (skip)`
          },
          {
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `🚀 Avvio analisi di ${unclassifiedSenders.length} NUOVI mittenti ripetitivi`
          }
        ]
      });
      setShowProgressDialog(true);

      let successCount = 0;
      let errorCount = 0;

      // Per ogni mittente non classificato
      for (let index = 0; index < unclassifiedSenders.length; index++) {
        const sender = unclassifiedSenders[index];
        
        // Update current sender
        setSuggestionProgress(prev => prev ? {
          ...prev,
          current: index + 1,
          currentSender: sender.email,
          currentCompany: sender.companyName,
          logs: [...prev.logs, {
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `📧 Analisi ${sender.companyName} (${sender.email})...`,
            senderEmail: sender.email
          }]
        } : null);

        try {
          // Get email samples - SCHEMA VERIFICATO ✅
          const { data: emailSamples, error: emailError } = await supabase
            .from('email_messages')
            .select('subject, body_text, data_ricezione')
            .eq('from_email', sender.email)
            .eq('user_email', profile.tmwe_email)
            .order('data_ricezione', { ascending: false })
            .limit(5);

          if (emailError) {
            console.error(`❌ Errore lettura email per ${sender.email}:`, emailError);
            errorCount++;
            setSuggestionProgress(prev => prev ? {
              ...prev,
              errorCount: prev.errorCount + 1,
              logs: [...prev.logs, {
                timestamp: new Date().toISOString(),
                type: 'error',
                message: `❌ Errore lettura email per ${sender.companyName}: ${emailError.message}`,
                senderEmail: sender.email
              }]
            } : null);
            continue;
          }

          if (!emailSamples || emailSamples.length === 0) {
            console.log(`⚠️ Nessuna email trovata per ${sender.email}`);
            setSuggestionProgress(prev => prev ? {
              ...prev,
              logs: [...prev.logs, {
                timestamp: new Date().toISOString(),
                type: 'info',
                message: `⚠️ Nessuna email trovata per ${sender.companyName}, skip`,
                senderEmail: sender.email
              }]
            } : null);
            continue;
          }

          // Log email samples found
          setSuggestionProgress(prev => prev ? {
            ...prev,
            logs: [...prev.logs, {
              timestamp: new Date().toISOString(),
              type: 'info',
              message: `📊 Trovate ${emailSamples.length} email per analisi`
            }]
          } : null);

          // Call edge function
          const { data, error } = await supabase.functions.invoke('suggest-sender-grouping', {
            body: {
              sender_email: sender.email,
              email_samples: emailSamples.map(e => ({
                subject: e.subject || '',
                body_preview: (e.body_text || '').substring(0, 200),
                date: e.data_ricezione
              })),
              existing_groups: groups.map(g => ({
                id: g.id,
                nome_gruppo: g.nome_gruppo,
                colore: g.colore,
                icon: g.icon,
                descrizione: g.descrizione
              })),
              user_email: profile.tmwe_email,
              ...getAIPayload()
            }
          });

          if (error) {
            console.error(`❌ Errore suggerimento per ${sender.email}:`, error);
            errorCount++;
            setSuggestionProgress(prev => prev ? {
              ...prev,
              errorCount: prev.errorCount + 1,
              logs: [...prev.logs, {
                timestamp: new Date().toISOString(),
                type: 'error',
                message: `❌ Errore AI per ${sender.companyName}: ${error.message}`,
                senderEmail: sender.email
              }]
            } : null);
            continue;
          }

          console.log(`✅ Suggerimenti generati per ${sender.email}:`, data);
          successCount++;
          
          // Log success
          setSuggestionProgress(prev => prev ? {
            ...prev,
            successCount: prev.successCount + 1,
            logs: [...prev.logs, {
              timestamp: new Date().toISOString(),
              type: 'success',
              message: `✅ Suggerimenti generati per ${sender.companyName}`,
              senderEmail: sender.email
            }]
          } : null);

        } catch (senderError: any) {
          console.error(`❌ Errore processando ${sender.email}:`, senderError);
          errorCount++;
          setSuggestionProgress(prev => prev ? {
            ...prev,
            errorCount: prev.errorCount + 1,
            logs: [...prev.logs, {
              timestamp: new Date().toISOString(),
              type: 'error',
              message: `❌ Errore imprevisto per ${sender.companyName}: ${senderError.message}`,
              senderEmail: sender.email
            }]
          } : null);
        }
      }

      // Final summary log
      setSuggestionProgress(prev => prev ? {
        ...prev,
        logs: [...prev.logs, {
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `🎯 Completato: ${successCount} successi, ${errorCount} errori su ${unclassifiedSenders.length} mittenti totali`
        }]
      } : null);

      // 🆕 AUTO-REGISTRAZIONE NUOVI GRUPPI SUGGERITI
      const newGroupNames = new Set<string>();
      for (const sugg of groupingSuggestions) {
        for (const group of sugg.suggested_groups) {
          if (group.group_id === null) {
            newGroupNames.add(group.group_name);
          }
        }
      }

      if (newGroupNames.size > 0) {
        console.log(`🆕 Auto-registrazione ${newGroupNames.size} nuovi gruppi suggeriti...`);
        
        for (const groupName of newGroupNames) {
          // ✅ Verifica case-insensitive + trim
          const normalizedName = groupName.trim().toLowerCase();
          const existing = groups.find(g => 
            g.nome_gruppo.trim().toLowerCase() === normalizedName
          );
          
          if (existing) {
            console.log(`⏭️ Gruppo "${groupName}" già esistente (${existing.id}), skip`);
            
            // Aggiorna suggerimenti con group_id esistente
            await supabase
              .from('email_sender_grouping_suggestions' as any)
              .update({
                suggested_groups: groupingSuggestions
                  .find(s => s.suggested_groups.some(sg => sg.group_name === groupName))
                  ?.suggested_groups.map(sg => 
                    sg.group_name === groupName 
                      ? { ...sg, group_id: existing.id } 
                      : sg
                  )
              })
              .eq('user_email', profile.tmwe_email)
              .contains('suggested_groups', [{ group_name: groupName }]);
            
            continue;
          }
          
          // Crea gruppo solo se NON esiste
          const { data: newGroup, error: createError } = await supabase
            .from('email_sender_groups')
            .insert({
              nome_gruppo: groupName.trim(),
              colore: '#3B82F6',
              icon: '📧',
              user_id: user.id
            })
            .select()
            .single();
          
          if (createError) {
            console.error(`❌ Errore auto-registrazione gruppo "${groupName}":`, {
              message: createError.message,
              code: createError.code,
              details: createError.details
            });
          } else {
            console.log(`✅ Auto-registrato gruppo: ${groupName} (${newGroup.id})`);
            
            // Aggiorna state locale
            setGroups(prev => [...prev, newGroup]);
            
            // Update suggestions con nuovo group_id
            await supabase
              .from('email_sender_grouping_suggestions' as any)
              .update({
                suggested_groups: groupingSuggestions
                  .find(s => s.suggested_groups.some(sg => sg.group_name === groupName))
                  ?.suggested_groups.map(sg => 
                    sg.group_name === groupName 
                      ? { ...sg, group_id: newGroup.id } 
                      : sg
                  )
              })
              .eq('user_email', profile.tmwe_email)
              .contains('suggested_groups', [{ group_name: groupName }]);
          }
        }
      }

      // Ricarica suggerimenti salvati
      await loadGroupingSuggestions(profile.tmwe_email);

      if (successCount > 0) {
        toast({
          title: '✅ Suggerimenti generati',
          description: `${successCount} mittenti processati con successo`,
        });
      } else {
        toast({
          title: '⚠️ Nessun suggerimento generato',
          description: errorCount > 0 ? 'Si sono verificati degli errori' : 'Nessuna email trovata per i mittenti',
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      console.error('❌ Errore generazione suggerimenti:', error);
      setSuggestionProgress(prev => prev ? {
        ...prev,
        logs: [...prev.logs, {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `❌ Errore critico: ${error.message}`
        }]
      } : null);
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile generare i suggerimenti',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // 🤖 Handler accetta suggerimento (semplificato - auto-reg gestisce gruppi nuovi)
  const handleAcceptSuggestion = async (suggestionId: string, groupId: string | null, groupName: string) => {
    try {
      const suggestion = groupingSuggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      const sender = senders.find(s => s.email === suggestion.sender_email);
      if (!sender) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🔍 Cerca gruppo per NOME invece di fidarsi del group_id dal suggerimento
      let targetGroupId: string | null = null;

      if (groupId) {
        // Verifica se il group_id esiste ancora
        const existingGroup = groups.find(g => g.id === groupId);
        if (existingGroup) {
          targetGroupId = groupId;
          console.log(`✅ Gruppo trovato per ID: ${existingGroup.nome_gruppo}`);
        } else {
          console.warn(`⚠️ Group ID ${groupId} non trovato, cerco per nome: ${groupName}`);
        }
      }

      // Se non trovato per ID, cerca per nome
      if (!targetGroupId) {
        const groupByName = groups.find(g => 
          g.nome_gruppo.toLowerCase() === groupName.toLowerCase()
        );
        
        if (groupByName) {
          targetGroupId = groupByName.id;
          console.log(`✅ Gruppo trovato per nome: ${groupByName.nome_gruppo}`);
        }
      }

      // Se ancora non trovato, crea nuovo gruppo
      if (!targetGroupId) {
        const { data: newGroup, error: createError } = await supabase
          .from('email_sender_groups')
          .insert({
            nome_gruppo: groupName,
            colore: '#3B82F6',
            icon: '📧',
            user_id: user.id
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Errore creazione gruppo:', {
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint
          });
          toast({
            title: '❌ Errore',
            description: 'Impossibile creare il nuovo gruppo',
            variant: 'destructive',
          });
          return;
        }

        targetGroupId = newGroup.id;
        setGroups(prev => [...prev, newGroup]);
        console.log(`✅ Nuovo gruppo creato: ${newGroup.nome_gruppo}`);
      }

      // ✅ Verifica se regola già esistente
      const { data: existingRule } = await supabase
        .from('email_sender_rules')
        .select('id')
        .eq('user_id', user.id)
        .eq('sender_email', sender.email)
        .eq('group_id', targetGroupId)
        .maybeSingle();

      if (existingRule) {
        console.log('⚠️ Regola già esistente, skip insert');
        
        // Rimuovi suggerimento comunque (già classificato)
        setGroupingSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        
        toast({
          title: '✅ Mittente già classificato',
          description: `${sender.companyName} è già in ${groupName}`,
        });
        
        // ✅ Nessun reload necessario, la lista è già aggiornata
        return;
      }

      // Create classification rule
      const { error: ruleError } = await supabase
        .from('email_sender_rules')
        .insert({
          user_id: user.id,
          sender_email: sender.email,
          group_id: targetGroupId,
        });

      if (ruleError) throw ruleError;

      setGroupingSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      toast({
        title: '✅ Suggerimento accettato',
        description: `${sender.companyName} assegnato a ${groupName}`,
      });

      // ✅ Nessun reload necessario, la lista è già aggiornata

    } catch (error: any) {
      // 🔍 Logging dettagliato multi-format per debug
      console.error('❌ ERRORE ACCETTAZIONE SUGGERIMENTO:');
      console.error('Tipo:', typeof error);
      console.error('Costruttore:', error?.constructor?.name);
      
      // Tentativo serializzazione JSON
      try {
        console.error('JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error('(non serializzabile)');
      }
      
      // Proprietà individuali
      console.error('Proprietà error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
        statusCode: error?.statusCode,
        name: error?.name
      });
      
      // Stack trace se disponibile
      if (error?.stack) {
        console.error('Stack:', error.stack);
      }
      
      // Messaggio user-friendly basato sul tipo di errore
      let userMessage = 'Impossibile accettare il suggerimento';
      
      if (error?.code === '23505') {
        userMessage = 'Questo mittente è già assegnato a questo gruppo';
      } else if (error?.message) {
        userMessage = error.message;
      } else if (typeof error === 'string') {
        userMessage = error;
      }
      
      toast({
        title: '❌ Errore',
        description: userMessage,
        variant: 'destructive',
      });
    }
  };
  
  // 🆕 Handler selezione manuale gruppo da dropdown
  const handleManualGroupSelection = async (suggestionId: string, groupId: string) => {
    try {
      const suggestion = groupingSuggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;
      
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      
      await handleAcceptSuggestion(suggestionId, groupId, group.nome_gruppo);
      
    } catch (error: any) {
      console.error('❌ Errore selezione manuale:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      let userMessage = 'Impossibile assegnare gruppo';
      if (error.code === '23505') {
        userMessage = 'Questo mittente è già assegnato a questo gruppo';
      } else if (error.message) {
        userMessage = error.message;
      }
      
      toast({
        title: '❌ Errore',
        description: userMessage,
        variant: 'destructive',
      });
    }
  };

  // 🤖 Handler rifiuta suggerimento
  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      setGroupingSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      toast({
        title: 'Suggerimento ignorato',
        description: 'Il suggerimento è stato rimosso',
      });

    } catch (error: any) {
      console.error('❌ Errore rifiuto suggerimento:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile ignorare il suggerimento',
        variant: 'destructive',
      });
    }
  };

  // Calcola stats
  const unclassifiedSenders = senders.filter(s => !s.isClassified);
  const qualifiedGroups = groups.filter(g => (assignedSenders.get(g.id) || []).length >= 3);

  // Loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Caricamento dati in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header con stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Suggerimenti AI Raggruppamento</h2>
          <p className="text-muted-foreground">
            Sistema intelligente per organizzare mittenti in gruppi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlobalAIAgentSelector />
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={isLoadingData}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Badge variant="outline">
            {unclassifiedSenders.length} mittenti non assegnati
          </Badge>
          <Badge variant="outline">
            {qualifiedGroups.length} gruppi qualificati
          </Badge>
        </div>
      </div>
      
      {/* Sezione 1: Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Profilo Aziendale</CardTitle>
          <CardDescription>
            Configura il contesto aziendale per migliorare i suggerimenti AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyProfileSettings />
        </CardContent>
      </Card>
      
      {/* Sezione 2: Knowledge Base Generator - RIMOSSA */}
      {/* NOTA: Funzionalità spostata in Profilo Aziendale per maggiore coerenza */}
      {/* 
      <Card>
        <CardHeader>
          <CardTitle>🧠 Knowledge Base Generator</CardTitle>
          <CardDescription>
            Genera contesti AI per i gruppi esistenti (3+ mittenti)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Gruppi qualificati</p>
              <p className="text-2xl font-bold">{qualifiedGroups.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Top 3 gruppi</p>
              <p className="text-2xl font-bold">
                {Math.min(qualifiedGroups.length, 3)}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Costo stimato</p>
              <p className="text-2xl font-bold">€0.03</p>
            </div>
          </div>
          
          <Button
            onClick={handleGenerateGroupKB}
            disabled={isGeneratingKB || qualifiedGroups.length === 0}
            className="w-full"
            size="lg"
          >
            {isGeneratingKB ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generazione in corso... ({kbProgress?.current || 0}/{kbProgress?.total || 0})
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                🧠 Genera Knowledge Base (Top 3)
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Tempo: ~2-3 minuti | Migliora accuratezza suggerimenti del 60-70%
          </p>
        </CardContent>
      </Card>
      */}
      
      {/* Sezione 3: Suggerimenti Raggruppamento */}
      <Card>
        <CardHeader>
          <CardTitle>✨ Suggerimenti Raggruppamento AI</CardTitle>
          <CardDescription>
            Suggerimenti personalizzati per assegnare mittenti ai gruppi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Config Guide se configurazione mancante */}
          {aiConfigError && (
            <AIConfigurationGuide 
              error={aiConfigError} 
              onDismiss={() => setAiConfigError(null)}
            />
          )}
          
          {/* Filtro Email Minimo */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <label className="text-sm font-medium whitespace-nowrap">
              Min. email per mittente:
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={minimumEmailCount}
              onChange={(e) => setMinimumEmailCount(Number(e.target.value))}
              className="w-20"
              disabled={isGeneratingSuggestions}
            />
            <span className="text-xs text-muted-foreground">
              (Ignora mittenti con meno di {minimumEmailCount} email)
            </span>
          </div>
          
          {/* Stats mittenti */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">
                Mittenti non assegnati
              </p>
              <p className="text-xs text-muted-foreground">
                {unclassifiedSenders.filter(s => s.emailCount >= minimumEmailCount).length} mittenti con almeno {minimumEmailCount} email
              </p>
            </div>
            <Button
              onClick={handleGenerateSuggestions}
              disabled={isGeneratingSuggestions || unclassifiedSenders.filter(s => s.emailCount >= minimumEmailCount).length === 0}
              size="lg"
            >
              {isGeneratingSuggestions ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  🤖 Genera Suggerimenti ({unclassifiedSenders.filter(s => s.emailCount >= minimumEmailCount).length})
                </>
              )}
            </Button>
          </div>
          
          {/* Toolbar: ViewMode + Ordinamento */}
          {groupingSuggestions.length > 0 && (
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {/* Toggle Griglia/Elenco */}
                <ToggleGroup 
                  type="single" 
                  value={viewMode} 
                  onValueChange={(val) => val && setViewMode(val as 'grid' | 'list')}
                  className="bg-muted/30 border border-border rounded-lg p-0.5"
                >
                  <ToggleGroupItem 
                    value="list" 
                    aria-label="Vista Elenco"
                    className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    <List className="h-3.5 w-3.5 mr-1.5" />
                    Elenco
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="grid" 
                    aria-label="Vista Griglia"
                    className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    Griglia
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* Separatore */}
                <div className="h-6 w-px bg-border" />
                
                {/* Toggle Ordinamento */}
                <ToggleGroup 
                  type="single" 
                  value={sortBy} 
                  onValueChange={(val) => val && setSortBy(val as typeof sortBy)}
                  className="bg-muted/30 border border-border rounded-lg p-0.5"
                >
                  <ToggleGroupItem 
                    value="domain" 
                    aria-label="Ordina per dominio"
                    className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Dominio
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="group" 
                    aria-label="Ordina per gruppo"
                    className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
                    Gruppo
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="country" 
                    aria-label="Ordina per paese"
                    className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    🌍 Paese
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="email_count" 
                    aria-label="Ordina per numero email"
                    className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    N. Email
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Badge contatore suggerimenti */}
              <Badge variant="secondary" className="text-sm">
                {sortedSuggestions.length} suggerimenti
              </Badge>
            </div>
          )}
          
          {/* Suggerimenti - Vista Elenco o Griglia */}
          {sortedSuggestions.length > 0 ? (
            viewMode === 'list' ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {sortedSuggestions.map(suggestion => (
                  <GroupingSuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                    availableGroups={groups}
                    onAccept={handleAcceptSuggestion}
                    onSelectGroup={handleManualGroupSelection}
                    disabled={isGeneratingSuggestions}
                    emailCount={emailCounts.get(suggestion.sender_email)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedSuggestions.map(suggestion => (
                  <GroupingSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={handleAcceptSuggestion}
                    onDismiss={handleRejectSuggestion}
                    disabled={isGeneratingSuggestions}
                    emailCount={emailCounts.get(suggestion.sender_email)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessun suggerimento disponibile. Genera nuovi suggerimenti per iniziare.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 🎯 Progress Dialog Suggerimenti */}
      <SuggestionProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        progress={suggestionProgress}
        isGenerating={isGeneratingSuggestions}
      />

      {/* 🧠 Progress Dialog Knowledge Base */}
      <Dialog open={isGeneratingKB && !!kbProgress} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>🧠 Generazione Knowledge Base (Top 3)</DialogTitle>
            <DialogDescription>
              Generazione contesti AI per gruppi più popolati
            </DialogDescription>
          </DialogHeader>
          
          {kbProgress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">
                    {kbProgress.current} / {kbProgress.total}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[300px]">
                    {kbProgress.currentGroup || 'Inizializzazione...'}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${(kbProgress.current / kbProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="font-mono text-xs space-y-1 whitespace-pre-wrap">
                  {kbProgress.logs.map((log, i) => (
                    <div key={i} className={
                      log.includes('✅') ? 'text-green-600' :
                      log.includes('❌') ? 'text-red-600' :
                      log.includes('⚠️') ? 'text-yellow-600' :
                      log.includes('🎯') ? 'text-purple-600 font-semibold' :
                      'text-foreground'
                    }>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsGeneratingKB(false);
                setKbProgress(null);
              }}
              disabled={kbProgress ? kbProgress.current < kbProgress.total : false}
            >
              {kbProgress && kbProgress.current >= kbProgress.total ? 'Chiudi' : 'Annulla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🤖 Suggestions Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Suggerimenti AI Raggruppamento
            </DialogTitle>
            <DialogDescription>
              L'AI ha analizzato i mittenti e suggerisce i seguenti raggruppamenti
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {aiConfigError && (
              <AIConfigurationGuide 
                error={aiConfigError} 
                onDismiss={() => setAiConfigError(null)}
              />
            )}
            
            {groupingSuggestions.length === 0 && !aiConfigError && (
              <p className="text-center text-muted-foreground py-8">
                Nessun suggerimento disponibile. Genera suggerimenti AI per iniziare.
              </p>
            )}

            {groupingSuggestions.map((suggestion) => (
              <GroupingSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={handleAcceptSuggestion}
                onDismiss={handleRejectSuggestion}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Tab Email Management - Sistema completamente isolato FunEmail
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCenter, CollisionDetection } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Plus, Search, Filter, Loader2, LayoutGrid, Box } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeSenders } from '@/lib/email-sender-analyzer';
import { SenderCard } from './management/SenderCard';
import type { EmailSenderGroup, SenderAnalysis } from '@/types/email-management';
import { DEFAULT_GROUPS as PREDEFINED_GROUPS } from '@/types/email-management';
import { cn } from '@/lib/utils';
import { EmailSidebar } from './management/EmailSidebar';
import { EmailCarouselContainer } from './management/EmailCarouselContainer';
import { EmailGridContainer } from './management/EmailGridContainer';
import { CreateCategoryDialog } from './management/CreateCategoryDialog';
import { SenderSortControls, SortOption } from './management/SenderSortControls';
import { FloatingZoomControl } from './management/FloatingZoomControl';
import { AISidebarSlider } from '../ai/AISidebarSlider';
import { GroupingSuggestionCard } from './management/GroupingSuggestionCard';
import type { GroupingSuggestion } from '@/types/email-management';
import { Sparkles, Loader2 as LoaderIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Collisione personalizzata 70%
const carousel70PercentCollision: CollisionDetection = (args) => {
  const { droppableContainers, collisionRect } = args;
  if (!collisionRect) return [];

  const collisions = Array.from(droppableContainers).map((container) => {
    const rect = container.rect.current;
    if (!rect) return null;

    const overlapX = Math.max(0, Math.min(collisionRect.right, rect.right) - Math.max(collisionRect.left, rect.left));
    const overlapY = Math.max(0, Math.min(collisionRect.bottom, rect.bottom) - Math.max(collisionRect.top, rect.top));
    const overlapArea = overlapX * overlapY;
    const draggableArea = collisionRect.width * collisionRect.height;
    const overlapPercentage = (overlapArea / draggableArea) * 100;

    return overlapPercentage >= 70 ? { id: container.id, data: { percentage: overlapPercentage } } : null;
  }).filter(Boolean) as { id: string | number; data: { percentage: number } }[];

  return collisions;
};

// Collisione personalizzata 50% per Grid
const grid50PercentCollision: CollisionDetection = (args) => {
  const { droppableContainers, collisionRect } = args;
  if (!collisionRect) return [];

  const collisions = Array.from(droppableContainers).map((container) => {
    const rect = container.rect.current;
    if (!rect) return null;

    // Calcola area di overlap tra card draggata e gruppo target
    const overlapX = Math.max(0, Math.min(collisionRect.right, rect.right) - Math.max(collisionRect.left, rect.left));
    const overlapY = Math.max(0, Math.min(collisionRect.bottom, rect.bottom) - Math.max(collisionRect.top, rect.top));
    const overlapArea = overlapX * overlapY;
    const draggableArea = collisionRect.width * collisionRect.height;
    const overlapPercentage = (overlapArea / draggableArea) * 100;

    console.log(`🎯 Collision check ${container.id}: ${overlapPercentage.toFixed(1)}% overlap`);

    // 🆕 Richiedi almeno 50% di overlap per Grid
    return overlapPercentage >= 50 ? { id: container.id, data: { percentage: overlapPercentage } } : null;
  }).filter(Boolean) as { id: string | number; data: { percentage: number } }[];

  return collisions;
};

interface EmailManagementTabProps {
  onOpenAISidebar?: (senderEmail: string) => void;
}

export function EmailManagementTab({ onOpenAISidebar }: EmailManagementTabProps) {
  const [senders, setSenders] = useState<SenderAnalysis[]>([]);
  const [groups, setGroups] = useState<EmailSenderGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ synced: number; total: number } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByAttachments, setFilterByAttachments] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [assignedSenders, setAssignedSenders] = useState<Map<string, SenderAnalysis[]>>(new Map());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('count-desc');
  const [lastUpdatedGroupId, setLastUpdatedGroupId] = useState<string | null>(null);
  
  // 🆕 Map callbacks per aggiornamento ottimistico card gruppi
  const groupUpdateCallbacksRef = useRef<Map<string, (senderEmail: string) => void>>(new Map());
  const groupUpdateCallbacks = groupUpdateCallbacksRef.current;
  
  // 🤖 Nuovo Sistema Raggruppamento Suggerito
  const [groupingSuggestions, setGroupingSuggestions] = useState<GroupingSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  
  // Persist carousel zoom in localStorage
  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('email-carousel-zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Stato posizione verticale carousel
  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(0);
  
  const { toast } = useToast();

  // 🔄 Gruppi in ordine naturale (DB: created_at ASC) - per Carousel
  const naturalOrderGroups = useMemo(() => [...groups], [groups]);

  // 📝 Gruppi in ordine alfabetico - per Grid/Sidebar
  const alphabeticGroups = useMemo(() => {
    return [...groups].sort((a, b) => 
      a.nome_gruppo.localeCompare(b.nome_gruppo, 'it', { sensitivity: 'base' })
    );
  }, [groups]);

  // Handler per salvare zoom in localStorage
  const handleZoomChange = (zoom: number) => {
    setCarouselZoom(zoom);
    localStorage.setItem('email-carousel-zoom', zoom.toString());
  };

  // 🆕 Registrazione callback per aggiornamento ottimistico gruppi
  const registerGroupCallback = (groupId: string, callback: (senderEmail: string) => void) => {
    groupUpdateCallbacks.set(groupId, callback);
    return () => groupUpdateCallbacks.delete(groupId);
  };

  // Navigazione manuale carousel (clone Radio Chat)
  const handlePrevCategory = () => {
    if (naturalOrderGroups.length === 0) return;
    
    const currentIndex = naturalOrderGroups.findIndex(g => g.id === activeCategoryId);
    const newIndex = (currentIndex - 1 + naturalOrderGroups.length) % naturalOrderGroups.length;
    setActiveCategoryId(naturalOrderGroups[newIndex].id);
  };

  const handleNextCategory = () => {
    if (naturalOrderGroups.length === 0) return;
    
    const currentIndex = naturalOrderGroups.findIndex(g => g.id === activeCategoryId);
    const newIndex = (currentIndex + 1) % naturalOrderGroups.length;
    setActiveCategoryId(naturalOrderGroups[newIndex].id);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscription per nuove categorie
  useEffect(() => {
    const channel = supabase
      .channel('email-groups-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_sender_groups'
        },
        (payload) => {
          console.log('🆕 Nuova categoria creata:', payload.new);
          const newGroup = payload.new as EmailSenderGroup;
          setGroups(prev => {
            // Evita duplicati
            if (prev.some(g => g.id === newGroup.id)) return prev;
            return [...prev, newGroup];
          });
          setActiveCategoryId(newGroup.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time subscription per nuove regole di assegnazione
  useEffect(() => {
    const channel = supabase
      .channel('email-rules-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_sender_rules'
        },
        async (payload) => {
          console.log('🔗 Nuova regola assegnazione:', payload.new);
          const rule = payload.new as { sender_email: string; group_id: string; user_id: string };
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || rule.user_id !== user.id) return;

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('tmwe_email')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.tmwe_email) {
            const analysis = await analyzeSenders(profile.tmwe_email);
            const sender = analysis.find(s => s.email === rule.sender_email);
            
            if (sender) {
              setAssignedSenders(prev => {
                const newMap = new Map(prev);
                const existing = newMap.get(rule.group_id) || [];
                // Evita duplicati
                if (existing.some(s => s.email === sender.email)) return prev;
                newMap.set(rule.group_id, [...existing, sender]);
                return newMap;
              });

              // Rimuovi da mittenti non classificati se presente
              setSenders(prev => prev.filter(s => s.email !== rule.sender_email));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
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
        setIsLoading(false);
        return;
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from('email_sender_groups')
        .select('*')
        .order('created_at', { ascending: true });

      if (groupsError) throw groupsError;

      if (!groupsData || groupsData.length === 0) {
        console.log('📁 Creazione gruppi di default...');
        await createDefaultGroups();
        return;
      }

      setGroups(groupsData);
      console.log(`📁 Caricati ${groupsData.length} gruppi`);

      // Imposta prima categoria come attiva
      if (groupsData.length > 0 && !activeCategoryId) {
        setActiveCategoryId(groupsData[0].id);
      }

      const analysis = await analyzeSenders(profile.tmwe_email);
      
      // 🔍 Debug logging per conteggio mittenti
      console.log(`📊 Total senders analyzed: ${analysis.length}`);
      console.log(`✅ Classified senders: ${analysis.filter(s => s.isClassified).length}`);
      console.log(`❓ Unclassified senders: ${analysis.filter(s => !s.isClassified).length}`);
      
      const unclassified = analysis.filter(s => !s.isClassified);
      setSenders(unclassified);

      // Carica mittenti assegnati per gruppo via email_sender_rules
      const { data: rulesData } = await supabase
        .from('email_sender_rules')
        .select('sender_email, group_id')
        .eq('user_id', user.id);

      const sendersMap = new Map<string, SenderAnalysis[]>();
      for (const group of groupsData) {
        const groupRules = rulesData?.filter(r => r.group_id === group.id) || [];
        const groupSenders = analysis.filter(s => 
          groupRules.some(r => r.sender_email === s.email)
        );
        sendersMap.set(group.id, groupSenders);
      }
      setAssignedSenders(sendersMap);
      
      console.log(`👥 Mittenti non classificati: ${unclassified.length} / ${analysis.length}`);

      toast({
        title: '✅ Dati caricati',
        description: `${unclassified.length} mittenti da classificare`,
      });

    } catch (error: any) {
      console.error('❌ Errore caricamento:', error);
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile caricare i dati',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultGroups = async () => {
    try {
      console.log('📁 Creazione gruppi predefiniti...');
      
      const inserts = PREDEFINED_GROUPS.map(g => ({
        nome_gruppo: g.name,
        descrizione: g.description,
        colore: g.color,
        icon: g.icon,
      }));

      const { error } = await supabase
        .from('email_sender_groups')
        .insert(inserts);

      if (error) throw error;

      console.log('✅ Gruppi predefiniti creati');
      toast({
        title: '✅ Gruppi creati',
        description: `${PREDEFINED_GROUPS.length} gruppi predefiniti inizializzati`,
      });

      await loadData();

    } catch (error: any) {
      console.error('❌ Errore creazione gruppi:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile creare i gruppi predefiniti',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(null);
    
    try {
      toast({
        title: '🔄 Sincronizzazione avviata',
        description: 'Download email in corso...',
      });

      const { data, error } = await supabase.functions.invoke('tmwe-email-sync-master', {
        body: {
          mode: 'incremental',
          folder_name: 'INBOX',
          max_emails: 50,
        }
      });

      if (error) throw error;

      console.log('✅ Sync completato:', data);

      toast({
        title: '✅ Sincronizzazione completata',
        description: `${data?.synced_count || 0} nuove email sincronizzate`,
      });

      // Ricarica i dati dopo sync
      await loadData();

    } catch (error: any) {
      console.error('❌ Errore sync:', error);
      toast({
        title: '❌ Errore sincronizzazione',
        description: error.message || 'Impossibile sincronizzare le email',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleCreateCategory = async (categoryData: {
    nome_gruppo: string;
    descrizione?: string;
    colore: string;
    icon: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('email_sender_groups')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state (real-time lo farà anche, ma per feedback immediato)
      setGroups(prev => [...prev, data]);
      setActiveCategoryId(data.id);
      
      toast({
        title: '✅ Categoria creata',
        description: `${data.nome_gruppo} aggiunta al carousel`,
      });
    } catch (error: any) {
      console.error('❌ Errore creazione categoria:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile creare la categoria',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // 🆕 FUNZIONE UNIFICATA PER CLASSIFICAZIONE (drag + doppio clic)
  const handleClassifySender = async (sender: SenderAnalysis, targetGroupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const targetGroup = groups.find(g => g.id === targetGroupId);
    if (!targetGroup) {
      console.error(`❌ Gruppo target non trovato: ${targetGroupId}`);
      return;
    }

    try {
      console.log(`🎯 Classificazione mittente: ${sender.email} → ${targetGroup.nome_gruppo}`);

      // 1. Inserisci regola in email_sender_rules
      const { error: ruleError } = await supabase
        .from('email_sender_rules')
        .insert({
          user_id: user.id,
          sender_email: sender.email,
          group_id: targetGroup.id,
        });

      if (ruleError) {
        console.error('❌ Errore inserimento regola:', ruleError);
        toast({
          title: '❌ Errore',
          description: 'Impossibile classificare il mittente',
          variant: 'destructive',
        });
        return;
      }

      // 2. Aggiorna stato locale - RIMUOVI da senders
      setSenders(prev => prev.filter(s => s.email !== sender.email));

      // 3. Aggiorna assignedSenders Map
      setAssignedSenders(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(targetGroup.id) || [];
        newMap.set(targetGroup.id, [...existing, sender]);
        return newMap;
      });

      // 4. 🆕 Evidenzia ultimo gruppo aggiornato
      setLastUpdatedGroupId(targetGroup.id);

      // 5. 🆕 Trigger aggiornamento ottimistico per la card specifica (NO reload pagina)
      groupUpdateCallbacks.get(targetGroup.id)?.(sender.email);

      toast({
        title: '✅ Classificato',
        description: `${sender.companyName} → ${targetGroup.nome_gruppo}`,
      });

    } catch (error: any) {
      console.error('❌ Errore classificazione:', error);
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 🆕 HANDLER DOPPIO CLIC
  const handleDoubleClickSender = (sender: SenderAnalysis) => {
    if (!activeCategoryId) {
      toast({
        title: '⚠️ Nessuna categoria attiva',
        description: 'Seleziona una categoria nel carousel prima',
        variant: 'destructive',
      });
      return;
    }
    handleClassifySender(sender, activeCategoryId);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveDragId(null);

    // 🆕 BLOCCO 1: Verifica se è stato un vero drag o solo un click
    // Se delta.x e delta.y sono entrambi < 5px, è un click, non un drag
    const dragDistance = Math.sqrt(delta.x ** 2 + delta.y ** 2);
    const isClick = dragDistance < 5; // Threshold: 5px
    
    if (isClick) {
      console.log('🚫 Click rilevato (non drag) - nessuna azione');
      return;
    }

    // ❌ CASO 2: Nessun target valido (drop fuori da tutto)
    if (!over) {
      console.log('🚫 Drop fuori da zona valida - card torna in lista');
      return;
    }

    const sender = senders.find(s => s.email === active.id);
    if (!sender) return;

    // 🆕 VALIDAZIONE TARGET: Verifica che over.id sia carousel o gruppo valido
    const isCarouselDrop = over.id === 'email-carousel-canvas';
    const isGroupDrop = groups.some(g => g.id === over.id);

    // ❌ CASO 2: Drop su zona non valida (lista mittenti, ecc.)
    if (!isCarouselDrop && !isGroupDrop) {
      console.log('🚫 Drop su zona non valida (probabilmente lista mittenti) - card torna in lista');
      return;
    }

    // ✅ CASO 3: Drop su carousel (con categoria attiva)
    if (isCarouselDrop) {
      if (!activeCategoryId) {
        console.warn('⚠️ Nessuna categoria attiva nel carousel');
        return;
      }
      console.log(`✅ Classifico su carousel - categoria: ${activeCategoryId}`);
      handleClassifySender(sender, activeCategoryId);
      return;
    }
    
    // ✅ CASO 4: Drop su gruppo sidebar (gruppo illuminato = over.id valido)
    const targetGroup = groups.find(g => g.id === over.id);
    if (targetGroup) {
      console.log(`✅ Classifico su gruppo sidebar - gruppo: ${targetGroup.nome_gruppo}`);
      handleClassifySender(sender, targetGroup.id);
    }
  };

  const filteredSenders = senders.filter(s => {
    const matchesSearch = !searchQuery || 
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = !filterByAttachments || s.hasAttachments;
    
    return matchesSearch && matchesFilter;
  });

  // 🆕 ORDINAMENTO MITTENTI (useMemo per performance)
  const sortedSenders = useMemo(() => {
    const sorted = [...filteredSenders];
    
    switch (sortOption) {
      case 'name-asc':
        return sorted.sort((a, b) => a.companyName.localeCompare(b.companyName));
      case 'name-desc':
        return sorted.sort((a, b) => b.companyName.localeCompare(a.companyName));
      case 'count-asc':
        return sorted.sort((a, b) => a.emailCount - b.emailCount);
      case 'count-desc':
        return sorted.sort((a, b) => b.emailCount - a.emailCount);
      
      // 🆕 Ordinamento per gruppo suggerito AI
      case 'ai-group-asc':
        return sorted.sort((a, b) => {
          const suggestionA = aiSuggestions.find(s => s.sender_email === a.email);
          const suggestionB = aiSuggestions.find(s => s.sender_email === b.email);
          
          // Mittenti senza suggerimento vanno in fondo
          if (!suggestionA && !suggestionB) return 0;
          if (!suggestionA) return 1;
          if (!suggestionB) return -1;
          
          return suggestionA.suggested_group.name.localeCompare(suggestionB.suggested_group.name);
        });
      
      case 'ai-group-desc':
        return sorted.sort((a, b) => {
          const suggestionA = aiSuggestions.find(s => s.sender_email === a.email);
          const suggestionB = aiSuggestions.find(s => s.sender_email === b.email);
          
          // Mittenti senza suggerimento vanno in fondo
          if (!suggestionA && !suggestionB) return 0;
          if (!suggestionA) return 1;
          if (!suggestionB) return -1;
          
          return suggestionB.suggested_group.name.localeCompare(suggestionA.suggested_group.name);
        });
      
      default:
        return sorted;
    }
  }, [filteredSenders, sortOption, aiSuggestions]);
  
  // 🤖 AI Categorization Handlers - Step 1: Prepare and show confirm dialog
  const handleAISuggestions = async () => {
    // 1. Get all unclassified senders
    const allUnclassified = senders.filter(s => !s.isClassified);
    
    // 🆕 2. Filter by minimum emails threshold
    const unclassifiedSenders = allUnclassified.filter(
      s => s.emailCount >= minEmailsThreshold
    );
    
    const skippedCount = allUnclassified.length - unclassifiedSenders.length;
    
    if (unclassifiedSenders.length === 0) {
      toast({
        title: skippedCount > 0 
          ? `ℹ️ Tutti i mittenti hanno < ${minEmailsThreshold} email`
          : 'ℹ️ Nessun mittente da classificare',
        description: skippedCount > 0
          ? `${skippedCount} mittenti esclusi (soglia: ${minEmailsThreshold}+ email). Verranno analizzati quando scriveranno di più.`
          : 'Tutti i mittenti sono già stati assegnati a gruppi',
      });
      return;
    }
    
    // 3. Calculate cost preview
    const MAX_EMAILS_PER_SENDER = 5;
    const cost = calculateEstimatedCost(
      unclassifiedSenders.length, 
      MAX_EMAILS_PER_SENDER,
      selectedAIModel
    );
    
    setEstimatedCost(cost);
    setUnclassifiedCount(unclassifiedSenders.length);
    setShowAIConfirmDialog(true);
    
    // 🆕 Show info about skipped senders
    if (skippedCount > 0) {
      setTimeout(() => {
        toast({
          title: `⏭️ ${skippedCount} mittenti esclusi`,
          description: `Mittenti con < ${minEmailsThreshold} email verranno analizzati automaticamente quando scriveranno di più`,
          duration: 5000,
        });
      }, 500);
    }
  };

  // Step 2: Execute analysis after confirmation with mini-batch processing
  const startAIAnalysis = async (resumeFromIndex: number = 0) => {
    setShowAIConfirmDialog(false);
    setIsAnalyzing(true);
    
    const BATCH_SIZE = 3;
    const DELAY_BETWEEN_BATCHES = 500;
    const MAX_RETRIES_PER_BATCH = 3;
    
    try {
      const unclassifiedSenders = senders.filter(s => !s.isClassified);
      const MAX_EMAILS_PER_SENDER = 5;
      
      // 🆕 SMART RESUME: Check for already processed senders
      let batchId = resumeFromIndex === 0 ? crypto.randomUUID() : currentBatchId;
      let sendersToProcess = unclassifiedSenders;
      
      if (resumeFromIndex > 0 && currentBatchId) {
        // Resuming: exclude already processed senders
        const { data: alreadyProcessed } = await supabase
          .from('ai_categorization_suggestions')
          .select('sender_email')
          .eq('batch_id', currentBatchId);
        
        const processedEmails = new Set(alreadyProcessed?.map(s => s.sender_email) || []);
        
        sendersToProcess = unclassifiedSenders.filter(
          s => !processedEmails.has(s.email)
        );
        
        // 🆕 Escludi anche mittenti con suggerimenti pending/accepted
        const { data: anySuggestions } = await supabase
          .from('ai_categorization_suggestions')
          .select('sender_email')
          .in('status', ['pending', 'accepted']);
        
        const alreadySuggestedEmails = new Set(anySuggestions?.map(s => s.sender_email) || []);
        
        sendersToProcess = sendersToProcess.filter(
          s => !alreadySuggestedEmails.has(s.email)
        );
        
        console.log(`♻️ Resuming batch ${currentBatchId}: ${processedEmails.size} already processed, ${alreadySuggestedEmails.size} with suggestions, ${sendersToProcess.length} remaining`);
        toast({
          title: '♻️ Ripresa analisi',
          description: `${processedEmails.size} mittenti già processati, continuo con ${sendersToProcess.length} rimanenti`,
        });
      } else {
        // New analysis: check for orphaned suggestions from previous failed batch
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: recentBatch } = await supabase
          .from('ai_categorization_progress')
          .select('*')
          .eq('user_id', user?.id)
          .in('status', ['processing', 'failed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (recentBatch) {
          // Found incomplete batch, load already processed senders
          const { data: alreadyProcessed } = await supabase
            .from('ai_categorization_suggestions')
            .select('sender_email')
            .eq('batch_id', recentBatch.batch_id);
          
          if (alreadyProcessed && alreadyProcessed.length > 0) {
            // Ask user if they want to continue or start fresh
            const costSavings = (alreadyProcessed.length * 0.03).toFixed(2);
            const shouldContinue = window.confirm(
              `🔍 Trovata analisi precedente con ${alreadyProcessed.length} mittenti già analizzati.\n\n` +
              `💰 Continuare ti farà risparmiare circa €${costSavings}\n\n` +
              `✅ Clicca OK per continuare da dove ti eri interrotto\n` +
              `❌ Clicca Annulla per ricominciare da capo`
            );
            
            if (shouldContinue) {
              batchId = recentBatch.batch_id;
              setCurrentBatchId(batchId);
              
              const processedEmails = new Set(alreadyProcessed.map(s => s.sender_email));
              sendersToProcess = unclassifiedSenders.filter(
                s => !processedEmails.has(s.email)
              );
              
              // 🆕 Escludi anche mittenti con suggerimenti pending/accepted
              const { data: anySuggestions } = await supabase
                .from('ai_categorization_suggestions')
                .select('sender_email')
                .in('status', ['pending', 'accepted']);
              
              const alreadySuggestedEmails = new Set(anySuggestions?.map(s => s.sender_email) || []);
              
              sendersToProcess = sendersToProcess.filter(
                s => !alreadySuggestedEmails.has(s.email)
              );
              
              // Load existing suggestions
              await loadPartialSuggestions(batchId);
              
              console.log(`✅ Continuing batch ${batchId}: ${alreadyProcessed.length} already done, ${sendersToProcess.length} remaining`);
              
              if (!hasShownResumeToast) {
                setHasShownResumeToast(true);
                toast({
                  title: '✅ Analisi ripresa',
                  description: `Continuando da ${alreadyProcessed.length} mittenti già elaborati. Risparmio: €${costSavings}`,
                  duration: 5000,
                });
              }
            }
          }
        }
      }
      
      // 🆕 Per brand new batch: escludi mittenti con suggerimenti esistenti
      if (resumeFromIndex === 0 && !currentBatchId) {
        const { data: anySuggestions } = await supabase
          .from('ai_categorization_suggestions')
          .select('sender_email')
          .in('status', ['pending', 'accepted']);
        
        const alreadySuggestedEmails = new Set(anySuggestions?.map(s => s.sender_email) || []);
        
        sendersToProcess = sendersToProcess.filter(
          s => !alreadySuggestedEmails.has(s.email)
        );
        
        console.log(`🆕 New batch: ${alreadySuggestedEmails.size} senders already have suggestions, ${sendersToProcess.length} to process`);
      }
      
      if (sendersToProcess.length === 0) {
        toast({
          title: '✅ Analisi già completata',
          description: 'Tutti i mittenti sono già stati elaborati',
        });
        setIsAnalyzing(false);
        return;
      }
      
      // Fetch email samples (only for senders to process)
      const sendersWithEmails = await Promise.all(
        sendersToProcess.map(async (sender) => {
          const { data: emails } = await supabase
            .from('email_messages')
            .select('subject, body_text, data_ricezione')
            .eq('from_email', sender.email)
            .order('data_ricezione', { ascending: false })
            .limit(MAX_EMAILS_PER_SENDER);
          
          return {
            email: sender.email,
            email_samples: (emails || []).map(e => ({
              subject: e.subject || '',
              body_preview: e.body_text?.substring(0, 600) || '',
              date: e.data_ricezione
            }))
          };
        })
      );
      
      const existingGroups = groups.map(g => ({
        id: g.id,
        name: g.nome_gruppo,
        type: 'custom' as const,
        color: g.colore,
        icon: g.icon,
        description: g.descrizione
      }));
      
      // Set batch ID if new analysis
      if (resumeFromIndex === 0 && !currentBatchId) {
        setCurrentBatchId(batchId);
      }
      setShowProgressDialog(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Mini-batch recursive loop
      let currentIndex = resumeFromIndex;
      const totalBatches = Math.ceil(sendersToProcess.length / BATCH_SIZE);
      
      while (currentIndex < sendersToProcess.length) {
        const currentBatchNumber = Math.floor(currentIndex / BATCH_SIZE) + 1;
        console.log(`🔄 Batch ${currentBatchNumber}/${totalBatches} (mittenti ${currentIndex}-${Math.min(currentIndex + BATCH_SIZE, sendersToProcess.length)})`);
        
        let retryCount = 0;
        let batchSuccess = false;
        
        while (retryCount <= MAX_RETRIES_PER_BATCH && !batchSuccess) {
          try {
            const { data, error } = await supabase.functions.invoke(
              'fun-email-sender-categorization',
              {
                body: {
                  user_id: user?.id,
                  user_email: user?.email,
                  batch_id: batchId,
                  existing_groups: existingGroups,
                  senders: sendersWithEmails,
                  batch_start_index: currentIndex,
                  batch_size: BATCH_SIZE,
                  max_emails_per_sender: MAX_EMAILS_PER_SENDER,
                  min_emails_threshold: minEmailsThreshold // 🆕 Passa soglia al backend
                }
              }
            );
            
            if (error) throw error;
            
            // Batch completed
            currentIndex = data.next_batch_start;
            batchSuccess = true;
            
            // Load partial suggestions
            await loadPartialSuggestions(batchId);
            
            // Rate limiting delay
            if (!data.is_complete) {
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            } else {
              console.log('✅ All batches completed!');
              await handleAnalysisComplete();
            }
            
          } catch (batchError) {
            retryCount++;
            console.error(`❌ Batch ${currentBatchNumber} error (attempt ${retryCount}/${MAX_RETRIES_PER_BATCH + 1}):`, batchError);
            
            if (retryCount <= MAX_RETRIES_PER_BATCH) {
              console.log(`🔁 Retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              await supabase
                .from('ai_categorization_progress')
                .update({ 
                  status: 'failed', 
                  error_message: `Failed at batch ${currentBatchNumber} after ${MAX_RETRIES_PER_BATCH} retries`,
                  last_processed_index: currentIndex
                })
                .eq('batch_id', batchId);
              
              throw new Error(`Batch ${currentBatchNumber} failed after ${MAX_RETRIES_PER_BATCH} retries`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: '❌ Errore nell\'analisi AI',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'destructive'
      });
      setShowResumeButton(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadPartialSuggestions = useCallback(async (batchId: string) => {
    // Debouncing: evita chiamate duplicate ravvicinate
    const now = Date.now();
    if (now - lastLoadRef.current < 3000) {
      console.log('⏭️ Skip loadPartialSuggestions (too soon)');
      return;
    }
    lastLoadRef.current = now;
    
    const { data } = await supabase
      .from('ai_categorization_suggestions')
      .select('*')
      .eq('batch_id', batchId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) {
      setAiSuggestions(prev => {
        const newSuggestions = data.map(s => ({
          id: s.id,
          sender_email: s.sender_email,
          suggested_group: {
            id: s.suggested_group_id,
            name: s.suggested_group_name,
            type: s.suggested_group_type as any,
            color: s.suggested_group_color,
            icon: s.suggested_group_icon,
            is_new: s.is_new_group
          },
          confidence: s.confidence,
          reasoning: s.reasoning,
          cost: {
            tokens_input: s.tokens_input || 0,
            tokens_output: s.tokens_output || 0,
            eur: s.cost_eur || 0,
            is_free: s.model_used?.includes('gemini-2.5-flash') || false
          },
          status: 'pending' as const
        }));
        
        // Merge più efficiente senza duplicati temporanei
        const merged = new Map<string, AISuggestion>();
        
        // Prima aggiungi i vecchi
        prev.forEach(p => merged.set(p.sender_email, p));
        
        // Poi sovrascrivi con i nuovi
        newSuggestions.forEach(n => merged.set(n.sender_email, n));
        
        return Array.from(merged.values());
      });
    }
  }, []);

  // Step 3: Handle completion
  const handleAnalysisComplete = async () => {
    setHasShownResumeToast(false); // Reset flag per future analisi
    
    console.log(`🎯 handleAnalysisComplete called for batch: ${currentBatchId}`);
    
    // Reload suggestions from DB
    const { data: suggestions } = await supabase
      .from('ai_categorization_suggestions')
      .select('*')
      .eq('batch_id', currentBatchId)
      .eq('status', 'pending');
    
    console.log(`📊 Found ${suggestions?.length || 0} pending suggestions for batch ${currentBatchId}`);
    
    if (suggestions && suggestions.length > 0) {
      const mappedSuggestions = suggestions.map(s => ({
        id: s.id,
        sender_email: s.sender_email,
        suggested_group: {
          id: s.suggested_group_id,
          name: s.suggested_group_name,
          type: s.suggested_group_type as any,
          color: s.suggested_group_color,
          icon: s.suggested_group_icon,
          is_new: s.is_new_group
        },
        confidence: s.confidence,
        reasoning: s.reasoning,
        cost: {
          tokens_input: s.tokens_input || 0,
          tokens_output: s.tokens_output || 0,
          eur: s.cost_eur || 0,
          is_free: s.model_used?.includes('gemini-2.5-flash') || false
        },
        status: 'pending' as const
      }));
      
      setAiSuggestions(mappedSuggestions);
      
      // 🔥 FIX: Toast e dialog apertura UNA VOLTA SOLA
      toast({
        title: '✅ Analisi completata',
        description: `${suggestions.length} suggerimenti pronti per la revisione`,
        duration: 5000,
      });
      
      // Auto-open suggestions dialog after brief delay
      setTimeout(() => {
        console.log(`🚀 Opening suggestions dialog with ${mappedSuggestions.length} suggestions`);
        setShowAISuggestionsDialog(true);
      }, 500);
    } else {
      console.warn(`⚠️ No suggestions found for batch ${currentBatchId}`);
      
      toast({
        title: 'ℹ️ Analisi completata',
        description: 'Nessun suggerimento generato per questo batch',
        duration: 3000,
      });
    }
    
    // 🆕 FIX: Reload data to update sender list
    await loadData();
    
    setShowProgressDialog(false);
  };
  
  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    try {
      let groupId = suggestion.suggested_group.id;
      const { data: { user } } = await supabase.auth.getUser();
      
      // Se nuovo gruppo, crealo
      if (suggestion.suggested_group.is_new) {
        const { data: newGroup, error: createError } = await supabase
          .from('email_sender_groups')
          .insert({
            nome_gruppo: suggestion.suggested_group.name,
            descrizione: suggestion.suggested_group.description,
            colore: suggestion.suggested_group.color || getDefaultColorForType(suggestion.suggested_group.type),
            icon: suggestion.suggested_group.icon || getDefaultIconForType(suggestion.suggested_group.type),
          })
          .select()
          .single();
        
        if (createError) throw createError;
        groupId = newGroup.id;
        
        toast({
          title: '✨ Nuovo gruppo creato',
          description: `Gruppo "${newGroup.nome_gruppo}" creato con successo`
        });
        await loadData();
      }
      
      // Associa mittente
      const { error: assignError } = await supabase
        .from('email_sender_rules')
        .insert({
          sender_email: suggestion.sender_email,
          group_id: groupId,
          user_id: user?.id
        });
      
      if (assignError) throw assignError;
      
      // Update suggestion status
      await supabase
        .from('ai_categorization_suggestions')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', suggestion.id);
      
      // Remove from UI
      setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Refresh
      await loadData();
      
      toast({
        title: `✅ ${suggestion.sender_email}`,
        description: `Assegnato a "${suggestion.suggested_group.name}"`
      });
      
    } catch (error) {
      console.error('Accept error:', error);
      toast({
        title: '❌ Errore nell\'accettazione',
        variant: 'destructive'
      });
    }
  };
  
  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await supabase
        .from('ai_categorization_suggestions')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', suggestionId);
      
      setAiSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      toast({
        title: 'ℹ️ Suggerimento rifiutato'
      });
    } catch (error) {
      console.error('Reject error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Caricamento dati...</p>
          <p className="text-sm text-muted-foreground">Analisi mittenti in corso</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-4 max-w-[1920px] mx-auto p-4">
      {/* 🤖 AI Categorization Section */}
      {senders.filter(s => !s.isClassified).length > 0 && (
        <Card className="border-purple-200 bg-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Categorizzazione AI Automatica
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* 🆕 Bottone Vedi Suggerimenti */}
                {aiSuggestions.length > 0 && (
                  <Button
                    onClick={() => setShowAISuggestionsDialog(true)}
                    variant="default"
                    size="sm"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                  >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Vedi {aiSuggestions.length} Suggerimenti
                  </Button>
                )}
                
                {/* Cost preview */}
                {estimatedCost && (
                  <div className="text-sm">
                    {estimatedCost.is_free ? (
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        ✅ GRATIS
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        💰 ~€{estimatedCost.eur.toFixed(4)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <CardDescription>
              L'AI analizza gli ultimi 5 messaggi per mittente e suggerisce la categoria più appropriata.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 bg-transparent">
            {/* Model selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Modello AI:</span>
              <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">
                    ✅ Gemini Flash (GRATIS)
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">
                    💰 Gemini Pro (€€)
                  </SelectItem>
                  <SelectItem value="openai/gpt-5-mini">
                    💰 GPT-5 Mini (€€)
                  </SelectItem>
                  <SelectItem value="openai/gpt-5">
                    💰💰 GPT-5 (€€€)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Analyze button */}
            <Button 
              onClick={handleAISuggestions}
              disabled={isAnalyzing || senders.filter(s => !s.isClassified).length === 0}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <LoaderIcon className="w-5 h-5 mr-2 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Analizza {senders.filter(s => !s.isClassified).length} mittenti non classificati
                  {pendingSuggestionsCount > 0 && (
                    <span className="ml-2 text-xs opacity-70">
                      (+ {pendingSuggestionsCount} con suggerimenti)
                    </span>
                  )}
                </>
              )}
            </Button>
            
            {/* Resume button (shown only after failure) */}
            {showResumeButton && (
              <Button 
                onClick={async () => {
                  const { data: progress } = await supabase
                    .from('ai_categorization_progress')
                    .select('last_processed_index')
                    .eq('batch_id', currentBatchId)
                    .maybeSingle();
                  
                  if (progress) {
                    setShowResumeButton(false);
                    const batchNum = Math.floor(progress.last_processed_index / 3) + 1;
                    console.log(`Resuming from batch ${batchNum}`);
                    await startAIAnalysis(progress.last_processed_index);
                  }
                }}
                variant="outline"
                size="lg"
                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Riprendi Analisi Interrotta
              </Button>
            )}
            
            {/* Suggestions list - RIMOSSO: ora in dialog separato */}
          </CardContent>
        </Card>
      )}
      
      {/* Main Content Area */}
      <div className="flex flex-1 h-full w-full gap-4 min-h-0">
      <DndContext
        collisionDetection={viewMode === 'carousel' ? carousel70PercentCollision : grid50PercentCollision}
        onDragEnd={handleDragEnd}
        onDragStart={(e) => setActiveDragId(e.active.id as string)}
        onDragCancel={() => setActiveDragId(null)}
      >
        {/* Sidebar - flex item */}
        <EmailSidebar
          senders={senders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterByAttachments={filterByAttachments}
          setFilterByAttachments={setFilterByAttachments}
          filteredSenders={sortedSenders}
          viewMode={viewMode}
          setViewMode={setViewMode}
          carouselZoom={carouselZoom}
          onCarouselZoomChange={handleZoomChange}
          onCreateCategory={() => setShowCreateDialog(true)}
          groups={alphabeticGroups}
          activeCategoryId={activeCategoryId}
          onCategorySelect={setActiveCategoryId}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onSync={handleSync}
          onRefresh={loadData}
          isSyncing={isSyncing}
          isLoading={isLoading}
          onSenderDoubleClick={handleDoubleClickSender}
          aiSuggestionsCount={aiSuggestions.length}
          onOpenAISuggestions={() => setShowAISuggestionsDialog(true)}
        />
        
        {/* Area principale condizionale */}
        {viewMode === 'grid' ? (
          <EmailGridContainer
            groups={alphabeticGroups}
            onRefresh={loadData}
            lastUpdatedGroupId={lastUpdatedGroupId}
            onRegisterGroupCallback={registerGroupCallback}
          />
        ) : (
          <EmailCarouselContainer
            categories={naturalOrderGroups}
            assignedSenders={assignedSenders}
            activeCategoryId={activeCategoryId}
            zoom={carouselZoom}
            verticalOffset={carouselVerticalOffset}
            onPrevious={handlePrevCategory}
            onNext={handleNextCategory}
          />
        )}

        <DragOverlay 
          dropAnimation={null}
          adjustScale={false}
          className="z-[100]"
        >
          {activeDragId ? (
            (() => {
              const sender = senders.find(s => s.email === activeDragId);
              return sender ? (
                <div className="rotate-[0.5deg] scale-[1.02] shadow-lg">
                  <SenderCard sender={sender} isDragging dragOverlayStyle />
                </div>
              ) : null;
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Floating Zoom Control - Visibile solo in modalità carousel */}
      {viewMode === 'carousel' && (
        <FloatingZoomControl 
          zoom={carouselZoom} 
          onZoomChange={handleZoomChange}
          verticalOffset={carouselVerticalOffset}
          onVerticalOffsetChange={setCarouselVerticalOffset}
        />
      )}

      {/* Dialog creazione categoria */}
      <CreateCategoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateCategory}
        existingNames={alphabeticGroups.map(g => g.nome_gruppo)}
      />

      {/* AI Confirm Dialog */}
      <Dialog open={showAIConfirmDialog} onOpenChange={setShowAIConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Conferma Analisi AI
            </DialogTitle>
            <DialogDescription>
              Analizza {unclassifiedCount} mittenti non classificati con intelligenza artificiale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Modello AI</label>
              <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">
                    Gemini Flash (Gratuito)
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">
                    Gemini Pro (€0.125/1M tokens)
                  </SelectItem>
                  <SelectItem value="openai/gpt-5-mini">
                    GPT-5 Mini (€0.15/1M tokens)
                  </SelectItem>
                  <SelectItem value="openai/gpt-5">
                    GPT-5 (€5/1M tokens)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {estimatedCost && (
              <div className="rounded-lg bg-muted p-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mittenti da analizzare</span>
                    <span className="font-medium">{unclassifiedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo stimato</span>
                    <span className={cn("font-medium", estimatedCost.is_free ? "text-green-600" : "")}>
                      {estimatedCost.is_free ? 'GRATIS' : `€${estimatedCost.eur.toFixed(4)}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 🆕 Filtro soglia email minime */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  📊 Soglia email minime
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Analizza solo mittenti con almeno <strong>{minEmailsThreshold}</strong> email ricevute
                </p>
                
                <Select 
                  value={minEmailsThreshold.toString()} 
                  onValueChange={(val) => {
                    const newValue = parseInt(val);
                    setMinEmailsThreshold(newValue);
                    localStorage.setItem('ai-min-emails-threshold', val);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      Tutti i mittenti (≥1 email)
                    </SelectItem>
                    <SelectItem value="2">
                      Mittenti ricorrenti (≥2 email) - Consigliato
                    </SelectItem>
                    <SelectItem value="3">
                      Mittenti frequenti (≥3 email)
                    </SelectItem>
                    <SelectItem value="5">
                      Mittenti abituali (≥5 email)
                    </SelectItem>
                    <SelectItem value="10">
                      Mittenti consolidati (≥10 email)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Info risparmio */}
              {(() => {
                const allUnclassified = senders.filter(s => !s.isClassified);
                const filtered = allUnclassified.filter(s => s.emailCount >= minEmailsThreshold);
                const skipped = allUnclassified.length - filtered.length;
                const savedCost = skipped * 0.03;
                
                return skipped > 0 ? (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      💰 <strong>Risparmio stimato:</strong> €{savedCost.toFixed(2)}<br/>
                      ⏭️ <strong>Mittenti esclusi:</strong> {skipped} (verranno analizzati quando scriveranno di più)
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIConfirmDialog(false)}>
              Annulla
            </Button>
            <Button onClick={() => startAIAnalysis()}>
              <Sparkles className="mr-2 h-4 w-4" />
              Avvia Analisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Progress Dialog */}
      <AICategorizationProgressDialog
        open={showProgressDialog}
        batchId={currentBatchId}
        onClose={() => setShowProgressDialog(false)}
        onComplete={handleAnalysisComplete}
      />

      {/* 🆕 Dialog Suggerimenti AI */}
      <Dialog open={showAISuggestionsDialog} onOpenChange={setShowAISuggestionsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Suggerimenti AI ({aiSuggestions.length})
            </DialogTitle>
            <DialogDescription>
              Gestisci i suggerimenti di categorizzazione generati dall'intelligenza artificiale
            </DialogDescription>
          </DialogHeader>

          {/* Filtro soglia email */}
          <div className="flex gap-3 items-center pb-3 border-b">
            <label className="text-sm font-medium whitespace-nowrap">
              📊 Mostra mittenti con:
            </label>
            <Select 
              value={suggestionFilterMinEmails.toString()} 
              onValueChange={(val) => setSuggestionFilterMinEmails(parseInt(val))}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="1">≥1 email</SelectItem>
                <SelectItem value="2">≥2 email</SelectItem>
                <SelectItem value="3">≥3 email</SelectItem>
                <SelectItem value="5">≥5 email</SelectItem>
                <SelectItem value="10">≥10 email</SelectItem>
                <SelectItem value="20">≥20 email</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Info mittenti filtrati */}
            {(() => {
              const filteredCount = aiSuggestions.filter(s => {
                const sender = senders.find(snd => snd.email === s.sender_email);
                return sender && sender.emailCount >= suggestionFilterMinEmails;
              }).length;
              
              return filteredCount !== aiSuggestions.length ? (
                <span className="text-xs text-muted-foreground">
                  ({filteredCount}/{aiSuggestions.length} visibili)
                </span>
              ) : null;
            })()}
          </div>

          {/* Lista suggerimenti scrollabile */}
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {(() => {
              // 🔍 Debug: Log totali suggerimenti e filtrati
              const filteredSuggestions = aiSuggestions.filter(suggestion => {
                const sender = senders.find(s => s.email === suggestion.sender_email);
                const matches = sender && sender.emailCount >= suggestionFilterMinEmails;
                
                if (!sender) {
                  console.warn(`⚠️ Sender not found for suggestion: ${suggestion.sender_email}`);
                }
                
                return matches;
              });
              
              console.log(`📊 Suggestions Dialog State:`, {
                total: aiSuggestions.length,
                totalSenders: senders.length,
                filterThreshold: suggestionFilterMinEmails,
                filtered: filteredSuggestions.length,
                dialogOpen: showAISuggestionsDialog
              });
              
              return filteredSuggestions.map(suggestion => (
                <SenderAISuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={(s) => {
                    handleAcceptSuggestion(s);
                  }}
                  onReject={(id) => {
                    handleRejectSuggestion(id);
                  }}
                />
              ));
            })()}
            
            {/* Empty state */}
            {aiSuggestions.filter(s => {
              const sender = senders.find(snd => snd.email === s.sender_email);
              return sender && sender.emailCount >= suggestionFilterMinEmails;
            }).length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {aiSuggestions.length > 0 
                    ? `Nessun suggerimento con ≥${suggestionFilterMinEmails} email`
                    : 'Nessun suggerimento disponibile'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {aiSuggestions.length > 0 
                    ? 'Riduci la soglia per vedere più suggerimenti'
                    : 'Avvia un\'analisi AI per generare suggerimenti'}
                </p>
              </div>
            )}
          </div>

          {/* Footer con azioni */}
          <div className="flex justify-between items-center pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAISuggestionsDialog(false)}
            >
              Chiudi
            </Button>
            
            {aiSuggestions.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const filtered = aiSuggestions.filter(s => {
                    const sender = senders.find(snd => snd.email === s.sender_email);
                    return sender && sender.emailCount >= suggestionFilterMinEmails;
                  });
                  
                  filtered.forEach(s => handleAcceptSuggestion(s));
                  toast({
                    title: '✅ Suggerimenti accettati',
                    description: `${filtered.length} mittenti assegnati ai gruppi`,
                  });
                  setShowAISuggestionsDialog(false);
                }}
                disabled={aiSuggestions.filter(s => {
                  const sender = senders.find(snd => snd.email === s.sender_email);
                  return sender && sender.emailCount >= suggestionFilterMinEmails;
                }).length === 0}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Accetta Tutti Visibili
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      </div>
    </div>
  );
}

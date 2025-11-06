/**
 * Tab Email Management - Sistema completamente isolato FunEmail
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, CollisionDetection } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeSenders } from '@/lib/email-sender-analyzer';
import { SenderCard } from './management/SenderCard';
import type { EmailSenderGroup, SenderAnalysis } from '@/types/email-management';
import { DEFAULT_GROUPS as PREDEFINED_GROUPS } from '@/types/email-management';
import { EmailSidebar } from './management/EmailSidebar';
import { EmailCarouselContainer } from './management/EmailCarouselContainer';
import { EmailGridContainer } from './management/EmailGridContainer';
import { CreateCategoryDialog } from './management/CreateCategoryDialog';
import { SortOption } from './management/SenderSortControls';
import type { GroupingSuggestion } from '@/types/email-management';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GroupingSuggestionCard } from './management/GroupingSuggestionCard';
import { AIConfigurationGuide } from './management/AIConfigurationGuide';

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

    const overlapX = Math.max(0, Math.min(collisionRect.right, rect.right) - Math.max(collisionRect.left, rect.left));
    const overlapY = Math.max(0, Math.min(collisionRect.bottom, rect.bottom) - Math.max(collisionRect.top, rect.top));
    const overlapArea = overlapX * overlapY;
    const draggableArea = collisionRect.width * collisionRect.height;
    const overlapPercentage = (overlapArea / draggableArea) * 100;

    console.log(`🎯 Collision check ${container.id}: ${overlapPercentage.toFixed(1)}% overlap`);

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
  const [aiConfigError, setAiConfigError] = useState<string | null>(null);
  
  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('email-carousel-zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

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

  const handleZoomChange = (zoom: number) => {
    setCarouselZoom(zoom);
    localStorage.setItem('email-carousel-zoom', zoom.toString());
  };

  // 🆕 Registrazione callback per aggiornamento ottimistico gruppi
  const registerGroupCallback = (groupId: string, callback: (senderEmail: string) => void) => {
    groupUpdateCallbacks.set(groupId, callback);
    return () => groupUpdateCallbacks.delete(groupId);
  };

  // Navigazione manuale carousel
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
                if (existing.some(s => s.email === sender.email)) return prev;
                newMap.set(rule.group_id, [...existing, sender]);
                return newMap;
              });

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
        setGroupingSuggestions(suggestions as GroupingSuggestion[]);
        console.log(`🤖 Caricati ${suggestions.length} suggerimenti AI pending`);
        
        // Auto-mostra dialog se ci sono suggerimenti
        setShowSuggestionsDialog(true);
      }
    } catch (error: any) {
      console.error('❌ Errore caricamento suggerimenti:', error);
    }
  };

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

      if (groupsData.length > 0 && !activeCategoryId) {
        setActiveCategoryId(groupsData[0].id);
      }

      const analysis = await analyzeSenders(profile.tmwe_email);
      
      console.log(`📊 Total senders analyzed: ${analysis.length}`);
      console.log(`✅ Classified senders: ${analysis.filter(s => s.isClassified).length}`);
      console.log(`❓ Unclassified senders: ${analysis.filter(s => !s.isClassified).length}`);
      
      const unclassified = analysis.filter(s => !s.isClassified);
      setSenders(unclassified);

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

      // 🤖 Carica suggerimenti AI pending
      await loadGroupingSuggestions(profile.tmwe_email);

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

      setSenders(prev => prev.filter(s => s.email !== sender.email));

      setAssignedSenders(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(targetGroup.id) || [];
        newMap.set(targetGroup.id, [...existing, sender]);
        return newMap;
      });

      setLastUpdatedGroupId(targetGroup.id);

      const callback = groupUpdateCallbacks.get(targetGroup.id);
      if (callback) {
        callback(sender.email);
      }

      toast({
        title: '✅ Mittente classificato',
        description: `${sender.companyName} → ${targetGroup.nome_gruppo}`,
      });

    } catch (error) {
      console.error('❌ Errore inaspettato:', error);
    }
  };

  // Handler drag-and-drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) {
      console.log('🚫 Drop annullato (fuori zona)');
      return;
    }

    const senderEmail = active.id as string;
    const targetGroupId = over.id as string;

    const sender = senders.find(s => s.email === senderEmail);
    const targetGroup = groups.find(g => g.id === targetGroupId);

    if (!sender || !targetGroup) {
      console.error(`❌ Mittente o gruppo non valido: sender=${sender}, group=${targetGroup}`);
      return;
    }

    console.log(`📦 Drop: ${sender.email} → ${targetGroup.nome_gruppo}`);
    handleClassifySender(sender, targetGroupId);
  };

  // 🆕 Handler doppio clic su card mittente per assegnazione rapida via AI Sidebar
  const handleDoubleClickSender = (sender: SenderAnalysis) => {
    console.log(`🎯 Doppio click su mittente: ${sender.email}`);
    onOpenAISidebar?.(sender.email);
  };

  // 🤖 NUOVO SISTEMA - Genera suggerimenti raggruppamento
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

      // Filtra solo mittenti non classificati
      const unclassifiedSenders = senders.filter(s => !s.isClassified);
      
      if (unclassifiedSenders.length === 0) {
        toast({
          title: 'Nessun mittente da classificare',
          description: 'Tutti i mittenti sono già assegnati a un gruppo',
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Per ogni mittente non classificato
      for (const sender of unclassifiedSenders) {
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
            continue;
          }

          if (!emailSamples || emailSamples.length === 0) {
            console.log(`⚠️ Nessuna email trovata per ${sender.email}`);
            continue;
          }

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
              user_email: profile.tmwe_email
            }
          });

          if (error) {
            console.error(`❌ Errore suggerimento per ${sender.email}:`, error);
            errorCount++;
            continue;
          }

          console.log(`✅ Suggerimenti generati per ${sender.email}:`, data);
          successCount++;

        } catch (senderError: any) {
          console.error(`❌ Errore processando ${sender.email}:`, senderError);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: '✅ Suggerimenti generati',
          description: `${successCount} mittenti processati. Controlla la tabella email_sender_grouping_suggestions`,
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
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile generare i suggerimenti',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // 🤖 Handler accetta suggerimento
  const handleAcceptSuggestion = async (suggestionId: string, groupId: string | null, groupName: string) => {
    try {
      const suggestion = groupingSuggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      const sender = senders.find(s => s.email === suggestion.sender_email);
      if (!sender) return;

      // If group_id is null, we need to create a new group first
      let targetGroupId = groupId;
      if (!targetGroupId) {
        // Create new group
        const { data: newGroup, error: createError } = await supabase
          .from('email_sender_groups')
          .insert({
            nome_gruppo: groupName,
            colore: '#3B82F6',
            icon: '📧'
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Errore creazione gruppo:', createError);
          toast({
            title: '❌ Errore',
            description: 'Impossibile creare il nuovo gruppo',
            variant: 'destructive',
          });
          return;
        }

        targetGroupId = newGroup.id;
        setGroups(prev => [...prev, newGroup]);
      }

      await handleClassifySender(sender, targetGroupId);

      setGroupingSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      toast({
        title: '✅ Suggerimento accettato',
        description: `${sender.companyName} assegnato a ${groupName}`,
      });

    } catch (error: any) {
      console.error('❌ Errore accettazione suggerimento:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile accettare il suggerimento',
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
      console.error('❌ Errore rifiuto suggerimento:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile ignorare il suggerimento',
        variant: 'destructive',
      });
    }
  };

  // Filter & sort senders
  const filteredSenders = senders.filter(s => {
    const matchesSearch = !searchQuery || 
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = !filterByAttachments || s.hasAttachments;
    
    return matchesSearch && matchesFilter;
  });

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
      default:
        return sorted;
    }
  }, [filteredSenders, sortOption]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Analisi mittenti in corso</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-4 max-w-[1920px] mx-auto p-4">
      {/* 🤖 Nuovo Sistema Suggerimenti */}
      {senders.filter(s => !s.isClassified).length > 0 && (
        <Card className="border-purple-200 bg-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Suggerimenti AI Raggruppamento
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4 bg-transparent">
            <Button 
              onClick={handleGenerateSuggestions}
              disabled={isGeneratingSuggestions || senders.filter(s => !s.isClassified).length === 0}
              className="w-full"
              size="lg"
            >
              {isGeneratingSuggestions ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  🤖 Suggerisci Raggruppamenti ({senders.filter(s => !s.isClassified).length} mittenti)
                </>
              )}
            </Button>
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
        {/* Sidebar */}
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
      </div>

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateCategory}
        existingNames={groups.map(g => g.nome_gruppo)}
      />

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

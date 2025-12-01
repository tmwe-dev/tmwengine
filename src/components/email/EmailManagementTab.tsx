/**
 * Tab Email Management - Sistema completamente isolato FunEmail
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Loader2 } from 'lucide-react';
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
import { GlobalDragGhost } from './management/GlobalDragGhost';
import { SortOption } from './management/SenderSortControls';
import { FloatingZoomControl } from './management/FloatingZoomControl';
import { QuickActionsCard } from './QuickActionsCard';

interface EmailManagementTabProps {
  onOpenAISidebar?: (senderEmail: string) => void;
}

export function EmailManagementTab({ onOpenAISidebar }: EmailManagementTabProps) {
  const [senders, setSenders] = useState<SenderAnalysis[]>([]);
  const [groups, setGroups] = useState<EmailSenderGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ synced: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByAttachments, setFilterByAttachments] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [assignedSenders, setAssignedSenders] = useState<Map<string, SenderAnalysis[]>>(new Map());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('count-desc');
  const [lastUpdatedGroupId, setLastUpdatedGroupId] = useState<string | null>(null);
  
  // 🆕 State per drag tracking nativo (solo sender per collision detection)
  const [activeDrag, setActiveDrag] = useState<SenderAnalysis | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  
  // 🆕 Map callbacks per aggiornamento ottimistico card gruppi
  const groupUpdateCallbacksRef = useRef<Map<string, (senderEmail: string) => void>>(new Map());
  const groupUpdateCallbacks = groupUpdateCallbacksRef.current;
  
  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('email-carousel-zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(0);
  
  const { toast } = useToast();

  // 🆕 Listener globale per collision detection durante drag HTML5
  useEffect(() => {
    if (!activeDrag) return;

    const handleDrag = (e: DragEvent) => {
      // Ignora eventi fake (clientX/Y = 0 durante drag)
      if (e.clientX === 0 && e.clientY === 0) return;
      
      // Collision detection in real-time
      const dropZones = document.querySelectorAll('[data-drop-zone="true"]');
      let foundHover = false;
      
      dropZones.forEach(zone => {
        const rect = zone.getBoundingClientRect();
        const isOver = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
        
        if (isOver) {
          const groupId = zone.getAttribute('data-group-id');
          if (groupId) {
            setHoveredGroupId(groupId);
            foundHover = true;
          }
        }
      });
      
      if (!foundHover) {
        setHoveredGroupId(null);
      }
    };

    document.addEventListener('drag', handleDrag);
    return () => document.removeEventListener('drag', handleDrag);
  }, [activeDrag]);

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

  const handleVerticalOffsetChange = (offset: number) => {
    setCarouselVerticalOffset(offset);
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
            const analysis = await analyzeSenders(profile.tmwe_email, user.id);
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (groupsError) throw groupsError;

      if (!groupsData || groupsData.length === 0) {
        console.log('📁 Nessun gruppo trovato per questo utente');
        
        // Verifica se è la prima chiamata (evita loop infinito)
        const isFirstLoad = !localStorage.getItem(`groups_init_attempted_${user.id}`);
        
        if (isFirstLoad) {
          console.log('📁 Tentativo creazione gruppi predefiniti...');
          localStorage.setItem(`groups_init_attempted_${user.id}`, 'true');
          await createDefaultGroups();
          return;
        } else {
          console.warn('⚠️ Gruppi non creati, utente deve crearli manualmente');
          setGroups([]);
          setSenders([]);
          return;
        }
      }

      setGroups(groupsData);
      console.log(`📁 Caricati ${groupsData.length} gruppi`);

      if (groupsData.length > 0 && !activeCategoryId) {
        setActiveCategoryId(groupsData[0].id);
      }

      const analysis = await analyzeSenders(profile.tmwe_email, user.id);
      
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

      // 🔴 Toast rimosso - comportamento silenzioso al caricamento dati

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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const inserts = PREDEFINED_GROUPS.map(g => ({
        nome_gruppo: g.name,
        descrizione: g.description,
        colore: g.color,
        icon: g.icon,
        user_id: user.id,
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
      console.error('❌ Errore creazione gruppi:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Se errore di duplicazione (gruppi già esistenti), ricarica dati
      if (error.code === '23505') {
        console.warn('⚠️ Gruppi predefiniti già esistenti, ricarico...');
        await loadData();
        return;
      }
      
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile creare i gruppi predefiniti',
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

      const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          handler: 'email_sync_master',
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('email_sender_groups')
        .insert({
          ...categoryData,
          user_id: user.id
        })
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

  // 🆕 NUOVO: Handler drag start (HTML5 native)
  const handleDragStart = (sender: SenderAnalysis) => {
    setActiveDrag(sender);
  };


  // 🆕 NUOVO: Handler drag end con drop logic
  const handleDragEnd = async (clientX: number, clientY: number) => {
    if (!activeDrag) return;
    
    const dropZones = document.querySelectorAll('[data-drop-zone="true"]');
    let targetGroupId: string | null = null;
    
    dropZones.forEach(zone => {
      const rect = zone.getBoundingClientRect();
      const isOver = (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
      
      if (isOver) {
        targetGroupId = zone.getAttribute('data-group-id');
      }
    });
    
    if (targetGroupId) {
      await handleClassifySender(activeDrag, targetGroupId);
    } else {
      console.log('🚫 Drop annullato (fuori zona)');
    }
    
    setActiveDrag(null);
    setHoveredGroupId(null);
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

      if (ruleError) throw ruleError;

      // Aggiornamento ottimistico locale
      setSenders(prev => prev.filter(s => s.email !== sender.email));
      setAssignedSenders(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(targetGroup.id) || [];
        newMap.set(targetGroup.id, [...existing, sender]);
        return newMap;
      });

      setLastUpdatedGroupId(targetGroup.id);

      // Notifica callback per update card gruppo
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

  // 🆕 Handler doppio clic su card mittente per assegnazione rapida via AI Sidebar
  const handleDoubleClickSender = (sender: SenderAnalysis) => {
    console.log(`🎯 Doppio click su mittente: ${sender.email}`);
    onOpenAISidebar?.(sender.email);
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
    <div className="flex flex-col h-full w-full gap-4">
      {/* Main Content Area */}
      <div className="flex flex-1 h-full w-full gap-4 min-h-0">
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
          groups={naturalOrderGroups}
          activeCategoryId={activeCategoryId}
          onCategorySelect={setActiveCategoryId}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onSync={handleSync}
          onRefresh={loadData}
          isSyncing={isSyncing}
          isLoading={isLoading}
          onSenderDoubleClick={handleDoubleClickSender}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
        
        {/* Area principale condizionale */}
        {viewMode === 'grid' ? (
          <EmailGridContainer
            groups={alphabeticGroups}
            onRefresh={loadData}
            lastUpdatedGroupId={lastUpdatedGroupId}
            onRegisterGroupCallback={registerGroupCallback}
            hoveredGroupId={hoveredGroupId}
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
            hoveredGroupId={hoveredGroupId}
          />
        )}
        
        {/* 🎛️ Controlli Zoom e Vertical Offset - Solo in modalità Carousel */}
        {viewMode === 'carousel' && (
          <FloatingZoomControl
            zoom={carouselZoom}
            onZoomChange={handleZoomChange}
            verticalOffset={carouselVerticalOffset}
            onVerticalOffsetChange={handleVerticalOffsetChange}
            position="right"
          />
        )}
      </div>

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateCategory}
        existingNames={groups.map(g => g.nome_gruppo)}
      />

    </div>
  );
}

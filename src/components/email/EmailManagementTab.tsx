/**
 * Tab Email Management - Sistema completamente isolato FunEmail
 */

import { useState, useEffect, useMemo } from 'react';
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

// Collisione personalizzata 80%
const carousel80PercentCollision: CollisionDetection = (args) => {
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

    return overlapPercentage >= 80 ? { id: container.id, data: { percentage: overlapPercentage } } : null;
  }).filter(Boolean) as { id: string | number; data: { percentage: number } }[];

  return collisions;
};

export function EmailManagementTab() {
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
  
  // Persist carousel zoom in localStorage
  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('email-carousel-zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Stato posizione verticale carousel
  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(0);
  
  const { toast } = useToast();

  // Handler per salvare zoom in localStorage
  const handleZoomChange = (zoom: number) => {
    setCarouselZoom(zoom);
    localStorage.setItem('email-carousel-zoom', zoom.toString());
  };

  // Navigazione manuale carousel (clone Radio Chat)
  const handlePrevCategory = () => {
    if (groups.length === 0) return;
    
    const currentIndex = groups.findIndex(g => g.id === activeCategoryId);
    const newIndex = (currentIndex - 1 + groups.length) % groups.length;
    setActiveCategoryId(groups[newIndex].id);
  };

  const handleNextCategory = () => {
    if (groups.length === 0) return;
    
    const currentIndex = groups.findIndex(g => g.id === activeCategoryId);
    const newIndex = (currentIndex + 1) % groups.length;
    setActiveCategoryId(groups[newIndex].id);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const sender = senders.find(s => s.email === active.id);
    if (!sender) return;

    // Determina gruppo target: da drop zone o da carousel
    let targetGroup: EmailSenderGroup | undefined;
    if (over.id === 'email-carousel-canvas' && viewMode === 'carousel' && activeCategoryId) {
      targetGroup = groups.find(g => g.id === activeCategoryId);
    } else {
      targetGroup = groups.find(g => g.id === over.id);
    }
    
    if (!targetGroup) return;

    console.log(`📧 Classificazione: ${sender.email} → ${targetGroup.nome_gruppo}`);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('email_sender_rules')
        .insert({
          sender_email: sender.email,
          group_id: targetGroup.id,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: '✅ Mittente classificato',
        description: `${sender.companyName} → ${targetGroup.nome_gruppo}`,
      });

      setSenders(prev => prev.filter(s => s.email !== sender.email));

      // Aggiorna assignedSenders per carousel
      setAssignedSenders(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(targetGroup.id) || [];
        newMap.set(targetGroup.id, [...existing, sender]);
        return newMap;
      });

    } catch (error: any) {
      console.error('❌ Errore classificazione:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile classificare il mittente',
        variant: 'destructive',
      });
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
      default:
        return sorted;
    }
  }, [filteredSenders, sortOption]);

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
    <div className="flex h-full w-full gap-4 max-w-[1920px] mx-auto overflow-visible">
      <DndContext
        collisionDetection={viewMode === 'carousel' ? carousel80PercentCollision : closestCenter}
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
          groups={groups}
          activeCategoryId={activeCategoryId}
          onCategorySelect={setActiveCategoryId}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onSync={handleSync}
          onRefresh={loadData}
          isSyncing={isSyncing}
          isLoading={isLoading}
        />
        
        {/* Area principale condizionale */}
        {viewMode === 'grid' ? (
          <EmailGridContainer
            groups={groups}
            onRefresh={loadData}
          />
        ) : (
          <EmailCarouselContainer
            categories={groups}
            assignedSenders={assignedSenders}
            activeCategoryId={activeCategoryId}
            zoom={carouselZoom}
            verticalOffset={carouselVerticalOffset}
            onPrevious={handlePrevCategory}
            onNext={handleNextCategory}
          />
        )}

        <DragOverlay dropAnimation={null}>
          {activeDragId ? (
            <div className="opacity-90 rotate-3 scale-110 shadow-2xl">
              {(() => {
                const sender = senders.find(s => s.email === activeDragId);
                return sender ? <SenderCard sender={sender} isDragging /> : null;
              })()}
            </div>
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
        existingNames={groups.map(g => g.nome_gruppo)}
      />
    </div>
  );
}

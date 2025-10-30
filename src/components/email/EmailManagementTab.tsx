/**
 * Tab Email Management - Sistema completamente isolato FunEmail
 */

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCenter, CollisionDetection } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Plus, Search, Filter, Loader2, LayoutGrid, Box } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeSenders } from '@/lib/email-sender-analyzer';
import { SenderCard } from './management/SenderCard';
import { GroupDropZone } from './management/GroupDropZone';
import type { EmailSenderGroup, SenderAnalysis } from '@/types/email-management';
import { DEFAULT_GROUPS as PREDEFINED_GROUPS } from '@/types/email-management';
import { cn } from '@/lib/utils';
import EmailCarousel3D from './management/EmailCarousel3D';

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
  const { toast } = useToast();

  useEffect(() => {
    loadData();
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
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold">📬 Email Management</h2>
          <p className="text-sm text-muted-foreground">
            Classifica i mittenti trascinandoli nei gruppi
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Griglia
          </Button>
          <Button
            variant={viewMode === 'carousel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('carousel')}
          >
            <Box className="h-4 w-4 mr-2" />
            Carousel 3D
          </Button>
          <Button 
            variant="default" 
            onClick={handleSync} 
            disabled={isSyncing || isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? 'Sincronizzazione...' : 'Sincronizza Email'}
          </Button>
          <Button variant="outline" onClick={loadData} disabled={isLoading || isSyncing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Aggiorna
          </Button>
        </div>
      </div>

      <DndContext
        collisionDetection={viewMode === 'carousel' ? carousel80PercentCollision : closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={(e) => setActiveDragId(e.active.id as string)}
        onDragCancel={() => setActiveDragId(null)}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
          <div className="col-span-4 flex flex-col overflow-hidden">
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b flex-shrink-0">
                <h3 className="font-semibold mb-3 flex items-center justify-between">
                  <span>📮 Da Classificare ({filteredSenders.length})</span>
                  {senders.length !== filteredSenders.length && (
                    <span className="text-xs text-muted-foreground">
                      {senders.length} totali
                    </span>
                  )}
                </h3>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca mittente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Button
                  variant={filterByAttachments ? "default" : "outline"}
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setFilterByAttachments(!filterByAttachments)}
                >
                  <Filter className="h-3 w-3 mr-2" />
                  Solo con allegati
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredSenders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">
                      {senders.length === 0 
                        ? '🎉 Tutti i mittenti sono stati classificati!'
                        : '🔍 Nessun mittente trovato con questi filtri'
                      }
                    </p>
                  </div>
                ) : (
                  filteredSenders.map(sender => (
                    <SenderCard key={sender.email} sender={sender} />
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="col-span-8 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 pb-4">
              {groups.map(group => (
                <GroupDropZone
                  key={group.id}
                  group={group}
                  onRefresh={loadData}
                />
              ))}
            </div>
          </div>
        </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
            <div className="col-span-4 flex flex-col overflow-hidden">
              <Card className="h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold mb-3 flex items-center justify-between">
                    <span>📮 Da Classificare ({filteredSenders.length})</span>
                    {senders.length !== filteredSenders.length && (
                      <span className="text-xs text-muted-foreground">
                        {senders.length} totali
                      </span>
                    )}
                  </h3>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca mittente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Button
                    variant={filterByAttachments ? "default" : "outline"}
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setFilterByAttachments(!filterByAttachments)}
                  >
                    <Filter className="h-3 w-3 mr-2" />
                    Solo con allegati
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredSenders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">
                        {senders.length === 0 
                          ? '🎉 Tutti i mittenti sono stati classificati!'
                          : '🔍 Nessun mittente trovato con questi filtri'
                        }
                      </p>
                    </div>
                  ) : (
                    filteredSenders.map(sender => (
                      <SenderCard key={sender.email} sender={sender} />
                    ))
                  )}
                </div>
              </Card>
            </div>

            <div className="col-span-8 h-full flex flex-col overflow-hidden">
              <EmailCarousel3D
                categories={groups}
                assignedSenders={assignedSenders}
                activeCategoryId={activeCategoryId}
                onRotate={setActiveCategoryId}
              />
            </div>
          </div>
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
    </div>
  );
}

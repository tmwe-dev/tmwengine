import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CollapsibleComposerSidebar } from './CollapsibleComposerSidebar';
import { PromptLibraryColumn } from './PromptLibraryColumn';
import { CompositionCanvas } from './CompositionCanvas';
import { PromptCard } from './PromptCard';
import { PromptSection, ComposedPromptBlock, SectionGroup } from './types';
import { v4 as uuidv4 } from 'uuid';

interface PromptComposerProps {
  initialPageRoute?: string;
}

export function PromptComposer({ initialPageRoute }: PromptComposerProps) {
  const [selectedGroup, setSelectedGroup] = useState<SectionGroup | null>(null);
  const [allSections, setAllSections] = useState<PromptSection[]>([]);
  const [filteredSections, setFilteredSections] = useState<PromptSection[]>([]);
  const [globalPrompt, setGlobalPrompt] = useState<PromptSection | null>(null);
  const [composedBlocks, setComposedBlocks] = useState<ComposedPromptBlock[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load all sections on mount
  useEffect(() => {
    loadAllSections();
  }, []);

  // Load global prompt
  useEffect(() => {
    loadGlobalPrompt();
  }, []);

  // Filter sections when group changes
  useEffect(() => {
    if (selectedGroup === null) {
      setFilteredSections([]);
      return;
    }

    const typeMap: Record<SectionGroup, string[]> = {
      global: [], // Globale non va in libreria
      base: ['base', 'BASE'],
      personality: ['agent_personality'],
      style: ['CONVERSATION_STYLE', 'conversation_style'],
      orchestrator: ['ORCHESTRATOR_RULES'],
    };

    const types = typeMap[selectedGroup];
    const filtered = allSections.filter(s => types.includes(s.section_type));
    setFilteredSections(filtered);
  }, [selectedGroup, allSections]);

  const loadAllSections = async () => {
    setIsLoadingSections(true);
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('*')
        .eq('is_active', true)
        .order('section_type, order_priority');

      if (error) throw error;
      setAllSections(data || []);
    } catch (error) {
      console.error('Error loading sections:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le sezioni prompt.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSections(false);
    }
  };

  const loadGlobalPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_system_prompts')
        .select('*')
        .eq('attivo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        // Convertiamo in formato PromptSection
        setGlobalPrompt({
          id: data.id,
          section_type: 'global',
          section_name: data.nome,
          content: data.contenuto,
          thumbnail_url: null,
          is_active: true,
          order_priority: 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      }
    } catch (error) {
      console.error('Error loading global prompt:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllSections();
    setIsRefreshing(false);
    toast({
      title: "✅ Aggiornato",
      description: "Sezioni ricaricate dal database",
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    console.log('🎯 Drag End:', { 
      activeId: active.id, 
      overId: over?.id,
      activeData: active.data.current 
    });

    if (!over) {
      console.log('❌ Drop fuori target');
      return;
    }

    // Verifica se è un blocco già nel canvas (per riordino)
    const activeBlock = composedBlocks.find(b => b.id === active.id);
    
    if (activeBlock) {
      // CASO 1: Riordino blocchi esistenti nel canvas
      const overBlock = composedBlocks.find(b => b.id === over.id);
      if (overBlock) {
        const activeIndex = composedBlocks.findIndex(b => b.id === active.id);
        const overIndex = composedBlocks.findIndex(b => b.id === over.id);
        
        if (activeIndex !== overIndex) {
          const reordered = arrayMove(composedBlocks, activeIndex, overIndex);
          setComposedBlocks(reordered.map((b, i) => ({ ...b, order: i })));
          console.log('✅ Blocchi riordinati');
        }
      }
    } else {
      // CASO 2: Nuova card dalla libreria
      if (over.id === 'composition-canvas' || composedBlocks.find(b => b.id === over.id)) {
        const section = allSections.find(s => s.id === active.id);
        if (section) {
          const newBlock: ComposedPromptBlock = {
            id: uuidv4(),
            section_id: section.id,
            section_type: section.section_type,
            section_name: section.section_name,
            content: section.content,
            order: composedBlocks.length,
            is_editable: true,
          };
          setComposedBlocks([...composedBlocks, newBlock]);
          console.log('✅ Blocco aggiunto:', section.section_name);
          toast({
            title: "✅ Blocco Aggiunto",
            description: `"${section.section_name}" aggiunto al canvas`,
          });
        }
      }
    }
  };

  const handleRemoveBlock = (id: string) => {
    setComposedBlocks(composedBlocks.filter(b => b.id !== id));
  };

  const handleUpdateBlock = (id: string, content: string) => {
    setComposedBlocks(composedBlocks.map(b => 
      b.id === id ? { ...b, content } : b
    ));
  };

  const handleSaveComposition = async (name: string, targetAgent: string) => {
    setIsSaving(true);
    try {
      // Assembla contenuto finale - SOLO blocchi esplicitamente trascinati
      const finalContent = composedBlocks
        .map(b => b.content)
        .join('\n\n---\n\n');

      const sectionIds = composedBlocks.map(b => b.section_id);

      const { error } = await (supabase as any)
        .from('chat_laboratory_composed_prompts')
        .insert({
          name,
          content: finalContent,
          target_agent: targetAgent,
          section_ids: sectionIds,
          page_route: initialPageRoute || null,
          category: 'composed',
        });

      if (error) throw error;

      toast({
        title: "✅ Prompt Salvato",
        description: `"${name}" salvato con successo!`,
      });

      // Reset canvas
      setComposedBlocks([]);
    } catch (error) {
      console.error('Error saving composition:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il prompt composto.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calcola counts per sidebar
  const sectionCounts: Record<SectionGroup, number> = {
    global: globalPrompt ? 1 : 0,
    base: allSections.filter(s => ['base', 'BASE'].includes(s.section_type)).length,
    personality: allSections.filter(s => s.section_type === 'agent_personality').length,
    style: allSections.filter(s => ['CONVERSATION_STYLE', 'conversation_style'].includes(s.section_type)).length,
    orchestrator: allSections.filter(s => s.section_type === 'ORCHESTRATOR_RULES').length,
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={(event) => setActiveDragId(event.active.id as string)}
      onDragCancel={() => setActiveDragId(null)}
    >
      <div className="flex h-full">
        {/* Sidebar collassabile (20px quando chiusa) */}
        <CollapsibleComposerSidebar
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          sectionCounts={sectionCounts}
        />
        
        {/* Layout 50/50 per Library e Canvas */}
        <div className="flex-1 flex h-full overflow-hidden">
          <PromptLibraryColumn
            className="flex-1 h-full"
            sections={filteredSections}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
          <CompositionCanvas
            className="flex-1 h-full"
            blocks={composedBlocks}
            onRemoveBlock={handleRemoveBlock}
            onUpdateBlock={handleUpdateBlock}
            onSave={handleSaveComposition}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* DragOverlay per mostrare elemento draggato sopra tutto */}
      <DragOverlay dropAnimation={null}>
        {activeDragId ? (
          <div className="opacity-80 rotate-3 scale-105">
            {(() => {
              const section = allSections.find(s => s.id === activeDragId);
              if (section) {
                return <PromptCard section={section} isDragging />;
              }
              return null;
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

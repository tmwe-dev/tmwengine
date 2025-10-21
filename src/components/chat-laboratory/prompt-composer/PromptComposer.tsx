import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CollapsibleComposerSidebar } from './CollapsibleComposerSidebar';
import { PromptLibraryColumn } from './PromptLibraryColumn';
import { CompositionCanvas } from './CompositionCanvas';
import { generateThumbnailsForSections, generateThumbnailForSection } from './ThumbnailGenerator';
import { PromptCard } from './PromptCard';
import { PromptSection, ComposedPromptBlock, SectionGroup } from './types';
import { v4 as uuidv4 } from 'uuid';

export function PromptComposer() {
  const [selectedGroup, setSelectedGroup] = useState<SectionGroup | null>(null);
  const [allSections, setAllSections] = useState<PromptSection[]>([]);
  const [filteredSections, setFilteredSections] = useState<PromptSection[]>([]);
  const [globalPrompt, setGlobalPrompt] = useState<PromptSection | null>(null);
  const [composedBlocks, setComposedBlocks] = useState<ComposedPromptBlock[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; sectionName: string } | null>(null);
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

  const handleGenerateThumbnails = async () => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: filteredSections.length, sectionName: '' });
    
    try {
      const results = await generateThumbnailsForSections(
        filteredSections,
        (current, total, sectionName) => {
          setGenerationProgress({ current, total, sectionName });
        }
      );
      
      await loadAllSections(); // Reload per aggiornare thumbnails
      
      toast({
        title: "✅ Miniature Generate",
        description: `${results.success} thumbnail create con successo${results.failed > 0 ? `, ${results.failed} fallite` : ''}`,
      });
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare alcune miniature.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
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

  const handleDuplicate = async (section: PromptSection) => {
    try {
      // Crea copia nel DB con nome "- Copia"
      const newName = `${section.section_name} - Copia`;
      
      const { data, error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .insert({
          section_type: section.section_type,
          section_name: newName,
          content: section.content,
          is_active: true,
          order_priority: section.order_priority + 1,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Prompt Duplicato",
        description: `"${newName}" creato con successo!`,
      });

      // Rigenera miniatura per la nuova sezione
      if (data) {
        await generateThumbnailForSection(data.id, data.section_name, data.content);
        
        toast({
          title: "📸 Miniatura Generata",
          description: `Miniatura creata per "${newName}"`,
        });
      }

      // Ricarica sezioni
      await loadAllSections();
    } catch (error) {
      console.error('Error duplicating section:', error);
      toast({
        title: "Errore",
        description: "Impossibile duplicare il prompt.",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null); // Reset drag state

    if (!over) return;

    // Se drag dentro canvas (riordino o nuovo)
    if (over.id === 'composition-canvas' || composedBlocks.find(b => b.id === over.id)) {
      const activeBlock = composedBlocks.find(b => b.id === active.id);
      
      if (!activeBlock) {
        // Nuovo blocco dalla libreria
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
          toast({
            title: "✅ Blocco Aggiunto",
            description: `"${section.section_name}" aggiunto al canvas`,
          });
        }
      } else {
        // Riordino esistente
        const activeIndex = composedBlocks.findIndex(b => b.id === active.id);
        const overIndex = composedBlocks.findIndex(b => b.id === over.id);
        
        if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
          const reordered = arrayMove(composedBlocks, activeIndex, overIndex);
          setComposedBlocks(reordered.map((b, i) => ({ ...b, order: i })));
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
      // Assembla contenuto finale
      const finalContent = [
        globalPrompt?.content || '',
        ...composedBlocks.map(b => b.content)
      ].join('\n\n---\n\n');

      const sectionIds = composedBlocks.map(b => b.section_id);

      const { error } = await supabase
        .from('chat_laboratory_composed_prompts')
        .insert({
          name,
          content: finalContent,
          target_agent: targetAgent,
          section_ids: sectionIds,
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
        <div className="flex-1 flex overflow-hidden">
          <PromptLibraryColumn
            sections={filteredSections}
            onGenerateThumbnails={handleGenerateThumbnails}
            onRefresh={handleRefresh}
            onDuplicate={handleDuplicate}
            isGenerating={isGenerating}
            isRefreshing={isRefreshing}
            generationProgress={generationProgress}
          />
        <CompositionCanvas
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

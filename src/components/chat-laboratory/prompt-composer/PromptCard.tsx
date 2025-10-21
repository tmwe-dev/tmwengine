import { useDraggable, DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Edit, Loader2, Save, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptSection } from './types';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromptCardProps {
  section: PromptSection;
  isDragging?: boolean;
  onEdit?: () => void;
}

export function PromptCard({ section, isDragging, onEdit }: PromptCardProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(section.content);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const draggable = useDraggable({
    id: section.id,
    data: section,
  });
  
  const attributes: DraggableAttributes = draggable.attributes;
  const listeners: SyntheticListenerMap | undefined = draggable.listeners;
  const setNodeRef = draggable.setNodeRef;
  const transform = draggable.transform;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Preview: prime 150 caratteri
  const preview = section.content.substring(0, 150) + (section.content.length > 150 ? '...' : '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .update({ content: editedContent })
        .eq('id', section.id);

      if (error) throw error;

      toast({
        title: "✅ Salvato",
        description: "Modifiche salvate con successo",
      });
      
      setEditModalOpen(false);
      onEdit?.(); // Trigger refresh
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    setIsSaving(true);
    try {
      const newName = `${section.section_name} - Copia`;
      
      const { error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .insert({
          section_type: section.section_type,
          section_name: newName,
          content: editedContent,
          is_active: true,
          order_priority: section.order_priority + 1,
        });

      if (error) throw error;

      toast({
        title: "✅ Nuovo Prompt Creato",
        description: `"${newName}" salvato con successo`,
      });
      
      setEditModalOpen(false);
      onEdit?.(); // Trigger refresh
    } catch (error) {
      console.error('Error creating new:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile creare nuovo prompt",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity",
        isDragging && "opacity-50"
      )}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="p-3">
          <div className="flex items-start gap-2">
            <div className="cursor-grab active:cursor-grabbing mt-1" {...listeners} {...attributes}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm line-clamp-1">{section.section_name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {section.section_type}
              </Badge>
            </div>
            {/* Pulsante Edit */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setEditModalOpen(true);
              }}
              title="Modifica prompt"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {/* Testo preview diretto (no thumbnail) */}
          <pre className="w-full h-32 bg-muted/50 rounded p-2 text-xs overflow-hidden font-mono whitespace-pre-wrap text-foreground/80">
            {preview}
          </pre>
        </CardContent>
      </Card>

      {/* Modal editing */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline">{section.section_type}</Badge>
              {section.section_name}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm resize-none"
              placeholder="Contenuto del prompt..."
            />
          </ScrollArea>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isSaving}
            >
              Annulla
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveAsNew}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Salva Come Nuovo
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

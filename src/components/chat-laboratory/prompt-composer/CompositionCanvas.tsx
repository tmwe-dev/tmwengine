import { useDroppable, UseDroppableArguments } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Save, FileText, Loader2 } from 'lucide-react';
import { ComposedPromptBlock, PromptSection } from './types';
import { ComposedPromptBlockComponent } from './ComposedPromptBlock';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CompositionCanvasProps {
  blocks: ComposedPromptBlock[];
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, content: string) => void;
  onSave: (name: string, targetAgent: string) => Promise<void>;
  isSaving: boolean;
  className?: string;
}

export function CompositionCanvas({
  blocks,
  onRemoveBlock,
  onUpdateBlock,
  onSave,
  isSaving,
  className,
}: CompositionCanvasProps) {
  const [compositionName, setCompositionName] = useState('');
  const [targetAgent, setTargetAgent] = useState<string>('gpt-4');
  const { toast } = useToast();

  const droppableArgs: UseDroppableArguments = {
    id: 'composition-canvas',
  };
  const droppable = useDroppable(droppableArgs);
  const setNodeRef = droppable.setNodeRef;
  const isOver: boolean = droppable.isOver;

  // Calcola statistiche
  const totalChars = blocks.reduce((sum, b) => sum + b.content.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  const handleSave = async () => {
    if (!compositionName.trim()) {
      toast({
        title: "Nome richiesto",
        description: "Inserisci un nome per il prompt composto",
        variant: "destructive"
      });
      return;
    }
    await onSave(compositionName, targetAgent);
  };

  return (
    <div className={cn("flex flex-col h-full bg-muted/10", className)}>
      {/* Header Canvas */}
      <div className="p-4 border-b bg-background space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Canvas di Composizione
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="composition-name" className="text-xs">Nome Prompt</Label>
            <Input
              id="composition-name"
              placeholder="es: Renny Consulenza Logistica"
              value={compositionName}
              onChange={(e) => setCompositionName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="target-agent" className="text-xs">Target Agent</Label>
            <Select value={targetAgent} onValueChange={setTargetAgent}>
              <SelectTrigger id="target-agent" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="claude-3">Claude 3</SelectItem>
                <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "p-4 min-h-[600px] transition-colors",
            isOver && "bg-primary/5 border-2 border-dashed border-primary"
          )}
        >
          {/* Blocchi Draggable */}
          {blocks.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <p className="text-muted-foreground text-sm">
                👆 Trascina i prompt dalla libreria per creare la composizione
              </p>
            </Card>
          ) : (
            <SortableContext
              items={blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {blocks.map(block => (
                  <ComposedPromptBlockComponent
                    key={block.id}
                    block={block}
                    onRemove={onRemoveBlock}
                    onUpdate={onUpdateBlock}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </ScrollArea>

      {/* Footer con Preview e Salva */}
      <div className="p-4 border-t bg-background space-y-3">
        <Separator />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span>Blocchi: {blocks.length}</span>
            <span>Caratteri: {totalChars.toLocaleString()}</span>
            <span>Token stimati: ~{estimatedTokens.toLocaleString()}</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || blocks.length === 0}
            size="sm"
            className="disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                💾 Salva Prompt Composto
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

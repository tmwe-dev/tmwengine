import { useSortable, SortableData } from '@dnd-kit/sortable';
import { CSS, Transform } from '@dnd-kit/utilities';
import { DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GripVertical, X, Edit2, Check } from 'lucide-react';
import { ComposedPromptBlock } from './types';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ComposedPromptBlockComponentProps {
  block: ComposedPromptBlock;
  onRemove: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  isLocked?: boolean;
}

export function ComposedPromptBlockComponent({ 
  block, 
  onRemove, 
  onUpdate,
  isLocked = false 
}: ComposedPromptBlockComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(block.content);

  const sortable = useSortable({ 
    id: block.id,
    disabled: isLocked 
  });

  const attributes: DraggableAttributes = sortable.attributes;
  const listeners: SyntheticListenerMap | undefined = sortable.listeners;
  const setNodeRef = sortable.setNodeRef;
  const transform: Transform | null = sortable.transform;
  const transition: string | undefined = sortable.transition;
  const isDragging: boolean = sortable.isDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveEdit = () => {
    onUpdate(block.id, editContent);
    setIsEditing(false);
  };

  const getSectionIcon = (type: string) => {
    const icons: Record<string, string> = {
      'global': '🌐',
      'base': '📚',
      'BASE': '📚',
      'agent_personality': '🎭',
      'CONVERSATION_STYLE': '💬',
      'conversation_style': '💬',
      'ORCHESTRATOR_RULES': '🧠',
      'topic_objective': '📋',
    };
    return icons[type] || '📝';
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn(
        "transition-shadow",
        isLocked && "bg-muted/30 border-dashed border-primary/30"
      )}>
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center gap-2">
            {!isLocked && (
              <div 
                {...listeners} 
                {...attributes} 
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-lg">{getSectionIcon(block.section_type)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-1">{block.section_name}</h4>
              <Badge variant="outline" className="text-xs">
                {block.section_type}
              </Badge>
            </div>
            <div className="flex gap-1">
              {block.is_editable && !isLocked && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => isEditing ? handleSaveEdit() : setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Edit2 className="h-3 w-3" />
                  )}
                </Button>
              )}
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => onRemove(block.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px] text-xs font-mono"
            />
          ) : (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {block.content}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

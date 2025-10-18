import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface SortableAgentProps {
  agent: {
    id: string;
    name: string;
    voice_id: string;
    text_generation_prompt: string;
    response_style: string;
    speaking_pace: string;
    max_words_per_response: number;
    is_active: boolean;
  };
  onEdit: (agent: any) => void;
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

export const SortableAgent = ({ agent, onEdit, onToggle, onDelete }: SortableAgentProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 space-y-3 ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        {/* Drag Handle */}
        <button
          className="cursor-grab active:cursor-grabbing touch-none mt-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Agent Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold">{agent.name}</h4>
            <Badge variant={agent.is_active ? "default" : "secondary"}>
              {agent.is_active ? "Attivo" : "Disattivato"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div><strong>Voice ID:</strong> {agent.voice_id}</div>
            <div><strong>Stile:</strong> {agent.response_style}</div>
            <div><strong>Ritmo:</strong> {agent.speaking_pace}</div>
            <div><strong>Max Parole:</strong> {agent.max_words_per_response}</div>
          </div>

          <div className="mt-2">
            <p className="text-sm"><strong>Personalità:</strong></p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {agent.text_generation_prompt}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(agent)}
          >
            Modifica
          </Button>

          <Switch
            checked={agent.is_active}
            onCheckedChange={() => onToggle(agent.id, agent.is_active)}
          />

          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(agent.id)}
          >
            Elimina
          </Button>
        </div>
      </div>
    </div>
  );
};

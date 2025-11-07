import { Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AIGuideDialog } from '@/components/ai/AIGuideDialog';
import { RoomAIPromptManager } from './RoomAIPromptManager';

interface SettingsButtonProps {
  roomId: string;
  isCreatorOrAdmin?: boolean;
}

export const SettingsButton = ({ roomId, isCreatorOrAdmin = false }: SettingsButtonProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="group transition-all"
          title="Impostazioni"
        >
          <Settings className="h-4 w-4 group-hover:scale-110 group-hover:animate-wiggle transition-all" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto mb-2" side="top" align="end">
        <div className="flex gap-2">
          <AIGuideDialog />
          {isCreatorOrAdmin && (
            <RoomAIPromptManager 
              roomId={roomId} 
              isCreatorOrAdmin={isCreatorOrAdmin}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

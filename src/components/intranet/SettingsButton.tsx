import { Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AIGuideDialog } from '@/components/ai/AIGuideDialog';
import { RoomAIPromptManager } from './RoomAIPromptManager';
import { UserLanguageSettings } from './UserLanguageSettings';

interface SettingsButtonProps {
  roomId: string;
  isCreatorOrAdmin?: boolean;
}

export const SettingsButton = ({ roomId, isCreatorOrAdmin = false }: SettingsButtonProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="hover:opacity-70 transition-opacity"
          title="Impostazioni"
        >
          <Settings className="h-4 w-4" />
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
          <UserLanguageSettings />
        </div>
      </PopoverContent>
    </Popover>
  );
};

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
    <div className="fixed bottom-4 right-4 z-[100]">
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="cursor-pointer hover:scale-110 transition-transform"
            title="Impostazioni"
          >
            <Settings className="h-6 w-6 text-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto mb-2">
          <div className="flex gap-4 items-center">
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
    </div>
  );
};

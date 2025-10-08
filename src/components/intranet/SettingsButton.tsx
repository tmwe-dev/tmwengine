import { Button } from '@/components/ui/button';
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
    <div className="fixed bottom-4 right-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            title="Impostazioni"
            className="h-12 w-12 rounded-full shadow-lg bg-background border"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto mb-2">
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
    </div>
  );
};

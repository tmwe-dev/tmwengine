import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRoomAISettings } from "@/hooks/useRoomAISettings";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AutoSpeakerToggleProps {
  isSpeaking?: boolean;
  roomId: string;
}

export const AutoSpeakerToggle = ({ isSpeaking = false, roomId }: AutoSpeakerToggleProps) => {
  const { profile, updateProfile } = useUserProfile();
  const { settings: roomSettings } = useRoomAISettings(roomId);

  const handleToggle = async () => {
    if (!profile) return;
    await updateProfile({ enableAutoSpeaker: !profile.enableAutoSpeaker });
  };

  const isEnabled = profile?.enableAutoSpeaker || false;
  const isRoomEnabled = roomSettings?.enableAutoSpeaker || false;

  // Se la stanza ha disabilitato l'auto-speaker, l'utente non può attivarlo
  if (!isRoomEnabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              className="text-muted-foreground opacity-50"
            >
              <VolumeX className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Auto-speaker disabilitato per questa stanza</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className={`transition-all duration-300 ${
              isEnabled
                ? isSpeaking
                  ? "text-primary animate-pulse"
                  : "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {isEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isEnabled
              ? "Lettura automatica attiva"
              : "Lettura automatica disattivata"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

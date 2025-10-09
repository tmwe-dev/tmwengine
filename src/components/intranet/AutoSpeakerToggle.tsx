import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AutoSpeakerToggleProps {
  isSpeaking?: boolean;
}

export const AutoSpeakerToggle = ({ isSpeaking = false }: AutoSpeakerToggleProps) => {
  const { profile, updateProfile } = useUserProfile();

  const handleToggle = async () => {
    if (!profile) return;
    await updateProfile({ enableAutoSpeaker: !profile.enableAutoSpeaker });
  };

  const isEnabled = profile?.enableAutoSpeaker || false;

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

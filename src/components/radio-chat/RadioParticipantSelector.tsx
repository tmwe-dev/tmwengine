import { useState } from 'react';
import { cn } from '@/lib/utils';
import albertGif from '@/assets/albert-mining.gif';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import archimedeGif from '@/assets/archimede-stones.gif';

interface RadioParticipant {
  id: string;
  type: 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
}

interface RadioParticipantSelectorProps {
  participants: RadioParticipant[];
  onToggle: (id: string) => void;
  className?: string;
}

export function RadioParticipantSelector({ 
  participants, 
  onToggle,
  className 
}: RadioParticipantSelectorProps) {
  
  console.log('🔍 [DEBUG] RadioParticipantSelector riceve:', participants);
  
  if (!participants || participants.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4 px-2 border border-dashed border-border rounded-lg">
        ⚠️ Nessun agente disponibile. Verifica le impostazioni.
      </div>
    );
  }
  
  const avatarConfig = {
    chatgpt: {
      gif: albertGif,
      active: '🤖',
      inactive: '🔘',
      color: 'from-blue-500 to-cyan-500'
    },
    gemini: {
      gif: pitagoraGif,
      active: '✨',
      inactive: '⚪',
      color: 'from-purple-500 to-pink-500'
    },
    claude: {
      gif: archimedeGif,
      active: '🧠',
      inactive: '⚫',
      color: 'from-orange-500 to-red-500'
    }
  };

  return (
    <div className={cn("flex gap-4 justify-center items-start", className)}>
      {participants.map((participant) => {
        const config = avatarConfig[participant.type];
        
        return (
          <div 
            key={participant.id}
            className="flex flex-col items-center gap-2 flex-1"
          >
            {/* GIF Container - Nessun bordo, nessun rounded */}
            <button
              onClick={() => onToggle(participant.id)}
              className={cn(
                "relative w-full aspect-square",
                "flex items-center justify-center",
                "transition-all duration-300",
                "hover:scale-105 cursor-pointer",
                participant.is_active 
                  ? "opacity-100" 
                  : "opacity-40 grayscale"
              )}
              title={participant.is_active 
                ? `${participant.name} - Clicca per disattivare` 
                : `${participant.name} - Clicca per attivare`}
            >
              {config.gif ? (
                <img 
                  src={config.gif} 
                  alt={participant.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-4xl">
                  {participant.is_active ? config.active : config.inactive}
                </span>
              )}
              
              {/* Active indicator */}
              {participant.is_active && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border border-white animate-pulse z-10" />
              )}
            </button>
            
            {/* Nome agente sotto la GIF */}
            <span className={cn(
              "text-xs font-medium text-center transition-colors",
              participant.is_active 
                ? "text-foreground" 
                : "text-muted-foreground"
            )}>
              {participant.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { cn } from '@/lib/utils';
import albertGif from '@/assets/albert-mining.gif';
import albertStatic from '@/assets/albert-static.png';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import pitagoraStatic from '@/assets/pitagora-static.png';
import archimedeGif from '@/assets/archimede-stones.gif';
import archimedeStatic from '@/assets/archimede-static.png';

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
      staticFrame: albertStatic,
      active: '🤖',
      inactive: '🔘',
      color: 'from-blue-500 to-cyan-500'
    },
    gemini: {
      gif: pitagoraGif,
      staticFrame: pitagoraStatic,
      active: '✨',
      inactive: '⚪',
      color: 'from-purple-500 to-pink-500'
    },
    claude: {
      gif: archimedeGif,
      staticFrame: archimedeStatic,
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
                "hover:scale-105 cursor-pointer"
              )}
              title={participant.is_active 
                ? `${participant.name} - In azione` 
                : `${participant.name} - Fermo (clicca per attivare)`}
            >
              {config.gif ? (
                <img 
                  src={participant.is_active ? config.gif : config.staticFrame}
                  alt={participant.name}
                  className={cn(
                    "w-full h-full object-contain transition-all duration-300",
                    !participant.is_active && "grayscale"
                  )}
                />
              ) : (
                <span className="text-4xl">
                  {participant.is_active ? config.active : config.inactive}
                </span>
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

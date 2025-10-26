import { useState } from 'react';
import { cn } from '@/lib/utils';

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
  
  const avatarConfig = {
    chatgpt: {
      active: '🤖',
      inactive: '🔘',
      color: 'from-blue-500 to-cyan-500'
    },
    gemini: {
      active: '✨',
      inactive: '⚪',
      color: 'from-purple-500 to-pink-500'
    },
    claude: {
      active: '🧠',
      inactive: '⚫',
      color: 'from-orange-500 to-red-500'
    }
  };

  return (
    <div className={cn("flex gap-4", className)}>
      {participants.map((participant) => {
        const config = avatarConfig[participant.type];
        
        return (
          <button
            key={participant.id}
            onClick={() => onToggle(participant.id)}
            disabled={!participant.is_active}
            className={cn(
              "relative w-16 h-16 rounded-full",
              "flex items-center justify-center text-2xl",
              "transition-all duration-300 transform",
              "border-2",
              participant.is_active
                ? `bg-gradient-to-br ${config.color} border-white shadow-lg hover:scale-110 cursor-pointer`
                : "bg-gray-700 border-gray-600 opacity-30 cursor-not-allowed"
            )}
            title={participant.is_active 
              ? `${participant.name} - Clicca per disattivare` 
              : `${participant.name} - Disattivato nel CRM`}
          >
            <span className={cn(
              "transition-all duration-300",
              participant.is_active ? "animate-pulse" : ""
            )}>
              {participant.is_active ? config.active : config.inactive}
            </span>
            
            {/* Active indicator */}
            {participant.is_active && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}

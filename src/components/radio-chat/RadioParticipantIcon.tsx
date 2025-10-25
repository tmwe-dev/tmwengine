import { cn } from '@/lib/utils';

interface RadioParticipantIconProps {
  type: 'chatgpt' | 'gemini' | 'claude';
  name: string;
  isActive: boolean;
  onToggle: () => void;
}

export function RadioParticipantIcon({ type, name, isActive, onToggle }: RadioParticipantIconProps) {
  const getColors = () => {
    switch (type) {
      case 'chatgpt':
        return {
          bg: 'bg-blue-500/30',
          bgActive: 'bg-blue-500/60',
          border: 'border-blue-400',
          text: 'text-blue-400',
          shadow: 'shadow-blue-500/20'
        };
      case 'gemini':
        return {
          bg: 'bg-purple-500/30',
          bgActive: 'bg-purple-500/60',
          border: 'border-purple-400',
          text: 'text-purple-400',
          shadow: 'shadow-purple-500/20'
        };
      case 'claude':
        return {
          bg: 'bg-orange-500/30',
          bgActive: 'bg-orange-500/60',
          border: 'border-orange-400',
          text: 'text-orange-400',
          shadow: 'shadow-orange-500/20'
        };
    }
  };

  const colors = getColors();

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-12 h-12 rounded-full",
        "flex items-center justify-center",
        "transition-all duration-200",
        "border-2",
        "shadow-lg",
        "text-sm font-bold",
        isActive ? colors.bgActive : colors.bg,
        colors.border,
        colors.text,
        colors.shadow,
        isActive ? "scale-100" : "scale-90 opacity-60"
      )}
      title={name}
    >
      {name.substring(0, 2).toUpperCase()}
    </button>
  );
}

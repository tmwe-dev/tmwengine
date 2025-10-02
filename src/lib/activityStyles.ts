/**
 * Utility per calcolare gli stili delle attività (sfondo e retino)
 * Condivisa tra ActivityCard (mobile) e TableRow (desktop)
 */

export interface ActivityStyleConfig {
  isOverdue: boolean;
  isOpen: boolean;
}

export interface ActivityStyles {
  bgColor: string;
  overlayStyle: React.CSSProperties;
  combinedStyle?: React.CSSProperties; // Per la tabella: combina gradiente + retino
}

export function getActivityStyles({ isOverdue, isOpen }: ActivityStyleConfig): ActivityStyles {
  const bgColor = isOverdue 
    ? 'border-red-700 dark:border-red-800' 
    : isOpen 
    ? 'border-green-700 dark:border-green-800'
    : '';

  const overlayStyle = (isOverdue || isOpen) ? {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
    opacity: 0.2
  } : {};

  // Per la tabella: combina il gradiente + retino in backgroundImage multiplo con colori VISIBILI
  const combinedStyle = (isOverdue || isOpen) ? {
    backgroundImage: [
      'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02) 10px, rgba(0, 0, 0, 0.1) 10px, rgba(0, 0, 0, 0.1) 20px)',
      isOverdue 
        ? 'linear-gradient(to bottom left, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.2) 30%, rgba(185, 28, 28, 0.15) 70%, rgba(127, 29, 29, 0.1) 100%)'
        : 'linear-gradient(to bottom left, rgba(74, 222, 128, 0.25) 0%, rgba(34, 197, 94, 0.2) 30%, rgba(22, 163, 74, 0.15) 70%, rgba(21, 128, 61, 0.1) 100%)'
    ].join(', ')
  } : {};

  return { bgColor, overlayStyle, combinedStyle };
}

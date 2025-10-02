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
    ? 'bg-gradient-to-bl from-red-800/10 from-20% to-black/20 to-60% dark:from-red-900/10 dark:to-black/30 border-red-700 dark:border-red-800' 
    : isOpen 
    ? 'bg-gradient-to-bl from-green-800/10 from-20% to-black/20 to-60% dark:from-green-900/10 dark:to-black/30 border-green-700 dark:border-green-800'
    : '';

  const overlayStyle = (isOverdue || isOpen) ? {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
    opacity: 0.2
  } : {};

  // Per la tabella: combina il gradiente CSS con il retino
  const combinedStyle = (isOverdue || isOpen) ? {
    backgroundImage: `
      repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px),
      linear-gradient(to bottom left, 
        ${isOverdue ? 'rgba(153, 27, 27, 0.1) 20%, rgba(0, 0, 0, 0.2) 60%' : 'rgba(22, 101, 52, 0.1) 20%, rgba(0, 0, 0, 0.2) 60%'}
      )
    `.trim()
  } : {};

  return { bgColor, overlayStyle, combinedStyle };
}

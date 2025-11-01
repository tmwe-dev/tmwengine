import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SenderGroupBadgeProps {
  groupName: string;
  groupIcon?: string;
  groupColor?: string;
  className?: string;
}

export const SenderGroupBadge = ({ 
  groupName, 
  groupIcon, 
  groupColor = '#6B7280',
  className = ''
}: SenderGroupBadgeProps) => {
  if (!groupName) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`text-xs rounded-full px-2 py-0.5 border backdrop-blur-sm shadow-sm ${className}`}
            style={{
              backgroundColor: `${groupColor}20`,
              borderColor: `${groupColor}40`,
              color: groupColor
            }}
          >
            {groupIcon && <span className="mr-1">{groupIcon}</span>}
            {groupName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Gruppo: {groupName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

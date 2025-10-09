import { cn } from "@/lib/utils";

interface UserAvailabilityBadgeProps {
  status: 'online' | 'busy' | 'dnd' | 'offline';
  emoji?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig = {
  online: { label: 'Disponibile', defaultColor: '#10b981', defaultEmoji: '🟢' },
  busy: { label: 'Occupato', defaultColor: '#f59e0b', defaultEmoji: '🟡' },
  dnd: { label: 'Non disturbare', defaultColor: '#ef4444', defaultEmoji: '🔴' },
  offline: { label: 'Offline', defaultColor: '#6b7280', defaultEmoji: '⚫' }
};

export const UserAvailabilityBadge = ({
  status,
  emoji,
  color,
  size = 'md',
  showLabel = false
}: UserAvailabilityBadgeProps) => {
  const config = statusConfig[status];
  const displayEmoji = emoji || config.defaultEmoji;
  const displayColor = color || config.defaultColor;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={cn(sizeClasses[size])} style={{ color: displayColor }}>
        {displayEmoji}
      </span>
      {showLabel && (
        <span className={cn("text-muted-foreground", sizeClasses[size])}>
          {config.label}
        </span>
      )}
    </div>
  );
};

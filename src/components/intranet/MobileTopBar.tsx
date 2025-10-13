import { Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { SettingsButton } from './SettingsButton';

interface MobileTopBarProps {
  selectedRoomName: string;
  selectedRoomId: string;
  totalUnread: number;
  isLayoutInverted: boolean;
  isCreatorOrAdmin: boolean;
  onMenuClick: () => void;
  onToggleLayout: () => void;
}

export const MobileTopBar = ({
  selectedRoomName,
  selectedRoomId,
  totalUnread,
  isLayoutInverted,
  isCreatorOrAdmin,
  onMenuClick,
  onToggleLayout
}: MobileTopBarProps) => {
  return (
    <div className={`h-14 grid grid-cols-3 items-center border-t flex-shrink-0 z-50 ${isLayoutInverted ? 'order-first' : ''}`}>
      {/* Left side - Menu button + Room name + Badges */}
      <div className="flex items-center gap-2 pl-2 relative">
        <button 
          className="p-2 -ml-2 hover:bg-accent rounded-md transition-colors"
          onClick={onMenuClick}
          aria-label="Apri menu"
        >
          <div className="relative">
            <Menu className="h-5 w-5 text-foreground" />
            {totalUnread > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px]"
              >
                {totalUnread}
              </Badge>
            )}
          </div>
        </button>
        <div className="flex flex-col min-w-0 py-1">
          <h1 className="text-sm font-semibold text-muted-foreground truncate">{selectedRoomName}</h1>
          {selectedRoomId && (
            <div className="flex items-center gap-1 mt-1">
              <TokenCounterBadge 
                roomId={selectedRoomId}
                variant="intranet"
                alertThreshold={15000}
              />
              <ConversationCostBadge roomId={selectedRoomId} />
            </div>
          )}
        </div>
      </div>

      {/* Center - Layout toggle button */}
      <div className="flex justify-center">
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleLayout}
          title={isLayoutInverted ? "Vista normale" : "Vista invertita"}
        >
          {isLayoutInverted ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* Right side - Settings button */}
      <div className="flex items-center justify-end pr-2">
        <SettingsButton roomId={selectedRoomId} isCreatorOrAdmin={isCreatorOrAdmin} />
      </div>
    </div>
  );
};

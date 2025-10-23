import { Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { SettingsButton } from './SettingsButton';
import { VideoCallButton } from './VideoCallButton';
import { DeleteRoomButton } from './DeleteRoomButton';

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
    <div className={`flex items-center justify-between border-t flex-shrink-0 z-50 py-2 px-2 gap-2 ${isLayoutInverted ? 'order-first' : ''}`}>
      {/* Left - Menu button + Nome stanza */}
      <div className="flex items-center gap-2 flex-shrink-0">
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
        <h1 className="text-sm font-semibold text-foreground truncate max-w-[120px]">{selectedRoomName}</h1>
      </div>

      {/* Center - Token Badge + Cost Badge */}
      <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
        {selectedRoomId && (
          <>
            <TokenCounterBadge 
              roomId={selectedRoomId}
              variant="intranet"
              alertThreshold={15000}
            />
            <ConversationCostBadge roomId={selectedRoomId} />
          </>
        )}
      </div>

      {/* Right - Delete + Video Call + Settings + Layout toggle button */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <DeleteRoomButton 
          roomId={selectedRoomId} 
          roomName={selectedRoomName}
          isCreatorOrAdmin={isCreatorOrAdmin}
          iconOnly
        />
        <VideoCallButton 
          roomId={selectedRoomId} 
          roomName={selectedRoomName}
        />
        <SettingsButton roomId={selectedRoomId} isCreatorOrAdmin={isCreatorOrAdmin} />
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleLayout}
          title={isLayoutInverted ? "Vista normale" : "Vista invertita"}
        >
          {isLayoutInverted ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

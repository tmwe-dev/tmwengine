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
    <div className={`flex flex-col border-t flex-shrink-0 z-50 py-2 ${isLayoutInverted ? 'order-first' : ''}`}>
      {/* Prima linea - Menu + Nome stanza + Toggle Layout */}
      <div className="flex items-center justify-between px-2 gap-2">
        {/* Left - Menu button */}
        <div className="flex items-center">
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
        </div>

        {/* Center - Nome stanza */}
        <div className="flex-1 text-center px-2">
          <h1 className="text-sm font-semibold text-foreground truncate">{selectedRoomName}</h1>
        </div>

        {/* Right - Layout toggle button */}
        <div className="flex items-center">
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

      {/* Seconda linea - Token Badge + Cost Badge + Settings */}
      <div className="flex items-center justify-between px-2 mt-1">
        {/* Left - Token Counter */}
        <div className="flex items-center">
          {selectedRoomId && (
            <TokenCounterBadge 
              roomId={selectedRoomId}
              variant="intranet"
              alertThreshold={15000}
            />
          )}
        </div>

        {/* Center - Cost Badge */}
        <div className="flex items-center justify-center flex-1">
          {selectedRoomId && (
            <ConversationCostBadge roomId={selectedRoomId} />
          )}
        </div>

        {/* Right - Settings button */}
        <div className="flex items-center">
          <SettingsButton roomId={selectedRoomId} isCreatorOrAdmin={isCreatorOrAdmin} />
        </div>
      </div>
    </div>
  );
};

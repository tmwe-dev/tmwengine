import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioMessage, RadioParticipant } from '@/types/radio';

interface RadioDebugPanelProps {
  debugPopupOpen: boolean;
  setDebugPopupOpen: (v: boolean) => void;
  viewMode: string;
  activeMessageId: string;
  currentMessage: RadioMessage | null;
  isSending: boolean;
  isAudioPlaying: boolean;
  currentPlayingId: string;
  messages: RadioMessage[];
  aiMessagesCount: number;
  participants: RadioParticipant[];
}

export const RadioDebugPanel = ({
  debugPopupOpen, setDebugPopupOpen,
  viewMode, activeMessageId, currentMessage,
  isSending, isAudioPlaying, currentPlayingId,
  messages, aiMessagesCount, participants
}: RadioDebugPanelProps) => {
  if (!import.meta.env.DEV || !debugPopupOpen) return null;

  return (
    <div className="fixed top-[140px] right-4 bg-background/95 text-foreground text-xs p-4 rounded-lg shadow-lg z-[60] max-w-[250px] border border-border/20">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-border/20">
        <span className="font-bold text-sm">Debug Info</span>
        <Button variant="ghost" size="sm" onClick={() => setDebugPopupOpen(false)} className="h-6 w-6 p-0 hover:bg-muted/20">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <div>Mode: {viewMode}</div>
        <div>Active: {activeMessageId?.substring(0, 8) || 'NONE'}</div>
        <div>Current Msg: {currentMessage?.sender_name || 'NONE'}</div>
        <div>Sending: {isSending ? 'YES' : 'NO'}</div>
        <div>Audio: {isAudioPlaying ? 'Playing' : 'Stopped'}</div>
        <div>Playing ID: {currentPlayingId?.substring(0, 8) || 'NONE'}</div>
        <div>Total: {messages.length}</div>
        <div>AI: {aiMessagesCount}</div>
        <div>Participants: {participants.filter(p => p.is_active).map(p => p.name).join(', ')}</div>
      </div>
    </div>
  );
};

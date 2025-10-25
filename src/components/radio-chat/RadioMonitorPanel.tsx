import { Activity, MessageSquare, Radio, Send, Volume2, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RadioMonitorPanelProps {
  viewMode: 'carousel' | 'messages';
  navIndex: number;
  totalAiMessages: number;
  activeMessageId: string;
  currentMessageSender: string | null;
  isSending: boolean;
  queueLength: number;
  isAudioPlaying: boolean;
  totalMessages: number;
  activeParticipants: string[];
}

export function RadioMonitorPanel({
  viewMode,
  navIndex,
  totalAiMessages,
  activeMessageId,
  currentMessageSender,
  isSending,
  queueLength,
  isAudioPlaying,
  totalMessages,
  activeParticipants
}: RadioMonitorPanelProps) {
  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* View Mode */}
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Mode</span>
            </div>
            <p className="text-sm font-semibold capitalize">{viewMode}</p>
          </div>

          {/* Navigation Index */}
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Nav Index</span>
            </div>
            <p className="text-sm font-semibold">{navIndex} / {totalAiMessages}</p>
          </div>

          {/* Sending Status */}
          <div className={`rounded-lg p-3 border ${isSending ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-muted/50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Send className={`w-4 h-4 ${isSending ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              <span className="text-xs font-medium text-muted-foreground">Sending</span>
            </div>
            <p className="text-sm font-semibold">{isSending ? 'Yes' : 'No'}</p>
          </div>

          {/* Audio Status */}
          <div className={`rounded-lg p-3 border ${isAudioPlaying ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className={`w-4 h-4 ${isAudioPlaying ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-xs font-medium text-muted-foreground">Audio</span>
            </div>
            <p className="text-sm font-semibold">{isAudioPlaying ? 'Playing' : 'Idle'}</p>
          </div>

          {/* Queue Length */}
          <div className={`rounded-lg p-3 border ${
            queueLength === 0 ? 'bg-green-500/10 border-green-500/30' :
            queueLength <= 3 ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className={`w-4 h-4 ${
                queueLength === 0 ? 'text-green-500' :
                queueLength <= 3 ? 'text-yellow-500' :
                'text-red-500'
              }`} />
              <span className="text-xs font-medium text-muted-foreground">Queue</span>
            </div>
            <p className="text-sm font-semibold">{queueLength}</p>
          </div>

          {/* Total Messages */}
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Total Msgs</span>
            </div>
            <p className="text-sm font-semibold">{totalMessages}</p>
          </div>
        </div>

        {/* Active Message ID */}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Active Message</span>
          </div>
          <p className="text-xs font-mono break-all">{activeMessageId || 'None'}</p>
        </div>

        {/* Current Message Sender */}
        {currentMessageSender && (
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Current Sender</span>
            </div>
            <p className="text-sm font-semibold capitalize">{currentMessageSender}</p>
          </div>
        )}

        {/* Active Participants */}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Active Participants</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeParticipants.map((participant) => (
              <span
                key={participant}
                className="text-xs px-2 py-1 bg-primary/10 rounded-full border border-primary/20"
              >
                {participant}
              </span>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

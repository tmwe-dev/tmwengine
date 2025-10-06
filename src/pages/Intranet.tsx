import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInput } from '@/components/intranet/MessageInput';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { Users } from 'lucide-react';

const Intranet = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const { onlineUsers } = useIntranetPresence(selectedRoomId || '');

  return (
    <div className="container mx-auto p-4 h-screen flex gap-4">
      {/* Sidebar con lista stanze */}
      <div className="w-80 flex-shrink-0">
        <Card className="h-full">
          <div className="p-4">
            <RoomSelector
              onRoomSelect={setSelectedRoomId}
              selectedRoomId={selectedRoomId}
            />
          </div>
        </Card>
      </div>

      {/* Area chat principale */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          {selectedRoomId ? (
            <>
              {/* Header con utenti online */}
              <div className="p-4 border-b flex items-center justify-between">
                <h1 className="text-xl font-semibold">Chat Intranet</h1>
                <Badge variant="secondary" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {onlineUsers.length} online
                </Badge>
              </div>

              {/* Messaggi */}
              <ChatMessages roomId={selectedRoomId} />

              {/* Input messaggio */}
              <MessageInput roomId={selectedRoomId} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Seleziona una stanza per iniziare a chattare</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Intranet;

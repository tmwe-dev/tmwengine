import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { RoomAIPromptManager } from '@/components/intranet/RoomAIPromptManager';
import { UserLanguageSettings } from '@/components/intranet/UserLanguageSettings';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

const Intranet = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const { onlineUsers } = useIntranetPresence(selectedRoomId || '');

  useEffect(() => {
    if (selectedRoomId) {
      checkCreatorOrAdmin();
      loadRoomName();
    }
  }, [selectedRoomId]);

  const checkCreatorOrAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCreatorOrAdmin(false);
        return;
      }

      // Verifica se è admin globale
      const { data: adminData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminData) {
        setIsCreatorOrAdmin(true);
        return;
      }

      // Verifica se è il creatore della stanza
      const { data: roomData } = await supabase
        .from('intranet_rooms')
        .select('created_by')
        .eq('id', selectedRoomId)
        .single();

      setIsCreatorOrAdmin(roomData?.created_by === user.id);
    } catch (error) {
      console.error('Errore verifica permessi:', error);
      setIsCreatorOrAdmin(false);
    }
  };

  const loadRoomName = async () => {
    try {
      const { data } = await supabase
        .from('intranet_rooms')
        .select('name')
        .eq('id', selectedRoomId)
        .single();

      if (data) {
        setSelectedRoomName(data.name);
      }
    } catch (error) {
      console.error('Errore caricamento nome stanza:', error);
    }
  };

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
              {/* Header con utenti online e AI settings */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold">{selectedRoomName}</h1>
                  {isCreatorOrAdmin && (
                    <RoomAIPromptManager 
                      roomId={selectedRoomId} 
                      isCreatorOrAdmin={isCreatorOrAdmin}
                    />
                  )}
                  <UserLanguageSettings />
                </div>
                <OnlineUsers users={onlineUsers} />
              </div>

              {/* Messaggi */}
              <ChatMessages roomId={selectedRoomId} />

              {/* Input messaggio */}
              <MessageInputWithAttachments roomId={selectedRoomId} />
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

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { RoomAIPromptManager } from '@/components/intranet/RoomAIPromptManager';
import { UserLanguageSettings } from '@/components/intranet/UserLanguageSettings';
import { RoomMembersManager } from '@/components/intranet/RoomMembersManager';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Users, Menu } from 'lucide-react';

const Intranet = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);
  const [isLayoutInverted, setIsLayoutInverted] = useState(false);
  const { onlineUsers } = useIntranetPresence(selectedRoomId || '');
  const isMobile = useIsMobile();

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

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    if (isMobile) {
      setIsRoomSelectorOpen(false);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row w-full overflow-hidden">
      {/* Desktop Sidebar - nascosta su mobile */}
      <div className="hidden md:block md:w-80 lg:w-96 flex-shrink-0 border-r">
        <div className="h-full overflow-y-auto">
          <div className="p-4">
            <RoomSelector
              onRoomSelect={handleRoomSelect}
              selectedRoomId={selectedRoomId}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sheet per Room Selector */}
      <Sheet open={isRoomSelectorOpen} onOpenChange={setIsRoomSelectorOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <RoomSelector
                onRoomSelect={handleRoomSelect}
                selectedRoomId={selectedRoomId}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Area chat principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedRoomId ? (
          <Card className="flex-1 flex flex-col h-full rounded-none border-0 md:border md:m-2 md:rounded-lg">
            {/* Header con utenti online e AI settings */}
            <div className="p-3 md:p-4 border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                {/* Menu button solo su mobile */}
                {isMobile && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => setIsRoomSelectorOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                
                <h1 className="text-base md:text-xl font-semibold truncate">{selectedRoomName}</h1>
                
                {/* Pulsanti azioni - responsive */}
                <div className="hidden sm:flex items-center gap-2">
                  <RoomAIPromptManager 
                    roomId={selectedRoomId} 
                    isCreatorOrAdmin={true}
                  />
                  <RoomMembersManager 
                    roomId={selectedRoomId}
                    isCreatorOrAdmin={true}
                  />
                  <UserLanguageSettings />
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <OnlineUsers users={onlineUsers} />
                
                {/* Pulsanti azioni compatti su mobile */}
                <div className="flex sm:hidden items-center gap-1">
                  <RoomAIPromptManager 
                    roomId={selectedRoomId} 
                    isCreatorOrAdmin={true}
                  />
                  <RoomMembersManager 
                    roomId={selectedRoomId}
                    isCreatorOrAdmin={true}
                  />
                  <UserLanguageSettings />
                </div>
              </div>
            </div>

            {/* Messaggi */}
            <ChatMessages 
              roomId={selectedRoomId} 
              isLayoutInverted={isLayoutInverted}
            />

            {/* Input messaggio */}
            <MessageInputWithAttachments 
              roomId={selectedRoomId}
              isLayoutInverted={isLayoutInverted}
              onToggleLayout={() => setIsLayoutInverted(!isLayoutInverted)}
            />
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
            <div className="text-center">
              {isMobile && (
                <Button 
                  variant="outline" 
                  size="lg"
                  className="mb-6"
                  onClick={() => setIsRoomSelectorOpen(true)}
                >
                  <Menu className="h-5 w-5 mr-2" />
                  Apri Menu Stanze
                </Button>
              )}
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base md:text-lg">Seleziona una stanza per iniziare a chattare</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Intranet;

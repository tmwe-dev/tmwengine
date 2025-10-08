import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Users, Menu, Maximize2 } from 'lucide-react';

const Intranet = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRoomId = searchParams.get('room') || undefined;
  const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
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
    <div className="h-full flex flex-col md:flex-row gap-2 md:gap-4 p-2 md:p-4">
      {/* Mobile: Sheet con lista stanze */}
      {isMobile ? (
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-4">
            <RoomSelector
              onRoomSelect={(roomId) => {
                setSearchParams({ room: roomId });
                setMobileSheetOpen(false);
              }}
              selectedRoomId={selectedRoomId}
            />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop/Tablet: Sidebar fissa */
        <div className="w-full md:w-80 flex-shrink-0">
          <Card className="h-full">
            <div className="p-4">
              <RoomSelector
                onRoomSelect={(roomId) => setSearchParams({ room: roomId })}
                selectedRoomId={selectedRoomId}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Area chat principale */}
      <div className="flex-1 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col">
          {selectedRoomId ? (
            <>
              {/* Header responsive con utenti online */}
              <div className="p-3 md:p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                
                {/* Badge utenti online e controlli */}
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreenMode(!isFullscreenMode)}
                    title={isFullscreenMode ? "Vista normale" : "Vista espansa"}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{onlineUsers.length}</span>
                  </Badge>
                  <OnlineUsers users={onlineUsers} />
                </div>
              </div>

              {isFullscreenMode ? (
                /* Vista espansa: Input in alto, chat sotto */
                <>
                  {/* Input messaggi in alto */}
                  <div className="p-4 border-b">
                    <MessageInputWithAttachments 
                      roomId={selectedRoomId} 
                      isFullscreenMode={isFullscreenMode}
                      onToggleFullscreen={() => setIsFullscreenMode(!isFullscreenMode)}
                      isCreatorOrAdmin={isCreatorOrAdmin}
                    />
                  </div>

                  {/* Area messaggi espansa */}
                  <div className="flex-1 overflow-hidden">
                    <ChatMessages roomId={selectedRoomId} />
                  </div>
                  
                  {/* Nome stanza in fondo */}
                  <div className="p-3 border-t bg-muted/30">
                    <h1 className="text-center text-sm font-medium text-muted-foreground">{selectedRoomName}</h1>
                  </div>
                </>
              ) : (
                /* Vista normale: Chat sopra, input sotto */
                <>
                  {/* Area messaggi */}
                  <div className="flex-1 overflow-hidden">
                    <ChatMessages roomId={selectedRoomId} />
                  </div>

                  {/* Input messaggi */}
                  <div className="p-4 border-t">
                    <MessageInputWithAttachments 
                      roomId={selectedRoomId} 
                      isFullscreenMode={isFullscreenMode}
                      onToggleFullscreen={() => setIsFullscreenMode(!isFullscreenMode)}
                      isCreatorOrAdmin={isCreatorOrAdmin}
                    />
                  </div>
                  
                  {/* Nome stanza in fondo */}
                  <div className="p-3 border-t bg-muted/30">
                    <h1 className="text-center text-sm font-medium text-muted-foreground">{selectedRoomName}</h1>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg md:text-xl font-semibold mb-2">
                  Seleziona una stanza
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  {isMobile 
                    ? 'Tocca il pulsante del menu per scegliere una stanza'
                    : 'Scegli una stanza dalla lista per iniziare a chattare'
                  }
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Intranet;

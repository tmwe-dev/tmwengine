import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Users, Settings, ArrowLeft, ArrowUpDown, MessageSquare } from 'lucide-react';

const ChatStanza = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRoomId = searchParams.get('room') || undefined;
  const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [isLayoutInverted, setIsLayoutInverted] = useState(false);
  const { onlineUsers } = useIntranetPresence(selectedRoomId || '');

  // Determina se nascondere l'header (su mobile quando c'è una stanza selezionata)
  const shouldHideHeader = isMobile && selectedRoomId;

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header - nascosto su mobile quando c'è una chat attiva */}
      {!shouldHideHeader && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 cursor-pointer" onClick={() => navigate(-1)}>
                <MessageSquare className="h-8 w-8 text-primary" />
                Chat Stanza
              </h1>
              <p className="text-muted-foreground mt-1">
                Comunica con il tuo team nelle stanze dedicate
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedRoomName && (
                <Badge variant="outline" className="text-base px-4 py-2">
                  {selectedRoomName}
                </Badge>
              )}
              {selectedRoomId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{onlineUsers.length} online</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Layout Responsive */}
      <div className={`grid grid-cols-1 xl:grid-cols-4 gap-6 ${shouldHideHeader ? 'flex-1 overflow-hidden' : ''}`}>
        {/* Sidebar Stanze - nascosta su mobile quando c'è una chat attiva */}
        <div className={`xl:col-span-1 order-2 xl:order-1 ${shouldHideHeader ? 'hidden' : ''}`}>
          <Card className="bg-card-transparent">
            <CardHeader className="py-4">
              <CardTitle className="flex items-center justify-between">
                <span>Stanze</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              <RoomSelector
                onRoomSelect={(roomId) => setSearchParams({ room: roomId })}
                selectedRoomId={selectedRoomId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Area Chat Principale */}
        <div className={`order-1 xl:order-2 ${shouldHideHeader ? `col-span-1 flex ${isLayoutInverted ? 'flex-col-reverse' : 'flex-col'} h-full overflow-hidden min-h-0 transition-all duration-300` : 'xl:col-span-3 space-y-6'}`}>
          {/* Messaggi della Stanza */}
          {selectedRoomId ? (
            <Card className={`bg-card-transparent ${shouldHideHeader ? 'flex-1 flex flex-col border-0 shadow-none overflow-hidden min-h-0' : ''}`}>
              {!shouldHideHeader && (
                <CardHeader className="py-4">
                  <CardTitle className="flex items-center justify-between">
                    <span>Conversazione</span>
                    <div className="flex items-center gap-2">
                      <OnlineUsers users={onlineUsers} />
                    </div>
                  </CardTitle>
                </CardHeader>
              )}
              <CardContent className={`overflow-y-auto ${shouldHideHeader ? 'flex-1 px-3 py-3 min-h-0' : 'space-y-3 px-2 sm:px-6 max-h-[600px]'}`}>
                <div className={shouldHideHeader ? 'space-y-3' : ''}>
                  <ChatMessages roomId={selectedRoomId} reverseOrder={!!(isLayoutInverted && shouldHideHeader)} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card-transparent">
              <CardContent className="flex items-center justify-start py-8 px-6">
                <MessageSquare className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
                <p className="text-muted-foreground">
                  Seleziona una stanza dalla lista per iniziare a chattare con il tuo team.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Area Input */}
          <Card className={`bg-card-transparent ${shouldHideHeader ? 'border-0 shadow-none flex-shrink-0' : ''}`}>
            {!shouldHideHeader && (
              <CardHeader className="py-4">
                <CardTitle>
                  {selectedRoomId ? 'Scrivi un messaggio' : 'Seleziona una stanza'}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent className={shouldHideHeader ? 'p-3' : 'p-3 sm:p-6'}>
              <div className={shouldHideHeader ? 'space-y-3' : 'space-y-4'}>
                {selectedRoomId ? (
                  <>
                    <MessageInputWithAttachments 
                      roomId={selectedRoomId} 
                      isCreatorOrAdmin={isCreatorOrAdmin}
                    />
                    {shouldHideHeader && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto mx-2">
                              <DialogHeader className="pb-3 sm:pb-4">
                                <DialogTitle className="text-lg sm:text-xl">Impostazioni Stanza</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{onlineUsers.length} utenti online</span>
                                  </Badge>
                                </div>
                                <OnlineUsers users={onlineUsers} />
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Seleziona una stanza per iniziare
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Toggle Button - Solo mobile */}
          {shouldHideHeader && (
            <div className="absolute left-1/2 transform -translate-x-1/2 z-50" style={{ bottom: 'calc(1rem - 8px)' }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsLayoutInverted(!isLayoutInverted)}
                className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                <ArrowUpDown className="h-5 w-5 text-primary" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatStanza;

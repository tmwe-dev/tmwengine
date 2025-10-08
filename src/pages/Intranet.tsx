import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetPortal } from '@/components/ui/sheet';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { SettingsButton } from '@/components/intranet/SettingsButton';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Users, Menu, Maximize2, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';

const Intranet = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRoomId = searchParams.get('room') || undefined;
  const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isLayoutInverted, setIsLayoutInverted] = useState(false);
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
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 overflow-hidden">
        {/* Mobile: Sheet con lista stanze */}
        {isMobile && (
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetContent side="left" className="w-[90vw] max-w-sm p-4 bg-background">
              {/* Numero sezione */}
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-50">
                2
              </div>
              <div className="mt-8">
                <RoomSelector
                  onRoomSelect={(roomId) => {
                    setSearchParams({ room: roomId });
                    setMobileSheetOpen(false);
                  }}
                  selectedRoomId={selectedRoomId}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
        {!isMobile && (
          /* Desktop/Tablet: Sidebar fissa */
          <div className="w-full md:w-80 flex-shrink-0 relative">
            {/* Numero sezione */}
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-50">
              2
            </div>
            <Card className="h-full">
              <div className="p-2">
                <RoomSelector
                  onRoomSelect={(roomId) => setSearchParams({ room: roomId })}
                  selectedRoomId={selectedRoomId}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Area chat principale */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Numero sezione */}
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-50">
            3
          </div>
          
          {selectedRoomId ? (
            <>
              {/* Contenitore solo messaggi - con padding in basso per input E footer fissi */}
              <div className={`flex-1 overflow-hidden ${isMobile ? 'pb-28' : ''}`}>
                <ChatMessages roomId={selectedRoomId} isLayoutInverted={isLayoutInverted} />
              </div>

              {/* Input messaggi - FISSO sopra il footer mobile */}
              {isMobile ? (
                <div className="fixed bottom-14 left-0 right-0 z-30">
                  <MessageInputWithAttachments 
                    roomId={selectedRoomId} 
                  />
                </div>
              ) : (
                <div className="flex-shrink-0">
                  <MessageInputWithAttachments 
                    roomId={selectedRoomId} 
                  />
                </div>
              )}

              {/* Barra mobile FISSA IN BASSO - sulla stessa linea dell'ingranaggio */}
              {isMobile && (
                <div className="fixed bottom-0 left-0 right-0 h-14 grid grid-cols-3 items-center border-t bg-background z-40">
                  <div className="flex items-center gap-2 pl-2">
                    <Menu 
                      className="h-6 w-6 cursor-pointer text-foreground"
                      onClick={() => {
                        setMobileSheetOpen(true);
                      }}
                    />
                    <h1 className="text-sm font-semibold text-muted-foreground truncate">{selectedRoomName}</h1>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsLayoutInverted(!isLayoutInverted)}
                      title={isLayoutInverted ? "Vista normale" : "Vista invertita"}
                    >
                      {isLayoutInverted ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div />
                </div>
              )}

              <SettingsButton 
                roomId={selectedRoomId}
                isCreatorOrAdmin={isCreatorOrAdmin}
              />
            </>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                  <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-2">
                      Seleziona una stanza
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground mb-4">
                      {isMobile 
                        ? 'Tocca il pulsante del menu per scegliere una stanza'
                        : 'Scegli una stanza dalla lista per iniziare a chattare'
                      }
                    </p>
                  </div>
                  {isMobile && (
                    <Button 
                      onClick={() => {
                        console.log('🔵 Bottone cliccato! Stato attuale:', mobileSheetOpen);
                        setMobileSheetOpen(true);
                        console.log('🔵 setMobileSheetOpen(true) chiamato');
                      }}
                      size="lg"
                      className="gap-2"
                    >
                      <MessageSquare className="h-5 w-5" />
                      Apri Selettore Stanze
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Intranet;

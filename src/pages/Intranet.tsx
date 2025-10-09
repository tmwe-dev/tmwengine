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

  const shouldHideHeader = isMobile && !!selectedRoomId;

  return (
    <div className={`${shouldHideHeader ? 'h-[calc(100vh-9rem)] flex flex-col overflow-hidden' : 'max-w-7xl mx-auto p-3 sm:p-6'}`}>
      <div className={`grid grid-cols-1 xl:grid-cols-4 gap-6 ${shouldHideHeader ? 'flex-1 overflow-hidden' : ''}`}>
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
        <div className={`flex-1 ${shouldHideHeader ? `flex ${isLayoutInverted ? 'flex-col-reverse' : 'flex-col'} h-full overflow-hidden min-h-0 transition-all duration-300` : 'relative flex flex-col overflow-hidden space-y-6'}`}>
          {/* Numero sezione */}
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-50">
            3
          </div>
          
          {selectedRoomId ? (
            <>
              {/* Messaggi - Area scrollabile indipendente con flex-1 */}
              <Card className={`bg-card-transparent ${shouldHideHeader ? 'flex-1 flex flex-col border-0 shadow-none overflow-hidden min-h-0' : ''}`}>
                <CardContent className={`overflow-y-auto ${shouldHideHeader ? 'flex-1 px-3 py-3 min-h-0' : 'space-y-3 px-2 sm:px-6 max-h-[600px]'}`}>
                  <ChatMessages roomId={selectedRoomId!} isLayoutInverted={isLayoutInverted} shouldHideHeader={shouldHideHeader} />
                </CardContent>
              </Card>

              {/* Input - Area fissa con flex-shrink-0 e max-height */}
              <Card className={`bg-card-transparent ${shouldHideHeader ? 'border-0 shadow-none flex-shrink-0 max-h-[240px] overflow-hidden' : ''}`}>
                <CardContent className={shouldHideHeader ? 'p-0' : 'p-3 sm:p-6'}>
                  <MessageInputWithAttachments roomId={selectedRoomId} />
                </CardContent>
              </Card>

              {/* Barra mobile - FUORI dal Card, sempre in alto quando invertita */}
              {isMobile && shouldHideHeader && (
                <div className={`h-14 grid grid-cols-3 items-center border-t flex-shrink-0 z-50 ${isLayoutInverted ? 'order-first' : ''}`}>
                  <div className="flex items-center gap-2 pl-2">
                    <Menu 
                      className="h-5 w-5 cursor-pointer text-foreground"
                      onClick={() => setMobileSheetOpen(true)}
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
                  <div className="flex items-center justify-end pr-2">
                    <SettingsButton roomId={selectedRoomId} isCreatorOrAdmin={isCreatorOrAdmin} />
                  </div>
                </div>
              )}
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

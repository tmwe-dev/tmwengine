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
import { Users, Menu, Maximize2, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';
import { GlassCard } from '@/components/design-system/cards/GlassCard';
import { GradientBackground } from '@/components/design-system/effects/GradientBackground';

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
    <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
      <GradientBackground variant="primary" intensity="medium" animated direction="br">
        <div className="min-h-screen flex flex-col">
          {/* Header mobile con pulsante stanza */}
          {isMobile && (
            <div className="p-3 border-b border-white/10 backdrop-blur-sm bg-background/60 flex items-center justify-between">
              <h1 className="text-lg font-semibold">Intranet</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/chat-stanza')}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat Stanza
              </Button>
            </div>
          )}
          
          <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 p-2 md:p-4 pb-20">
          {/* Desktop/Tablet: Sidebar fissa */}
          {!isMobile && (
            <div className="w-full md:w-80 flex-shrink-0 animate-fade-in">
              <GlassCard blur="md" className="h-full transition-all duration-300">
                <div className="p-4">
                  <RoomSelector
                    onRoomSelect={(roomId) => setSearchParams({ room: roomId })}
                    selectedRoomId={selectedRoomId}
                    navigateToChat={true}
                  />
                </div>
              </GlassCard>
            </div>
          )}
          
          {/* Mobile: Sheet content */}
          {isMobile && (
            <SheetContent side="left" className="w-80 p-4">
              <RoomSelector
                onRoomSelect={(roomId) => {
                  setSearchParams({ room: roomId });
                  setMobileSheetOpen(false);
                }}
                selectedRoomId={selectedRoomId}
                navigateToChat={true}
              />
            </SheetContent>
          )}

        {/* Area chat principale */}
        <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
          <GlassCard blur="lg" gradient className="flex-1 flex flex-col transition-all duration-300 overflow-hidden h-full">
            {selectedRoomId ? (
              <>
                {/* Header responsive con utenti online */}
                <div className="p-3 md:p-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 backdrop-blur-sm bg-background/40">
                  
                  {/* Badge utenti online e controlli */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullscreenMode(!isFullscreenMode)}
                      title={isFullscreenMode ? "Vista normale" : "Vista espansa"}
                      className="hover-scale"
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
                    {/* Input messaggi in alto - con bordo inferiore e padding ridotto */}
                    <div className="border-b border-white/10 py-2 backdrop-blur-sm bg-background/60">
                      <MessageInputWithAttachments 
                        roomId={selectedRoomId} 
                        isCreatorOrAdmin={isCreatorOrAdmin}
                      />
                    </div>

                    {/* Area messaggi espansa */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <ChatMessages roomId={selectedRoomId} reverseOrder={true} />
                    </div>
                  </>
                ) : (
                  /* Vista normale: Chat sopra, input sotto */
                  <>
                    {/* Area messaggi */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <ChatMessages roomId={selectedRoomId} />
                    </div>

                    {/* Input messaggi */}
                    <MessageInputWithAttachments 
                      roomId={selectedRoomId} 
                      isCreatorOrAdmin={isCreatorOrAdmin}
                    />
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
          </GlassCard>
        </div>
        </div>
        
        {/* Footer fisso a piè di pagina */}
        {selectedRoomId && (
          <div className="fixed bottom-0 left-0 right-0 p-3 grid grid-cols-3 items-center border-t border-white/10 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              {isMobile && (
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              )}
              <h1 className="text-sm md:text-base font-semibold text-muted-foreground">{selectedRoomName}</h1>
            </div>
            <div className="flex justify-center">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsFullscreenMode(!isFullscreenMode)}
                title={isFullscreenMode ? "Vista normale" : "Vista espansa"}
              >
                {isFullscreenMode ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
            <div />
          </div>
        )}
        </div>
      </GradientBackground>
    </Sheet>
  );
};

export default Intranet;

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetPortal, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarProvider, 
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar
} from '@/components/ui/sidebar';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { SettingsButton } from '@/components/intranet/SettingsButton';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { OrganizationUsers } from '@/components/intranet/OrganizationUsers';
import { AccessRequestsPanel } from '@/components/intranet/AccessRequestsPanel';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { useIntranetNotifications } from '@/hooks/useIntranetNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Users, Menu, Maximize2, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Intranet = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRoomId = searchParams.get('room') || undefined;
  const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isLayoutInverted, setIsLayoutInverted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showOrgUsers, setShowOrgUsers] = useState(false);
  const { onlineUsers } = useIntranetPresence(selectedRoomId || '');
  const { toast } = useToast();
  
  const { getUnreadCount, totalUnread } = useIntranetNotifications(
    currentUserId || undefined,
    selectedRoomId,
    {
      enableSound: true,
      enableToast: true,
      soundVolume: 0.5
    }
  );

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      checkCreatorOrAdmin();
      loadRoomName();
      ensureRoomMembership();
    }
  }, [selectedRoomId]);

  const ensureRoomMembership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedRoomId) return;

      // Verifica tipo di accesso della stanza
      const { data: room } = await supabase
        .from('intranet_rooms')
        .select('access_type')
        .eq('id', selectedRoomId)
        .single();

      // Solo per stanze pubbliche, aggiungi automaticamente
      if (room?.access_type !== 'public') return;

      // Verifica se l'utente è già membro
      const { data: existingMember } = await supabase
        .from('intranet_room_members')
        .select('id')
        .eq('room_id', selectedRoomId)
        .eq('user_id', user.id)
        .maybeSingle();

      // Se non è membro, aggiungilo
      if (!existingMember) {
        const { error } = await supabase
          .from('intranet_room_members')
          .insert({
            room_id: selectedRoomId,
            user_id: user.id
          });

        if (error) {
          console.error('Error adding user to room:', error);
        } else {
          console.log('✅ User automatically added to public room');
        }
      }
    } catch (error) {
      console.error('Error ensuring room membership:', error);
    }
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const handleOpenPrivateChat = async (userId: string, userName: string) => {
    try {
      if (!currentUserId) {
        toast({
          title: "Errore",
          description: "Devi essere autenticato per aprire una chat",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.rpc('get_or_create_private_room', {
        user1_id: currentUserId,
        user2_id: userId,
      });

      if (error) throw error;

      setSearchParams({ room: data });
      setShowOrgUsers(false);
      
      toast({
        title: "Chat aperta",
        description: `Chat con ${userName}`,
      });
    } catch (error) {
      console.error('Error opening private chat:', error);
      toast({
        title: "Errore",
        description: "Impossibile aprire la chat privata",
        variant: "destructive",
      });
    }
  };

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

  // Mobile: usa Sheet (comportamento esistente)
  if (isMobile) {
    return (
      <div className={`${shouldHideHeader ? 'h-[calc(100vh-9rem)] flex flex-col overflow-hidden' : 'max-w-7xl mx-auto p-3 sm:p-6'}`}>
        {/* Header con pulsante Utenti Organizzazione */}
        {!shouldHideHeader && (
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Intranet</h1>
            <Sheet open={showOrgUsers} onOpenChange={setShowOrgUsers}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Utenti Organizzazione
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Utenti Organizzazione</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <OrganizationUsers
                    currentUserId={currentUserId}
                    onOpenPrivateChat={handleOpenPrivateChat}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
        <div className={`grid grid-cols-1 gap-6 ${shouldHideHeader ? 'flex-1 overflow-hidden' : ''}`}>
          {/* Mobile: Sheet con lista stanze */}
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
                  getUnreadCount={getUnreadCount}
                />
              </div>
            </SheetContent>
          </Sheet>

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
                {shouldHideHeader && (
                  <div className={`h-14 grid grid-cols-3 items-center border-t flex-shrink-0 z-50 ${isLayoutInverted ? 'order-first' : ''}`}>
                    <div className="flex items-center gap-2 pl-2 relative">
                      <div className="relative">
                        <Menu 
                          className="h-5 w-5 cursor-pointer text-foreground"
                          onClick={() => setMobileSheetOpen(true)}
                        />
                        {totalUnread > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px]"
                          >
                            {totalUnread}
                          </Badge>
                        )}
                      </div>
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
                        Tocca il pulsante del menu per scegliere una stanza
                      </p>
                    </div>
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
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tablet/Desktop: usa SidebarProvider ma mantiene l'header originale
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex w-full min-h-screen">
        {/* Sidebar collapsible */}
        <Sidebar collapsible="icon" className="[&_[data-sidebar=sidebar]]:!bg-background border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Stanze</SidebarGroupLabel>
              <SidebarGroupContent>
                <RoomSelector
                  onRoomSelect={(roomId) => setSearchParams({ room: roomId })}
                  selectedRoomId={selectedRoomId}
                  getUnreadCount={getUnreadCount}
                />
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Utenti Online</SidebarGroupLabel>
              <SidebarGroupContent>
                <OnlineUsers users={onlineUsers} />
              </SidebarGroupContent>
            </SidebarGroup>

            {isCreatorOrAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Richieste Accesso</SidebarGroupLabel>
                <SidebarGroupContent>
                  <AccessRequestsPanel />
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>

        {/* Main content - mantiene layout originale */}
        <main className="flex-1 flex flex-col">
          <div className="max-w-7xl mx-auto p-3 sm:p-6 w-full">
            {/* Header originale con pulsante Utenti Organizzazione */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold">Intranet</h1>
              </div>
              <Sheet open={showOrgUsers} onOpenChange={setShowOrgUsers}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Utenti Organizzazione
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle>Utenti Organizzazione</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <OrganizationUsers
                      currentUserId={currentUserId}
                      onOpenPrivateChat={handleOpenPrivateChat}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Area chat principale */}
            {selectedRoomId ? (
              <div className="space-y-4">
                {/* Header stanza con settings */}
                <div className="flex items-center justify-between pb-2 border-b">
                  <h2 className="text-xl font-semibold">{selectedRoomName}</h2>
                  <SettingsButton roomId={selectedRoomId} isCreatorOrAdmin={isCreatorOrAdmin} />
                </div>

                {/* Messaggi */}
                <Card className="bg-card-transparent">
                  <CardContent className="p-6 max-h-[600px] overflow-y-auto">
                    <ChatMessages roomId={selectedRoomId!} isLayoutInverted={false} shouldHideHeader={false} />
                  </CardContent>
                </Card>

                {/* Input */}
                <Card className="bg-card-transparent">
                  <CardContent className="p-4">
                    <MessageInputWithAttachments roomId={selectedRoomId} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-[600px] flex flex-col overflow-hidden">
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center space-y-4">
                    <Users className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <h2 className="text-xl font-semibold mb-2">
                        Seleziona una stanza
                      </h2>
                      <p className="text-base text-muted-foreground">
                        Scegli una stanza dalla sidebar per iniziare a chattare
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Intranet;

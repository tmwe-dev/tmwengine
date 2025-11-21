import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetPortal, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { MobileTopBar } from '@/components/intranet/MobileTopBar';
import { SettingsButton } from '@/components/intranet/SettingsButton';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { OrganizationUsers } from '@/components/intranet/OrganizationUsers';
import { AccessRequestsPanel } from '@/components/intranet/AccessRequestsPanel';
import { EconomyModeToggle } from '@/components/intranet/EconomyModeToggle';
import { UserLanguageSettings } from '@/components/intranet/UserLanguageSettings';
import { VideoCallButton } from '@/components/intranet/VideoCallButton';
import { DeleteRoomButton } from '@/components/intranet/DeleteRoomButton';
import { RoomParticipantsList } from '@/components/intranet/RoomParticipantsList';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { useGlobalIntranetPresence } from '@/hooks/useGlobalIntranetPresence';
import { useIntranetNotifications } from '@/hooks/useIntranetNotifications';
import { useVideoCallNotifications } from '@/hooks/useVideoCallNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Menu, Maximize2, ChevronUp, ChevronDown, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ttsEngine, setTtsEngine] = useState('native');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [elevenLabsVoices, setElevenLabsVoices] = useState<Array<{voice_id: string; name: string}>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const { onlineUsers } = useGlobalIntranetPresence();
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

  // Hook per notifiche video call
  useVideoCallNotifications(selectedRoomId, currentUserId);

  useEffect(() => {
    loadCurrentUser();
    loadElevenLabsVoices();
  }, []);

  const loadElevenLabsVoices = async () => {
    setIsLoadingVoices(true);
    try {
      // Leggi API key dal database (NON da localStorage)
      const { data: config } = await supabase
        .from('voice_agent_config')
        .select('elevenlabs_api_key')
        .eq('enabled', true)
        .single();
      
      if (!config?.elevenlabs_api_key) {
        console.log('ℹ️ ElevenLabs API key non configurata nel database');
        setElevenLabsVoices([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('elevenlabs-get-voices', {
        body: { apiKey: config.elevenlabs_api_key }
      });

      if (error) {
        console.error('❌ Error loading ElevenLabs voices:', error);
        toast({
          title: 'Errore caricamento voci',
          description: 'Impossibile caricare le voci ElevenLabs. Verifica la tua API key nel database.',
          variant: 'destructive'
        });
        setElevenLabsVoices([]);
        return;
      }

      if (data?.voices) {
        const voices = data.voices.map((v: any) => ({
          voice_id: v.voice_id,
          name: v.name
        }));
        setElevenLabsVoices(voices);
        
        // Imposta la prima voce come default
        if (voices.length > 0 && !selectedVoice) {
          setSelectedVoice(voices[0].voice_id);
        }
        
        console.log(`✅ Caricate ${voices.length} voci ElevenLabs`);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

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

  const handleCallUser = (userId: string, userName: string) => {
    navigate(`/call-room?targetUserId=${userId}`);
    
    toast({
      title: "Avvio chiamata",
      description: `Chiamata verso ${userName}...`,
    });
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
      <div className={`${shouldHideHeader ? 'h-[calc(100vh-9rem)] flex flex-col overflow-hidden' : 'mx-auto p-3 sm:p-4'}`}>
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
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetContent side="left" className="w-[90vw] max-w-sm p-4 bg-background">
              <div className="mt-8 space-y-6">
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-sm font-semibold mb-3 px-2">Stanze</h3>
                  <RoomSelector
                    onRoomSelect={(roomId) => {
                      setSearchParams({ room: roomId });
                      setMobileSheetOpen(false);
                    }}
                    selectedRoomId={selectedRoomId}
                    getUnreadCount={getUnreadCount}
                  />
                </div>

                {isCreatorOrAdmin && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 px-2">Richieste Accesso</h3>
                    <AccessRequestsPanel />
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-semibold mb-3 px-2">Utenti Online</h3>
                  <OnlineUsers 
                    users={onlineUsers}
                    onCallUser={handleCallUser}
                    onOpenPrivateChat={handleOpenPrivateChat}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Area chat principale */}
          <div className={`flex-1 ${shouldHideHeader ? 'flex flex-col h-[calc(100vh-4rem)] overflow-hidden justify-between transition-all duration-300' : 'relative flex flex-col overflow-hidden space-y-6'}`}>
            {selectedRoomId ? (
              <>
                {/* MobileTopBar in ALTO quando layout invertito */}
                {shouldHideHeader && isLayoutInverted && (
                  <MobileTopBar
                    selectedRoomName={selectedRoomName}
                    selectedRoomId={selectedRoomId}
                    totalUnread={totalUnread}
                    isLayoutInverted={isLayoutInverted}
                    isCreatorOrAdmin={isCreatorOrAdmin}
                    onMenuClick={() => setMobileSheetOpen(true)}
                    onToggleLayout={() => setIsLayoutInverted(!isLayoutInverted)}
                  />
                )}

                {/* Input in ALTO quando layout invertito */}
                {shouldHideHeader && isLayoutInverted && (
                  <Card className="bg-card-transparent border-0 shadow-none flex-shrink-0 max-h-[240px] overflow-hidden">
                    <CardContent className="p-0">
                      <MessageInputWithAttachments 
                        roomId={selectedRoomId}
                        ttsEngine={ttsEngine}
                        selectedVoice={selectedVoice}
                        onEngineChange={setTtsEngine}
                        onVoiceChange={setSelectedVoice}
                        elevenLabsVoices={elevenLabsVoices}
                        isLoadingVoices={isLoadingVoices}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Messaggi - Area scrollabile indipendente con flex-1 */}
                <Card className={`bg-card-transparent ${shouldHideHeader ? 'flex-1 flex flex-col border-0 shadow-none overflow-hidden min-h-0' : ''}`}>
                  <CardContent className={shouldHideHeader ? 'flex-1 min-h-0 overflow-y-auto px-3 py-3' : 'space-y-3 px-2 sm:px-6 flex-1 overflow-y-auto'}>
                     <ChatMessages 
                      roomId={selectedRoomId!} 
                      isLayoutInverted={isLayoutInverted} 
                      shouldHideHeader={shouldHideHeader}
                      ttsEngine={ttsEngine}
                      selectedVoice={selectedVoice}
                      elevenLabsVoices={elevenLabsVoices}
                      isLoadingVoices={isLoadingVoices}
                    />
                  </CardContent>
                </Card>

                {/* Lista partecipanti su mobile */}
                {shouldHideHeader && <RoomParticipantsList roomId={selectedRoomId!} />}

                {/* Input in BASSO quando layout normale */}
                {shouldHideHeader && !isLayoutInverted && (
                  <Card className="bg-card-transparent border-0 shadow-none flex-shrink-0 max-h-[240px] overflow-hidden">
                    <CardContent className="p-0">
                      <MessageInputWithAttachments 
                        roomId={selectedRoomId}
                        ttsEngine={ttsEngine}
                        selectedVoice={selectedVoice}
                        onEngineChange={setTtsEngine}
                        onVoiceChange={setSelectedVoice}
                        elevenLabsVoices={elevenLabsVoices}
                        isLoadingVoices={isLoadingVoices}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* MobileTopBar in BASSO quando layout normale */}
                {shouldHideHeader && !isLayoutInverted && (
                  <MobileTopBar
                    selectedRoomName={selectedRoomName}
                    selectedRoomId={selectedRoomId}
                    totalUnread={totalUnread}
                    isLayoutInverted={isLayoutInverted}
                    isCreatorOrAdmin={isCreatorOrAdmin}
                    onMenuClick={() => setMobileSheetOpen(true)}
                    onToggleLayout={() => setIsLayoutInverted(!isLayoutInverted)}
                  />
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

  // Tablet/Desktop: layout con sidebar locale isolata
  return (
    <div className="flex w-full h-full">
      {/* Sidebar Intranet */}
      <div className={`border-r bg-card-transparent transition-all duration-300 relative flex flex-col ${sidebarCollapsed ? 'w-auto' : 'w-64'}`}>
          <div className="p-2 border-b flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Espandi sidebar" : "Riduci sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Contenuto sidebar */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <RoomSelector
              onRoomSelect={(roomId) => setSearchParams({ room: roomId })}
              selectedRoomId={selectedRoomId}
              getUnreadCount={getUnreadCount}
              isCollapsed={sidebarCollapsed}
            />
            
            {!sidebarCollapsed && (
              <>
                <OnlineUsers 
                  users={onlineUsers}
                  onCallUser={handleCallUser}
                  onOpenPrivateChat={handleOpenPrivateChat}
                />

                {isCreatorOrAdmin && (
                  <div className="mt-auto pt-4">
                    <h3 className="text-sm font-semibold px-4 mb-3">Richieste Accesso</h3>
                    <div className="px-2">
                      <AccessRequestsPanel />
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <h3 className="text-sm font-semibold px-4 mb-3">Impostazioni</h3>
                  <div className="px-2 pb-4">
                    <UserLanguageSettings />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      {/* Main content - layout a 3 sezioni: header, messaggi scrollabili, input fisso */}
      <main className="flex-1 flex flex-col h-screen">
        {/* Header con titolo e pulsante Utenti Organizzazione */}
        <div className="flex-shrink-0 border-b">
          <div className="px-4 py-2 w-full">
            <div className="flex justify-between items-center">
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
          </div>
        </div>

        {selectedRoomId ? (
          <>
            {/* Area messaggi scrollabile - occupa tutto lo spazio rimanente */}
            <div className="flex-1 overflow-hidden">
              <div className="w-full h-full flex flex-col">
                {/* Header stanza */}
                <div className="flex-shrink-0 pb-2 border-b mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">{selectedRoomName}</h2>
                  <div className="flex items-center gap-2">
                    <DeleteRoomButton 
                      roomId={selectedRoomId!} 
                      roomName={selectedRoomName}
                      isCreatorOrAdmin={isCreatorOrAdmin}
                      onDeleteSuccess={() => setSearchParams({})}
                    />
                    <VideoCallButton roomId={selectedRoomId!} roomName={selectedRoomName} />
                  </div>
                </div>

                {/* Messaggi scrollabili */}
                <Card className="bg-card-transparent flex-1 overflow-hidden">
                  <CardContent className="p-2 h-full overflow-y-auto">
                    <ChatMessages 
                      roomId={selectedRoomId!} 
                      isLayoutInverted={false} 
                      shouldHideHeader={false}
                      ttsEngine={ttsEngine}
                      selectedVoice={selectedVoice}
                      elevenLabsVoices={elevenLabsVoices}
                      isLoadingVoices={isLoadingVoices}
                    />
                  </CardContent>
                </Card>

                {/* Lista partecipanti */}
                <RoomParticipantsList roomId={selectedRoomId!} />
              </div>
            </div>

            {/* Input fisso in basso */}
            <div className="flex-shrink-0 border-t">
              <div className="py-2 w-full">
                <Card className="bg-card-transparent">
                  <CardContent className="p-1">
                    <MessageInputWithAttachments 
                      roomId={selectedRoomId}
                      roomName={selectedRoomName}
                      settingsButton={<SettingsButton roomId={selectedRoomId} isCreatorOrAdmin={isCreatorOrAdmin} />}
                      ttsEngine={ttsEngine}
                      selectedVoice={selectedVoice}
                      onEngineChange={setTtsEngine}
                      onVoiceChange={setSelectedVoice}
                      elevenLabsVoices={elevenLabsVoices}
                      isLoadingVoices={isLoadingVoices}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-3 sm:p-6">
            <Card className="max-w-2xl w-full">
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Users className="h-16 w-16 mx-auto text-muted-foreground" />
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">
                    Seleziona una stanza
                  </h2>
                  <p className="text-base text-muted-foreground">
                    Scegli una stanza dalla sidebar per iniziare a chattare
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Intranet;

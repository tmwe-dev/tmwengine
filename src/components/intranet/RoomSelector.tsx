import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Users, Plus, Globe, Lock, UserPlus, Clock, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRoomAccessRequests } from '@/hooks/useRoomAccessRequests';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroupLabel, SidebarGroup, SidebarGroupContent } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Room {
  id: string;
  name: string;
  description: string;
  created_at: string;
  member_count?: number;
  is_private?: boolean;
  access_type?: 'public' | 'request' | 'private';
  is_member?: boolean;
  has_pending_request?: boolean;
}

interface RoomSelectorProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string;
  getUnreadCount?: (roomId: string) => number;
}

export const RoomSelector = ({ onRoomSelect, selectedRoomId, getUnreadCount }: RoomSelectorProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const { toast } = useToast();
  const { requests, requestAccess } = useRoomAccessRequests();
  
  // useSidebar è opzionale - funziona solo se wrappato in SidebarProvider
  let sidebarState = 'expanded';
  try {
    const sidebar = useSidebar();
    sidebarState = sidebar.state;
  } catch (error) {
    // Non siamo in un contesto Sidebar (es: mobile sheet), usa stato di default
  }

  useEffect(() => {
    loadRooms();

    const channel = supabase
      .channel('intranet-rooms-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'intranet_rooms'
      }, () => {
        loadRooms();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'intranet_room_members'
      }, () => {
        loadRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requests]);

  const loadRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roomsData, error } = await supabase
        .from('intranet_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (roomsData) {
        const roomsWithCounts = await Promise.allSettled(
          roomsData.map(async (room) => {
            try {
              const { count, error } = await supabase
                .from('intranet_room_members')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id);
              
              if (error) {
                console.error(`Error counting members for room ${room.id}:`, error);
              }

              // Check if user is member
              const { data: memberData } = await supabase
                .from('intranet_room_members')
                .select('id')
                .eq('room_id', room.id)
                .eq('user_id', user.id)
                .maybeSingle();

              // Check for pending request
              const hasPendingRequest = requests.some(
                r => r.room_id === room.id && r.user_id === user.id && r.status === 'pending'
              );
              
              return { 
                ...room, 
                member_count: count || 0,
                is_private: room.is_private || false,
                access_type: room.access_type || 'public',
                is_member: !!memberData,
                has_pending_request: hasPendingRequest
              };
            } catch (err) {
              console.error(`Exception counting members for room ${room.id}:`, err);
              return { 
                ...room, 
                member_count: 0, 
                is_private: room.is_private || false,
                access_type: room.access_type || 'public',
                is_member: false,
                has_pending_request: false
              };
            }
          })
        );

        const validRooms = roomsWithCounts
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);

        setRooms(validRooms.length > 0 ? validRooms : roomsData.map(r => ({ 
          ...r, 
          member_count: 0,
          access_type: r.access_type || 'public',
          is_member: false,
          has_pending_request: false
        })));
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le stanze',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast({
        title: 'Errore',
        description: 'Il nome della stanza è obbligatorio',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('User auth check:', { user, userError });
      
      if (!user) {
        toast({
          title: 'Errore di autenticazione',
          description: 'Devi essere autenticato per creare una stanza. Effettua il login.',
          variant: 'destructive'
        });
        return;
      }

      console.log('Attempting to create room:', {
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        created_by: user.id
      });

      const { data: newRoom, error: roomError } = await supabase
        .from('intranet_rooms')
        .insert({
          name: newRoomName.trim(),
          description: newRoomDescription.trim(),
          created_by: user.id
        })
        .select()
        .single();

      console.log('Room creation result:', { newRoom, roomError });

      if (roomError) {
        toast({
          title: 'Errore creazione stanza',
          description: roomError.message || 'Impossibile creare la stanza',
          variant: 'destructive'
        });
        throw roomError;
      }

      // Add creator as member
      const { error: memberError } = await supabase
        .from('intranet_room_members')
        .insert({
          room_id: newRoom.id,
          user_id: user.id
        });

      console.log('Member add result:', { memberError });

      if (memberError) {
        console.error('Error adding member:', memberError);
      }

      toast({
        title: 'Successo',
        description: 'Stanza creata con successo'
      });

      setIsCreateDialogOpen(false);
      setNewRoomName('');
      setNewRoomDescription('');
      loadRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile creare la stanza',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!selectedRoom) return;
    
    const success = await requestAccess(selectedRoom.id, requestMessage);
    if (success) {
      setRequestDialogOpen(false);
      setRequestMessage('');
      setSelectedRoom(null);
      loadRooms();
    }
  };

  const getAccessIcon = (accessType?: string) => {
    switch (accessType) {
      case 'public':
        return Globe;
      case 'request':
        return Mail;
      case 'private':
        return Lock;
      default:
        return MessageSquare;
    }
  };

  const getAccessBadge = (accessType?: string) => {
    switch (accessType) {
      case 'public':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <Globe className="w-3 h-3 mr-1" />
          Pubblica
        </Badge>;
      case 'request':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Mail className="w-3 h-3 mr-1" />
          Su Richiesta
        </Badge>;
      case 'private':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <Lock className="w-3 h-3 mr-1" />
          Privata
        </Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Caricamento...</div>;
  }

  const isCollapsed = sidebarState === 'collapsed';

  return (
    <TooltipProvider>
      <SidebarGroup>
        <div className="flex items-center justify-between px-2 mb-2">
          {!isCollapsed && <SidebarGroupLabel>Stanze Chat</SidebarGroupLabel>}
          <Button 
            size={isCollapsed ? "icon" : "sm"} 
            variant="outline" 
            onClick={() => setIsCreateDialogOpen(true)}
            className={isCollapsed ? "h-8 w-8" : ""}
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Nuova</span>}
          </Button>
        </div>

        <SidebarGroupContent>
          <SidebarMenu>
            {rooms.map((room) => {
              const canAccess = room.access_type === 'public' || room.is_member;
              const unreadCount = getUnreadCount ? getUnreadCount(room.id) : 0;
              const AccessIcon = getAccessIcon(room.access_type);
              
              const button = (
                <div className="flex items-center gap-2 w-full">
                  <SidebarMenuButton
                    onClick={() => canAccess && onRoomSelect(room.id)}
                    isActive={selectedRoomId === room.id}
                    disabled={!canAccess}
                    className="flex-1"
                  >
                    <AccessIcon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1">{room.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {room.member_count > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              {room.member_count}
                            </Badge>
                          )}
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
                  </SidebarMenuButton>
                  {isCollapsed && unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs shrink-0">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </div>
              );

              return (
                <SidebarMenuItem key={room.id}>
                  {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1 w-full py-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => canAccess && onRoomSelect(room.id)}
                            isActive={selectedRoomId === room.id}
                            disabled={!canAccess}
                            className="w-full justify-center"
                          >
                            <AccessIcon className="h-4 w-4" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex flex-col gap-1">
                          <div className="font-medium">{room.name}</div>
                          {room.description && (
                            <div className="text-xs text-muted-foreground max-w-[200px]">
                              {room.description}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs">
                            {getAccessBadge(room.access_type)}
                            {!canAccess && (
                              <Badge variant="outline" className="text-xs">
                                {room.has_pending_request ? 'In attesa' : 'Non accessibile'}
                              </Badge>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[9px]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    button
                  )}
                </SidebarMenuItem>
              );
            })}

            {rooms.length === 0 && !isCollapsed && (
              <div className="text-center py-8 px-2 text-muted-foreground text-sm">
                Nessuna stanza disponibile
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Request Access Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Richiedi Accesso</DialogTitle>
            <DialogDescription>
              Invia una richiesta per accedere alla stanza "{selectedRoom?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Messaggio (opzionale)</Label>
              <Textarea
                id="message"
                placeholder="Spiega perché vuoi accedere a questa stanza..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRequestDialogOpen(false);
              setRequestMessage('');
              setSelectedRoom(null);
            }}>
              Annulla
            </Button>
            <Button onClick={handleRequestAccess}>
              Invia Richiesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Room Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuova Stanza</DialogTitle>
            <DialogDescription>
              Crea una nuova stanza di chat per collaborare con il tuo team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Nome Stanza *</Label>
              <Input
                id="room-name"
                placeholder="Es. Marketing Team"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                disabled={creating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-description">Descrizione</Label>
              <Textarea
                id="room-description"
                placeholder="Descrivi lo scopo di questa stanza..."
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                disabled={creating}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={creating}
            >
              Annulla
            </Button>
            <Button onClick={handleCreateRoom} disabled={creating}>
              {creating ? 'Creazione...' : 'Crea Stanza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

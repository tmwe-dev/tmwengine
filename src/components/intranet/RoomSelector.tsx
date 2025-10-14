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
  isCollapsed?: boolean;
}

export const RoomSelector = ({ onRoomSelect, selectedRoomId, getUnreadCount, isCollapsed = false }: RoomSelectorProps) => {
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
  }, []); // Rimossa dipendenza 'requests' per evitare loop infinito

  const loadRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carica tutte le stanze
      const { data: roomsData, error: roomsError } = await supabase
        .from('intranet_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsError) throw roomsError;
      if (!roomsData) return;

      // Carica tutti i membri in UNA query
      const { data: allMembersData } = await supabase
        .from('intranet_room_members')
        .select('room_id, user_id');

      // Carica tutte le richieste pendenti in UNA query
      const { data: pendingRequestsData } = await supabase
        .from('intranet_room_access_requests')
        .select('room_id, user_id')
        .eq('status', 'pending')
        .eq('user_id', user.id);

      // Crea mappe per accesso O(1)
      const memberCountMap = new Map<string, number>();
      const userMembershipSet = new Set<string>();
      const pendingRequestsSet = new Set<string>();

      // Conta membri per stanza
      allMembersData?.forEach(member => {
        memberCountMap.set(member.room_id, (memberCountMap.get(member.room_id) || 0) + 1);
        if (member.user_id === user.id) {
          userMembershipSet.add(member.room_id);
        }
      });

      // Crea set delle richieste pendenti
      pendingRequestsData?.forEach(request => {
        pendingRequestsSet.add(request.room_id);
      });

      // Arricchisci le stanze con i dati
      const enrichedRooms = roomsData.map(room => ({
        ...room,
        member_count: memberCountMap.get(room.id) || 0,
        is_private: room.is_private || false,
        access_type: room.access_type || 'public',
        is_member: userMembershipSet.has(room.id),
        has_pending_request: pendingRequestsSet.has(room.id)
      }));

      setRooms(enrichedRooms);
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


  if (loading) {
    return null; // Non mostrare nulla durante il caricamento
  }


  return (
    <TooltipProvider>
      <div className="flex flex-col flex-1 overflow-hidden">
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 mb-3 flex-shrink-0">
            <h3 className="text-sm font-semibold">Stanze Chat</h3>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Nuova</span>
            </Button>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center px-2 mb-3 flex-shrink-0">
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-1 px-2 pb-4">
            {rooms.map((room) => {
              const canAccess = room.access_type === 'public' || room.is_member;
              const unreadCount = getUnreadCount ? getUnreadCount(room.id) : 0;
              
              const button = isCollapsed ? (
                <Button
                  variant={selectedRoomId === room.id ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => canAccess && onRoomSelect(room.id)}
                  disabled={!canAccess}
                  className="w-full aspect-square p-0 justify-center items-center relative group"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 group-hover:scale-110 transition-all" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center text-[10px] font-bold rounded-full"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              ) : (
                <Button
                  variant={selectedRoomId === room.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => canAccess && onRoomSelect(room.id)}
                  disabled={!canAccess}
                  className="w-full justify-start group relative overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-3/5 after:h-px after:origin-left after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent hover:after:animate-line-bounce hover:bg-accent/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0 group-hover:scale-110 group-hover:animate-wiggle transition-all" />
                    <span className="truncate text-left">{room.name}</span>
                  </div>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs flex-shrink-0">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              );

              return (
                <div key={room.id}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="text-sm">
                          <p className="font-semibold">{room.name}</p>
                          {unreadCount > 0 && (
                            <p className="text-destructive text-xs">{unreadCount} non letti</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  )}
                </div>
              );
            })}

            {rooms.length === 0 && (
              <div className="text-center py-8 px-2 text-muted-foreground text-sm">
                Nessuna stanza disponibile
              </div>
            )}
          </div>
        </div>
      </div>

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

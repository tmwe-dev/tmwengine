import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Users, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Room {
  id: string;
  name: string;
  description: string;
  created_at: string;
  member_count?: number;
}

interface RoomSelectorProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string;
}

export const RoomSelector = ({ onRoomSelect, selectedRoomId }: RoomSelectorProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRooms = async () => {
    try {
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
                return { ...room, member_count: 0 };
              }
              
              return { ...room, member_count: count || 0 };
            } catch (err) {
              console.error(`Exception counting members for room ${room.id}:`, err);
              return { ...room, member_count: 0 };
            }
          })
        );

        const validRooms = roomsWithCounts
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);

        setRooms(validRooms.length > 0 ? validRooms : roomsData.map(r => ({ ...r, member_count: 0 })));
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

  if (loading) {
    return <div className="px-4 text-center text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stanze Chat</h2>
        <Button size="sm" variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Stanza
        </Button>
      </div>

      <div className="space-y-2">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRoomId === room.id ? 'border-primary' : ''
            }`}
            onClick={() => onRoomSelect(room.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {room.name}
                </CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.member_count}
                </Badge>
              </div>
              {room.description && (
                <CardDescription className="text-sm">
                  {room.description}
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        ))}

        {rooms.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna stanza disponibile. Crea la prima stanza!
          </div>
        )}
      </div>

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
    </div>
  );
};

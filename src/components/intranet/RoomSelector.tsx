import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
        const roomsWithCounts = await Promise.all(
          roomsData.map(async (room) => {
            const { count } = await supabase
              .from('intranet_room_members')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id);
            
            return { ...room, member_count: count || 0 };
          })
        );
        
        setRooms(roomsWithCounts);
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Errore',
          description: 'Devi essere autenticato per creare una stanza',
          variant: 'destructive'
        });
        return;
      }

      // Create room
      const { data: room, error: roomError } = await supabase
        .from('intranet_rooms')
        .insert({
          name: newRoomName.trim(),
          description: newRoomDescription.trim() || null,
          created_by: user.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from('intranet_room_members')
        .insert({
          room_id: room.id,
          user_id: user.id
        });

      if (memberError) throw memberError;

      toast({
        title: 'Successo',
        description: 'Stanza creata con successo'
      });

      setShowCreateDialog(false);
      setNewRoomName('');
      setNewRoomDescription('');
      loadRooms();
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile creare la stanza',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stanze Chat</h2>
        <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
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
            <CardHeader className="pb-3">
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuova Stanza</DialogTitle>
            <DialogDescription>
              Crea una nuova stanza di chat per la tua organizzazione
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Nome Stanza *</Label>
              <Input
                id="room-name"
                placeholder="es. Team Marketing"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-description">Descrizione</Label>
              <Textarea
                id="room-description"
                placeholder="Descrizione della stanza (opzionale)"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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

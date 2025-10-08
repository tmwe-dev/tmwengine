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
      // Verifica sessione Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
      }
      
      if (!session?.user) {
        // Prova a recuperare da sessionStorage come fallback
        const supabaseUserId = sessionStorage.getItem('tmwe_supabase_user_id');
        
        if (!supabaseUserId) {
          toast({
            title: 'Errore',
            description: 'Sessione non trovata. Riprova ad accedere.',
            variant: 'destructive'
          });
          return;
        }

        // Usa l'ID recuperato da sessionStorage
        const { data: newRoom, error: roomError } = await supabase
          .from('intranet_rooms')
          .insert({
            name: newRoomName.trim(),
            description: newRoomDescription.trim(),
            created_by: supabaseUserId
          })
          .select()
          .single();

        if (roomError) throw roomError;

        // Aggiungi il creatore come membro
        const { error: memberError } = await supabase
          .from('intranet_room_members')
          .insert({
            room_id: newRoom.id,
            user_id: supabaseUserId
          });

        if (memberError) throw memberError;
      } else {
        // Usa la sessione Supabase
        const { data: newRoom, error: roomError } = await supabase
          .from('intranet_rooms')
          .insert({
            name: newRoomName.trim(),
            description: newRoomDescription.trim(),
            created_by: session.user.id
          })
          .select()
          .single();

        if (roomError) throw roomError;

        // Aggiungi il creatore come membro
        const { error: memberError } = await supabase
          .from('intranet_room_members')
          .insert({
            room_id: newRoom.id,
            user_id: session.user.id
          });

        if (memberError) throw memberError;
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
    return <div className="p-4 text-center text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base md:text-lg font-semibold">Stanze Chat</h2>
        <Button size="sm" variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Nuova Stanza</span>
        </Button>
      </div>

      <div className="space-y-2">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
              selectedRoomId === room.id ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => onRoomSelect(room.id)}
          >
            <CardHeader className="p-3 md:pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm md:text-base flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{room.name}</span>
                </CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">{room.member_count}</span>
                </Badge>
              </div>
              {room.description && (
                <CardDescription className="text-xs md:text-sm line-clamp-2">
                  {room.description}
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        ))}

        {rooms.length === 0 && (
          <div className="text-center py-8 text-sm md:text-base text-muted-foreground">
            Nessuna stanza disponibile. Crea la prima stanza!
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Crea Nuova Stanza</DialogTitle>
            <DialogDescription className="text-sm">
              Crea una nuova stanza di chat per collaborare con il tuo team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name" className="text-sm">Nome Stanza *</Label>
              <Input
                id="room-name"
                placeholder="Es. Marketing Team"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                disabled={creating}
                className="text-sm md:text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-description" className="text-sm">Descrizione</Label>
              <Textarea
                id="room-description"
                placeholder="Descrivi lo scopo di questa stanza..."
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                disabled={creating}
                rows={3}
                className="text-sm md:text-base resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={creating}
              className="w-full sm:w-auto"
            >
              Annulla
            </Button>
            <Button 
              onClick={handleCreateRoom} 
              disabled={creating}
              className="w-full sm:w-auto"
            >
              {creating ? 'Creazione...' : 'Crea Stanza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

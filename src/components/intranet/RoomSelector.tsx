import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stanze Chat</h2>
        <Button size="sm" variant="outline">
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
    </div>
  );
};

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, MessageSquare, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Room {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  member_count?: number;
  message_count?: number;
}

export const AdminRoomManager = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data: roomsData, error } = await supabase
        .from('intranet_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Carica conteggio membri e messaggi per ogni stanza
      const roomsWithCounts = await Promise.all(
        (roomsData || []).map(async (room) => {
          const [membersData, messagesData] = await Promise.all([
            supabase.from('intranet_room_members').select('id', { count: 'exact', head: true }).eq('room_id', room.id),
            supabase.from('intranet_messages').select('id', { count: 'exact', head: true }).eq('room_id', room.id)
          ]);

          return {
            ...room,
            member_count: membersData.count || 0,
            message_count: messagesData.count || 0
          };
        })
      );

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le stanze',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      // Elimina prima i messaggi, poi i membri, poi la stanza
      await supabase.from('intranet_messages').delete().eq('room_id', roomId);
      await supabase.from('intranet_room_members').delete().eq('room_id', roomId);
      await supabase.from('intranet_room_ai_prompts').delete().eq('room_id', roomId);
      
      const { error } = await supabase
        .from('intranet_rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: 'Stanza eliminata',
        description: 'La stanza è stata eliminata con successo'
      });

      loadRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la stanza',
        variant: 'destructive'
      });
    } finally {
      setRoomToDelete(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Membri</TableHead>
            <TableHead>Messaggi</TableHead>
            <TableHead>Creata il</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nessuna stanza trovata
              </TableCell>
            </TableRow>
          ) : (
            rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.name}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {room.description || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {room.member_count}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {room.message_count}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(room.created_at), 'dd MMM yyyy', { locale: it })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRoomToDelete(room.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa stanza? Verranno eliminati anche tutti i messaggi e i membri.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roomToDelete && handleDeleteRoom(roomToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

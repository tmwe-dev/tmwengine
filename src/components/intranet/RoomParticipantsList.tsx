import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Participant {
  user_id: string;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

interface RoomParticipantsListProps {
  roomId: string;
}

export const RoomParticipantsList = ({ roomId }: RoomParticipantsListProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadParticipants();

    // Sottoscrizione per aggiornamenti real-time
    const channel = supabase
      .channel(`room-members-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intranet_room_members',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('intranet_room_members')
        .select(`
          user_id, 
          joined_at,
          user_profiles!inner(display_name, avatar_url)
        `)
        .eq('room_id', roomId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Transform data to flat structure
      const flatParticipants = (data || []).map(item => ({
        user_id: item.user_id,
        joined_at: item.joined_at,
        display_name: (item.user_profiles as any).display_name,
        avatar_url: (item.user_profiles as any).avatar_url
      }));

      setParticipants(flatParticipants);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <CardTitle className="text-base">
                  Partecipanti ({participants.length})
                </CardTitle>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isOpen ? 'transform rotate-180' : ''
                }`}
              />
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun partecipante</p>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(participant.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {participant.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entrato il {format(new Date(participant.joined_at), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

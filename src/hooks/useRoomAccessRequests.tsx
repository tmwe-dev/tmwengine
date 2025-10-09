import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccessRequest {
  id: string;
  room_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  is_invite: boolean;
  invited_by?: string;
  room_name?: string;
  user_display_name?: string;
}

export const useRoomAccessRequests = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prima carica le richieste dell'utente
      const { data: userRequests } = await supabase
        .from('intranet_room_access_requests')
        .select(`
          *,
          intranet_rooms!inner(name, created_by)
        `)
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      // Poi carica le richieste per le stanze create dall'utente
      const { data: creatorRequests } = await supabase
        .from('intranet_room_access_requests')
        .select(`
          *,
          intranet_rooms!inner(name, created_by)
        `)
        .eq('intranet_rooms.created_by', user.id)
        .order('requested_at', { ascending: false });

      // Combina e rimuovi duplicati
      const allRequests = [...(userRequests || []), ...(creatorRequests || [])];
      const uniqueRequests = allRequests.filter((req, index, self) =>
        index === self.findIndex(r => r.id === req.id)
      );

      // Carica i profili utente
      const userIds = uniqueRequests.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]));

      const formatted = uniqueRequests.map(req => ({
        ...req,
        room_name: req.intranet_rooms?.name,
        user_display_name: profileMap.get(req.user_id) || 'Utente'
      }));

      setRequests(formatted);
    } catch (error) {
      console.error('Error loading access requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    // Real-time subscription
    const channel = supabase
      .channel('room-access-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'intranet_room_access_requests'
      }, () => {
        loadRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const requestAccess = async (roomId: string, message?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // Controlla limite richieste pendenti
      const { data: countData } = await supabase.rpc('get_pending_requests_count', {
        p_user_id: user.id
      });

      if (countData && countData >= 3) {
        toast({
          title: "Limite raggiunto",
          description: "Puoi avere massimo 3 richieste pendenti contemporaneamente",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('intranet_room_access_requests')
        .insert({
          room_id: roomId,
          user_id: user.id,
          message: message,
          is_invite: false
        });

      if (error) throw error;

      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta è stata inviata con successo"
      });

      return true;
    } catch (error: any) {
      console.error('Error requesting access:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Richiesta già presente",
          description: "Hai già una richiesta per questa stanza",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Errore",
          description: "Impossibile inviare la richiesta",
          variant: "destructive"
        });
      }
      return false;
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('intranet_room_access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Richiesta approvata",
        description: "L'utente è stato aggiunto alla stanza"
      });

      return true;
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Errore",
        description: "Impossibile approvare la richiesta",
        variant: "destructive"
      });
      return false;
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('intranet_room_access_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Richiesta rifiutata",
        description: "La richiesta è stata rifiutata"
      });

      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Errore",
        description: "Impossibile rifiutare la richiesta",
        variant: "destructive"
      });
      return false;
    }
  };

  const sendInvite = async (roomId: string, userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('intranet_room_access_requests')
        .insert({
          room_id: roomId,
          user_id: userId,
          is_invite: true,
          invited_by: user.id,
          status: 'approved'
        });

      if (error) throw error;

      toast({
        title: "Invito inviato",
        description: "L'utente è stato invitato alla stanza"
      });

      return true;
    } catch (error: any) {
      console.error('Error sending invite:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Utente già presente",
          description: "L'utente è già membro o ha una richiesta attiva",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Errore",
          description: "Impossibile inviare l'invito",
          variant: "destructive"
        });
      }
      return false;
    }
  };

  return {
    requests,
    isLoading,
    requestAccess,
    approveRequest,
    rejectRequest,
    sendInvite,
    reload: loadRequests
  };
};

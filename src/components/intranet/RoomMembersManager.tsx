import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoomMembersManagerProps {
  roomId: string;
  isCreatorOrAdmin: boolean;
}

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  user_profiles?: {
    display_name: string | null;
    tmwe_email: string | null;
  };
}

interface AvailableUser {
  user_id: string;
  display_name: string | null;
  tmwe_email: string | null;
}

export const RoomMembersManager = ({ roomId, isCreatorOrAdmin }: RoomMembersManagerProps) => {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMembers();
      loadAvailableUsers();
    }
  }, [open, roomId]);

  const loadMembers = async () => {
    try {
      const { data: membersData, error } = await supabase
        .from('intranet_room_members')
        .select('id, user_id, joined_at')
        .eq('room_id', roomId);

      if (error) throw error;

      // Carica i profili separatamente
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, tmwe_email')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        const enrichedMembers = membersData.map(member => ({
          ...member,
          user_profiles: profilesMap.get(member.user_id) || null
        }));

        setMembers(enrichedMembers as Member[]);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i membri',
        variant: 'destructive'
      });
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // Carica tutti gli utenti
      const { data: allUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, tmwe_email');

      if (usersError) throw usersError;

      // Carica i membri attuali
      const { data: currentMembers, error: membersError } = await supabase
        .from('intranet_room_members')
        .select('user_id')
        .eq('room_id', roomId);

      if (membersError) throw membersError;

      // Filtra gli utenti già membri
      const memberIds = new Set(currentMembers?.map(m => m.user_id) || []);
      const available = (allUsers || []).filter(user => !memberIds.has(user.user_id));
      
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  const handleAddMember = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('intranet_room_members')
        .insert({
          room_id: roomId,
          user_id: userId
        });

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Membro aggiunto alla stanza'
      });

      loadMembers();
      loadAvailableUsers();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiungere il membro',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isCreatorOrAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('intranet_room_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Membro rimosso dalla stanza'
      });

      loadMembers();
      loadAvailableUsers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile rimuovere il membro',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user => 
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.tmwe_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Gestisci Membri
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestione Membri Stanza</DialogTitle>
          <DialogDescription>
            Invita nuovi membri o rimuovi membri esistenti dalla stanza
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Membri attuali */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Membri Attuali ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {member.user_profiles?.display_name || 'Utente'}
                    </span>
                    {member.user_profiles?.tmwe_email && (
                      <span className="text-xs text-muted-foreground">
                        {member.user_profiles.tmwe_email}
                      </span>
                    )}
                  </div>
                  {isCreatorOrAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun membro nella stanza
                </p>
              )}
            </div>
          </div>

          {/* Invita nuovi membri */}
          {isCreatorOrAdmin && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invita Membri
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="search">Cerca utente</Label>
                  <Input
                    id="search"
                    placeholder="Nome o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredAvailableUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.display_name || 'Utente'}
                        </span>
                        {user.tmwe_email && (
                          <span className="text-xs text-muted-foreground">
                            {user.tmwe_email}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(user.user_id)}
                        disabled={loading}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invita
                      </Button>
                    </div>
                  ))}
                  {filteredAvailableUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchTerm 
                        ? 'Nessun utente trovato'
                        : 'Tutti gli utenti sono già membri di questa stanza'
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

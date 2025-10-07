import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserWithRole {
  user_id: string;
  display_name: string | null;
  preferred_language: string;
  is_admin: boolean;
}

export const AdminUserManager = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Carica tutti i profili utente
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, preferred_language');

      if (profilesError) throw profilesError;

      // Carica tutti i ruoli
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combina i dati
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        is_admin: roles?.some(r => r.user_id === profile.user_id && r.role === 'admin') || false
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare gli utenti',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    try {
      if (currentlyAdmin) {
        // Rimuovi ruolo admin
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: 'Ruolo rimosso',
          description: 'Il ruolo amministratore è stato rimosso'
        });
      } else {
        // Aggiungi ruolo admin
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin'
          });

        if (error) throw error;

        toast({
          title: 'Ruolo assegnato',
          description: 'Il ruolo amministratore è stato assegnato'
        });
      }

      loadUsers();
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile modificare il ruolo',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Utente</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Lingua</TableHead>
          <TableHead>Ruolo</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Nessun utente trovato
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.user_id}>
              <TableCell className="font-mono text-xs">
                {user.user_id.substring(0, 8)}...
              </TableCell>
              <TableCell>
                {user.display_name || 'Utente senza nome'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{user.preferred_language.toUpperCase()}</Badge>
              </TableCell>
              <TableCell>
                {user.is_admin ? (
                  <Badge className="gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary">Utente</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant={user.is_admin ? "destructive" : "default"}
                  size="sm"
                  onClick={() => toggleAdminRole(user.user_id, user.is_admin)}
                  className="gap-2"
                >
                  {user.is_admin ? (
                    <>
                      <ShieldOff className="h-4 w-4" />
                      Rimuovi Admin
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Rendi Admin
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

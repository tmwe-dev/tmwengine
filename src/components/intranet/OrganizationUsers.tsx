import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  tmwe_email: string | null;
  preferred_language: string;
}

interface OrganizationUsersProps {
  currentUserId: string | null;
  onOpenPrivateChat: (userId: string, userName: string) => void;
}

export const OrganizationUsers = ({ currentUserId, onOpenPrivateChat }: OrganizationUsersProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    
    // Setup presence tracking
    const channel = supabase.channel('organization-presence');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) {
              online.add(presence.user_id);
            }
          });
        });
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserId) {
          await channel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, tmwe_email, preferred_language')
        .neq('user_id', currentUserId || '');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli utenti",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = (user: UserProfile) => {
    return user.display_name || user.tmwe_email || 'Utente Sconosciuto';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-3">
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nessun altro utente nell'organizzazione
          </p>
        ) : (
          users.map((user) => {
            const isOnline = onlineUsers.has(user.user_id);
            const displayName = getUserDisplayName(user);
            
            return (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getUserInitials(user.display_name, user.tmwe_email)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{displayName}</p>
                    {user.tmwe_email && (
                      <p className="text-sm text-muted-foreground truncate">
                        {user.tmwe_email}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
                        {isOnline ? 'Online' : 'Offline'}
                      </Badge>
                      {user.preferred_language && (
                        <Badge variant="outline" className="text-xs">
                          {user.preferred_language.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onOpenPrivateChat(user.user_id, displayName)}
                  className="shrink-0"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </Button>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
};

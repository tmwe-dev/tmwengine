import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { UserAvailabilityBadge } from './UserAvailabilityBadge';
import { UserAvailabilitySelector } from './UserAvailabilitySelector';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface UserPresence {
  user_id: string;
  online_at: string;
  status: 'online' | 'away' | 'busy';
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  availability_status: 'online' | 'busy' | 'dnd' | 'offline';
  status_emoji: string | null;
  status_color: string | null;
  status_message: string | null;
}

interface OnlineUsersProps {
  users: UserPresence[];
}

export const OnlineUsers = ({ users }: OnlineUsersProps) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());

  useEffect(() => {
    loadCurrentUser();
    loadUserProfiles();
  }, [users]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, availability_status, status_emoji, status_color, status_message')
      .eq('user_id', user.id)
      .single();

    if (data) setCurrentUser(data);
  };

  const loadUserProfiles = async () => {
    const userIds = users.map(u => u.user_id);
    if (userIds.length === 0) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, availability_status, status_emoji, status_color, status_message')
      .in('user_id', userIds);

    if (data) {
      const profilesMap = new Map(data.map(p => [p.user_id, p]));
      setUserProfiles(profilesMap);
    }
  };

  const getStatusColor = (status: 'online' | 'away' | 'busy') => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  const getStatusLabel = (status: 'online' | 'away' | 'busy') => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Assente';
      case 'busy':
        return 'Occupato';
      default:
        return 'Offline';
    }
  };

  const getUserInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <Badge variant="secondary" className="rounded-full">
            {users.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Utenti online</h4>
            <div className="flex items-center gap-2">
              {currentUser && (
                <UserAvailabilitySelector
                  currentStatus={currentUser.availability_status}
                  currentEmoji={currentUser.status_emoji || undefined}
                  currentColor={currentUser.status_color || undefined}
                  currentMessage={currentUser.status_message || undefined}
                />
              )}
              <Badge variant="secondary">{users.length}</Badge>
            </div>
          </div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {users.map((user) => {
                const profile = userProfiles.get(user.user_id);
                return (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">
                          {profile?.display_name?.substring(0, 2).toUpperCase() || getUserInitials(user.user_id)}
                        </AvatarFallback>
                      </Avatar>
                      {profile && (
                        <div className="absolute bottom-0 right-0">
                          <UserAvailabilityBadge
                            status={profile.availability_status}
                            emoji={profile.status_emoji || undefined}
                            color={profile.status_color || undefined}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {profile?.display_name || `Utente ${getUserInitials(user.user_id)}`}
                      </p>
                      {profile?.status_message ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.status_message}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {getStatusLabel(user.status)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nessun utente online</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

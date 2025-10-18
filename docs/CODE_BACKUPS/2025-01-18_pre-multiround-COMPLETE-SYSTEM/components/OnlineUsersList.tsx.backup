import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone } from 'lucide-react';
import { IconButton } from '@/components/design-system/buttons/IconButton';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  user_id: string;
  display_name: string;
}

interface OnlineUsersListProps {
  conversationId: string;
  currentUserId: string;
  onCallUser: (userId: string) => void;
}

export const OnlineUsersList = ({ 
  conversationId, 
  currentUserId, 
  onCallUser 
}: OnlineUsersListProps) => {
  const { onlineUsers } = useIntranetPresence(`chat-lab-${conversationId}`);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    const loadUserProfiles = async () => {
      if (onlineUsers.length === 0) return;

      const userIds = onlineUsers.map(u => u.user_id);
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (data) {
        const profilesMap = data.reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {} as Record<string, UserProfile>);
        setUserProfiles(profilesMap);
      }
    };

    loadUserProfiles();
  }, [onlineUsers]);

  const getUserInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Assente';
      case 'busy': return 'Occupato';
      default: return 'Offline';
    }
  };

  // Filtra l'utente corrente dalla lista
  const otherUsers = onlineUsers.filter(user => user.user_id !== currentUserId);

  if (otherUsers.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nessun altro utente online
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {otherUsers.map((user) => {
        const profile = userProfiles[user.user_id];
        const displayName = profile?.display_name || 'Utente';

        return (
          <Card key={user.user_id} className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(user.status)} text-white border-0`}
                  >
                    {getStatusLabel(user.status)}
                  </Badge>
                </div>
              </div>
              
              <IconButton
                icon={Phone}
                onClick={() => onCallUser(user.user_id)}
                tooltip={`Chiama ${displayName}`}
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

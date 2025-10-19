import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Users, Phone, MessageSquare, Video } from 'lucide-react';
import { DirectVideoCallButton } from './DirectVideoCallButton';
import { UserAvailabilityBadge } from './UserAvailabilityBadge';
import { UserAvailabilitySelector } from './UserAvailabilitySelector';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IconButton } from '@/components/design-system/buttons/IconButton';

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
  onCallUser?: (userId: string, userName: string) => void;
  onOpenPrivateChat?: (userId: string, userName: string) => void;
}

export const OnlineUsers = ({ users, onCallUser, onOpenPrivateChat }: OnlineUsersProps) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  

  // Carica current user solo al mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Carica user profiles solo quando cambia la lista di users
  useEffect(() => {
    loadUserProfiles();
  }, [users.map(u => u.user_id).join(',')]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

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

  // Filtra duplicati ed escludi l'utente corrente
  const uniqueUsers = Array.from(
    new Map(users.map(u => [u.user_id, u])).values()
  ).filter(u => u.user_id !== currentUserId);

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
    <TooltipProvider>
      <div className="flex flex-col flex-shrink-0 mt-6">
        <h3 className="text-xs font-semibold px-2 mb-3">
          Utenti Online
        </h3>

        <div className="px-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {currentUser && (
                <UserAvailabilitySelector
                  currentStatus={currentUser.availability_status}
                  currentEmoji={currentUser.status_emoji || undefined}
                  currentColor={currentUser.status_color || undefined}
                  currentMessage={currentUser.status_message || undefined}
                />
              )}
            </div>

            <ScrollArea className="max-h-40">
              <div className="space-y-2 pr-3 pb-2">
                {uniqueUsers.map((user) => {
                  const profile = userProfiles.get(user.user_id);
                  return (
                    <div
                      key={user.user_id}
                      className="relative group overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-3/5 after:h-px after:origin-left after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent hover:after:animate-line-bounce flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {profile?.display_name?.substring(0, 2).toUpperCase() || getUserInitials(user.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          {profile && (
                            <div className="absolute -bottom-0.5 -right-0.5">
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
                          <p className="text-xs font-medium truncate">
                            {profile?.display_name || `Utente ${getUserInitials(user.user_id)}`}
                          </p>
                          {profile?.status_message && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {profile.status_message}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {onOpenPrivateChat && (
                          <IconButton
                            icon={MessageSquare}
                            onClick={() => onOpenPrivateChat(
                              user.user_id, 
                              profile?.display_name || `Utente ${getUserInitials(user.user_id)}`
                            )}
                            tooltip="Apri chat privata"
                            variant="ghost"
                            size="sm"
                          />
                        )}
                        {onCallUser && (
                          <IconButton
                            icon={Phone}
                            onClick={() => onCallUser(
                              user.user_id, 
                              profile?.display_name || `Utente ${getUserInitials(user.user_id)}`
                            )}
                            tooltip="Chiama"
                            variant="ghost"
                            size="sm"
                          />
                        )}
                        <DirectVideoCallButton
                          targetUserId={user.user_id}
                          targetUserName={profile?.display_name || `Utente ${getUserInitials(user.user_id)}`}
                        />
                      </div>
                    </div>
                  );
                })}
                {uniqueUsers.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Nessuno online</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

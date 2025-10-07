import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, MessageSquare, UserCheck, Sparkles } from 'lucide-react';

interface Stats {
  totalRooms: number;
  totalMessages: number;
  totalUsers: number;
  activeRooms: number;
}

export const AdminStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalRooms: 0,
    totalMessages: 0,
    totalUsers: 0,
    activeRooms: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [roomsData, messagesData, usersData] = await Promise.all([
        supabase.from('intranet_rooms').select('id', { count: 'exact', head: true }),
        supabase.from('intranet_messages').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true })
      ]);

      // Conta stanze con messaggi recenti (ultime 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: activeRoomsData } = await supabase
        .from('intranet_messages')
        .select('room_id')
        .gte('created_at', yesterday.toISOString());

      const uniqueActiveRooms = new Set(activeRoomsData?.map(m => m.room_id) || []);

      setStats({
        totalRooms: roomsData.count || 0,
        totalMessages: messagesData.count || 0,
        totalUsers: usersData.count || 0,
        activeRooms: uniqueActiveRooms.size
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Totale Stanze',
      value: stats.totalRooms,
      icon: MessageSquare,
      description: `${stats.activeRooms} attive nelle ultime 24h`
    },
    {
      title: 'Totale Messaggi',
      value: stats.totalMessages,
      icon: Sparkles,
      description: 'Messaggi scambiati'
    },
    {
      title: 'Utenti Registrati',
      value: stats.totalUsers,
      icon: Users,
      description: 'Profili utente creati'
    },
    {
      title: 'Stanze Attive',
      value: stats.activeRooms,
      icon: UserCheck,
      description: 'Ultime 24 ore'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

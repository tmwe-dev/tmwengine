import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const FunEmailQuickStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['fun-email-quick-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      const { count, error } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', user.email)
        .eq('sync_status', 'fun_email_backup');

      if (error) throw error;

      // Get folder breakdown - usa aggregazione RPC per evitare limite 1000
      const { data: folderData } = await supabase.rpc('get_email_folder_counts', {
        p_user_email: user.email,
        p_sync_status: 'fun_email_backup'
      });

      const folderCounts = folderData?.reduce((acc: any, row: any) => {
        acc[row.cartella] = row.count;
        return acc;
      }, {}) || {};

      return {
        total: count || 0,
        folders: folderCounts,
      };
    },
    refetchInterval: 10000, // Refresh every 10s
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats?.total) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Nessuna email nel backup locale.
            <br />
            Clicca "Prepara Email per AI" per iniziare.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Email nel backup</p>
        </div>

        <div className="space-y-1">
          {Object.entries(stats.folders).map(([folder, count]) => (
            <div key={folder} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{folder}</span>
              <span className="font-medium">{count as number}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

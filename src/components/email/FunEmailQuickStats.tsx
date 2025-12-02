import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const FunEmailQuickStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['fun-email-quick-stats-zerosync'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      // 🆕 Zero-Sync: Usa TMWE API per ottenere statistiche
      const { emailSearchApi } = await import('@/lib/tmwe-email-search-api');
      
      // Fetch folders con conteggi
      const foldersResult = await emailSearchApi.getFolders({ 
        include_counts: true,
        timeout: 10 
      });

      const folderCounts: Record<string, number> = {};
      let total = 0;
      
      (foldersResult?.folders || []).forEach((folder: any) => {
        const count = folder.message_count || folder.messages || 0;
        folderCounts[folder.name] = count;
        total += count;
      });

      return {
        total,
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

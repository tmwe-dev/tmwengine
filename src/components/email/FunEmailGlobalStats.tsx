import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Database, Folder, Loader2 } from 'lucide-react';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

interface FunEmailGlobalStatsProps {
  totalDB?: number;  // Deprecated - kept for backward compatibility
  folders?: { name: string; count: number }[];  // Deprecated
}

export const FunEmailGlobalStats = ({ totalDB: _totalDB, folders: _folders }: FunEmailGlobalStatsProps) => {
  // 🆕 Zero-Sync: Fetch statistiche da TMWE API
  const { data: stats, isLoading } = useQuery({
    queryKey: ['fun-email-global-stats-zerosync'],
    queryFn: async () => {
      const foldersResult = await emailSearchApi.getFolders({ 
        include_counts: true,
        timeout: 10 
      });

      const foldersList = (foldersResult?.folders || []).map((folder: any) => ({
        name: folder.name,
        count: folder.message_count || folder.messages || 0
      }));

      const total = foldersList.reduce((sum, f) => sum + f.count, 0);

      return { total, folders: foldersList };
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const totalDB = stats?.total ?? _totalDB ?? 0;
  const folders = stats?.folders ?? _folders ?? [];
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* 🆕 Zero-Sync: Email totali da TMWE API */}
        <div className="text-center pb-4 border-b">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <Database className="h-5 w-5" />
            <span className="text-sm font-medium">Email Disponibili (TMWE API)</span>
          </div>
          <p className="text-4xl font-bold text-primary">{totalDB.toLocaleString()}</p>
        </div>

        {/* Breakdown per Cartella */}
        {folders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Folder className="h-4 w-4" />
              <span className="text-xs font-medium">Per Cartella</span>
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {folders.map((folder) => (
                <div key={folder.name} className="flex justify-between items-center text-sm py-1 px-2 hover:bg-muted/50 rounded">
                  <span className="truncate flex-1">{folder.name}</span>
                  <span className="font-medium text-muted-foreground ml-2">{folder.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

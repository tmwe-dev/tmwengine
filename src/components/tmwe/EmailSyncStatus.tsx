/**
 * ✅ REFACTORED: Shows email statistics from API only
 * No sync comparison needed - API is always the source of truth
 */
import { useQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Mail } from 'lucide-react';

interface EmailSyncStatusProps {
  selectedFolder: string;
  onStartSync?: () => void; // Deprecated, kept for compatibility
  isDownloading?: boolean; // Deprecated, kept for compatibility
}

export const EmailSyncStatus = ({ selectedFolder }: EmailSyncStatusProps) => {
  const { data: folderStats, isLoading } = useQuery({
    queryKey: ['folder-stats', selectedFolder],
    queryFn: async () => {
      const folders = await emailSearchApi.getFolders();
      const folderData = folders?.data?.find((f: any) => f.name === selectedFolder);
      
      return {
        total: folderData?.messages || 0,
        unread: folderData?.unseen || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30s
    enabled: !!selectedFolder,
  });

  if (isLoading || !folderStats) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Caricamento statistiche...
      </div>
    );
  }

  const { total, unread } = folderStats;

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Mail className="h-3 w-3" />
        <strong className="text-foreground">{total}</strong> email
      </span>
      
      {unread > 0 && (
        <Badge variant="secondary" className="gap-1">
          {unread} non lette
        </Badge>
      )}
    </div>
  );
};

import { useFolderTreeFast } from '@/hooks/email/useEmailFast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Folder, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * EmailHubGlobalStatsAPI - Estadísticas globales desde API
 * ✅ Usa useFolderTreeFast para obtener todas las carpetas
 * ✅ Calcula totales sin tocar email_messages
 */
export const EmailHubGlobalStatsAPI = () => {
  const { data: folderTree, isLoading, error } = useFolderTreeFast();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar carpetas: {error instanceof Error ? error.message : 'Error desconocido'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!folderTree || !Array.isArray(folderTree)) {
    return (
      <Alert>
        <AlertDescription>
          No hay carpetas disponibles
        </AlertDescription>
      </Alert>
    );
  }

  // Extraer datos de carpetas
  const folders = folderTree.map((folder: any) => ({
    name: folder.name || folder.folder_name || 'Unknown',
    count: folder.messages || folder.message_count || 0,
    unread: folder.unseen || folder.unread_count || 0,
  }));

  // Calcular total global
  const totalEmails = folders.reduce((sum, folder) => sum + folder.count, 0);
  const totalUnread = folders.reduce((sum, folder) => sum + folder.unread, 0);

  // Ordenar por cantidad de emails
  const sortedFolders = [...folders].sort((a, b) => b.count - a.count);
  const topFolders = sortedFolders.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Estadísticas Globales del Servidor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Totales Generales */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{totalEmails.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Emails</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-500">{totalUnread.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">No Leídos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500">{folders.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Carpetas</p>
          </div>
        </div>

        {/* Top Carpetas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Top 10 Carpetas</span>
          </div>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {topFolders.map((folder, index) => {
                const percentage = totalEmails > 0 
                  ? ((folder.count / totalEmails) * 100).toFixed(1) 
                  : '0';
                
                return (
                  <div
                    key={folder.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="truncate font-medium">{folder.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-4">
                      {folder.unread > 0 && (
                        <span className="text-xs text-amber-500 font-medium">
                          {folder.unread} nuevos
                        </span>
                      )}
                      <div className="text-right">
                        <p className="font-semibold">{folder.count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Footer Info */}
        <div className="pt-4 border-t text-xs text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-3 w-3" />
          Datos obtenidos en tiempo real desde el servidor IMAP
        </div>
      </CardContent>
    </Card>
  );
};

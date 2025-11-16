import { useFolderTreeFast } from '@/hooks/email/useEmailFast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderTree, ChevronRight, Mail, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface EmailHubFolderSelectorProps {
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
}

/**
 * EmailHubFolderSelector - Selector de carpetas desde API
 * ✅ Usa useFolderTreeFast
 * ✅ NO incluye funcionalidad de descarga (API-only)
 */
export const EmailHubFolderSelector = ({
  selectedFolder,
  onFolderChange,
}: EmailHubFolderSelectorProps) => {
  const { data: folderTree, isLoading, error } = useFolderTreeFast();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
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

  // Transformar datos de carpetas
  const folders = folderTree.map((folder: any) => ({
    name: folder.name || folder.folder_name || 'Unknown',
    count: folder.messages || folder.message_count || 0,
    unread: folder.unseen || folder.unread_count || 0,
  }));

  // Separar INBOX y ordenar el resto
  const inboxFolder = folders.find(f => f.name === 'INBOX');
  const otherFolders = folders
    .filter(f => f.name !== 'INBOX')
    .sort((a, b) => a.name.localeCompare(b.name));

  const orderedFolders = inboxFolder 
    ? [inboxFolder, ...otherFolders] 
    : otherFolders;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          Explorador de Carpetas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-1 pr-4">
            {orderedFolders.map((folder) => {
              const isSelected = folder.name === selectedFolder;
              const isInbox = folder.name === 'INBOX';
              
              return (
                <Button
                  key={folder.name}
                  variant={isSelected ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-between h-auto py-3 px-4',
                    isSelected && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => onFolderChange(folder.name)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isInbox ? (
                      <Inbox className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Mail className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate text-left">{folder.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {folder.unread > 0 && (
                      <span className={cn(
                        'text-xs font-bold px-2 py-1 rounded-full',
                        isSelected 
                          ? 'bg-primary-foreground/20 text-primary-foreground' 
                          : 'bg-amber-500/20 text-amber-700'
                      )}>
                        {folder.unread}
                      </span>
                    )}
                    <span className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                      {folder.count.toLocaleString()}
                    </span>
                    <ChevronRight className={cn(
                      'h-4 w-4',
                      isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                    )} />
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          💡 Tip: Los datos se obtienen directamente del servidor en tiempo real
        </div>
      </CardContent>
    </Card>
  );
};

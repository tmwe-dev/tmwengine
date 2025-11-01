import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, FolderOpen, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FolderProgress {
  name: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  total: number;
  downloaded: number;
  error?: string;
}

interface SyncProgressOverlayProps {
  folders: FolderProgress[];
  onCancel: () => void;
  open?: boolean;
}

export function SyncProgressOverlay({ folders, onCancel, open = true }: SyncProgressOverlayProps) {
  const completedFolders = folders.filter(f => f.status === 'completed').length;
  const totalFolders = folders.length;
  const overallProgress = totalFolders > 0 ? (completedFolders / totalFolders) * 100 : 0;

  const totalDownloaded = folders.reduce((sum, f) => sum + f.downloaded, 0);
  const totalEmails = folders.reduce((sum, f) => sum + f.total, 0);

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Sincronizzazione Automatica
            </span>
            <Badge variant="outline" className="font-mono">
              {completedFolders} / {totalFolders}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Overall Progress */}
        <div className="space-y-2 border-b pb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Progresso Totale</span>
            <span className="text-muted-foreground">
              {totalDownloaded.toLocaleString()} / {totalEmails.toLocaleString()} email
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Folder List */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {folders.map(folder => (
              <div
                key={folder.name}
                className="p-4 border rounded-lg space-y-2 transition-all hover:border-primary/50"
              >
                {/* Folder Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  
                  {/* Status Badge */}
                  {folder.status === 'pending' && (
                    <Badge variant="outline" className="gap-1">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      In attesa
                    </Badge>
                  )}
                  {folder.status === 'downloading' && (
                    <Badge variant="default" className="gap-1 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Scaricamento...
                    </Badge>
                  )}
                  {folder.status === 'completed' && (
                    <Badge variant="default" className="gap-1 bg-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Completato
                    </Badge>
                  )}
                  {folder.status === 'error' && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Errore
                    </Badge>
                  )}
                </div>

                {/* Progress Bar (only for downloading/completed) */}
                {(folder.status === 'downloading' || folder.status === 'completed') && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{folder.downloaded} / {folder.total}</span>
                      <span>{folder.total > 0 ? Math.round((folder.downloaded / folder.total) * 100) : 0}%</span>
                    </div>
                    <Progress 
                      value={folder.total > 0 ? (folder.downloaded / folder.total) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                )}

                {/* Error Message */}
                {folder.status === 'error' && folder.error && (
                  <p className="text-xs text-destructive mt-1">
                    {folder.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {completedFolders === totalFolders ? (
              <span className="text-green-500 font-semibold">✓ Sincronizzazione completata</span>
            ) : (
              <span>Sincronizzazione in corso...</span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {completedFolders === totalFolders ? 'Chiudi' : 'Annulla'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';

interface SyncProgressMultiProps {
  currentFolder: string;
  currentFolderIndex: number;
  totalFolders: number;
  processedEmails: number;
  currentPhase?: string;
}

export const SyncProgressMulti = ({
  currentFolder,
  currentFolderIndex,
  totalFolders,
  processedEmails,
  currentPhase = 'Sincronizzazione in corso',
}: SyncProgressMultiProps) => {
  const progress = totalFolders > 0 ? (currentFolderIndex / totalFolders) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Progresso Totale</span>
          <span className="text-muted-foreground">
            {currentFolderIndex} / {totalFolders} cartelle
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {currentFolder && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div className="flex-1">
              <span className="font-medium">In corso: {currentFolder}</span>
              <div className="text-sm text-muted-foreground mt-1">
                Cartella {currentFolderIndex} di {totalFolders} • {processedEmails} email elaborate
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 italic">
                {currentPhase}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

import { FolderResult } from '@/hooks/useMultiFolderSync';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';

interface SyncProgressMultiProps {
  currentFolder: string;
  currentFolderIndex: number;
  totalFolders: number;
  results: FolderResult[];
  processedEmails: number;
}

export const SyncProgressMulti = ({
  currentFolder,
  currentFolderIndex,
  totalFolders,
  results,
  processedEmails,
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
            <span className="font-medium">In corso: {currentFolder}</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {processedEmails} email elaborate
            </span>
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Risultati:</p>
          {results.map((result, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.errors > 0 ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : result.downloaded > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{result.folder}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">
                    ↓ {result.downloaded}
                  </span>
                  <span className="text-muted-foreground">
                    ≈ {result.skipped}
                  </span>
                  {result.errors > 0 && (
                    <span className="text-destructive">
                      ✕ {result.errors}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

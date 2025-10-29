import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Download } from 'lucide-react';

interface GapCheckResult {
  folder: string;
  max_uid_local: number;
  max_uid_server: number;
  missing_count: number;
  status: 'synced' | 'gap' | 'error';
  error_message?: string;
}

interface EmailGapResultsProps {
  results: GapCheckResult[];
  onSyncGap?: (folder: string) => void;
  onClose?: () => void;
}

export function EmailGapResults({ results, onSyncGap, onClose }: EmailGapResultsProps) {
  const totalGaps = results.reduce((sum, r) => sum + r.missing_count, 0);
  const foldersWithGaps = results.filter(r => r.status === 'gap').length;
  const syncedFolders = results.filter(r => r.status === 'synced').length;
  const errorFolders = results.filter(r => r.status === 'error').length;

  return (
    <Card className="mt-4 border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🔍 Risultati Verifica Gap
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
        <div className="flex gap-3 text-sm mt-2">
          <div className="flex items-center gap-1">
            <Badge variant="destructive" className="h-5">
              {foldersWithGaps}
            </Badge>
            <span className="text-muted-foreground">con gap</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="h-5 bg-green-50 text-green-700 border-green-200">
              {syncedFolders}
            </Badge>
            <span className="text-muted-foreground">sincronizzate</span>
          </div>
          {errorFolders > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="h-5">
                {errorFolders}
              </Badge>
              <span className="text-muted-foreground">errori</span>
            </div>
          )}
          <div className="ml-auto font-semibold text-primary">
            {totalGaps} email mancanti
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.map((result) => (
            <div
              key={result.folder}
              className={`p-3 rounded-lg border transition-colors ${
                result.status === 'synced'
                  ? 'bg-green-50/50 border-green-200/50'
                  : result.status === 'gap'
                  ? 'bg-yellow-50/50 border-yellow-300/50'
                  : 'bg-red-50/50 border-red-200/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">
                      📂 {result.folder}
                    </span>
                    {result.status === 'synced' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                    {result.status === 'gap' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    )}
                    {result.status === 'error' && (
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>
                      <span className="font-medium">DB locale:</span> UID max {result.max_uid_local}
                    </div>
                    <div>
                      <span className="font-medium">Server:</span> {result.max_uid_server} email totali
                    </div>
                    {result.error_message && (
                      <div className="text-red-600 font-medium">
                        ⚠️ {result.error_message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {result.status === 'gap' ? (
                    <>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-700">
                          {result.missing_count}
                        </div>
                        <div className="text-xs text-yellow-600">mancanti</div>
                      </div>
                      {onSyncGap && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSyncGap(result.folder)}
                          className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Sync
                        </Button>
                      )}
                    </>
                  ) : result.status === 'synced' ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓ OK
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
                      Errore
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

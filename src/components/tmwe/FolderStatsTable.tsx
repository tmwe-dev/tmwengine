import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { FolderStat } from '@/hooks/useEmailStats';

interface FolderStatsTableProps {
  folders: any[];
  stats: FolderStat[];
  selectedFolders: string[];
  onToggle: (folderName: string) => void;
  isDownloading?: boolean;
  folderProgress?: Map<string, any>;
}

export const FolderStatsTable = ({
  folders,
  stats,
  selectedFolders,
  onToggle,
  isDownloading = false,
  folderProgress,
}: FolderStatsTableProps) => {
  const getDepth = (folderName: string) => {
    return (folderName.match(/\//g) || []).length;
  };

  const getFolderStat = (folderName: string) => {
    return stats.find(s => s.folder === folderName);
  };

  const getStatusBadge = (stat: FolderStat | undefined, folderName: string) => {
    const progress = folderProgress?.get(folderName);
    
    if (progress?.status === 'downloading') {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          {progress.speed ? `${progress.speed.toFixed(1)}/s` : 'Download...'}
        </Badge>
      );
    }
    
    if (progress?.status === 'completed') {
      return (
        <Badge variant="outline" className="bg-green-600/10 text-green-600 border-green-600/20">
          <Check className="h-3 w-3 mr-1" />
          Completata
        </Badge>
      );
    }
    
    if (progress?.status === 'error') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Errore
        </Badge>
      );
    }

    if (!stat) return null;

    if (stat.isFullySynced) {
      return (
        <Badge variant="outline" className="bg-green-600/10 text-green-600 border-green-600/20">
          <Check className="h-3 w-3 mr-1" />
          Sincronizzato
        </Badge>
      );
    }

    if (stat.syncPercentage === 0 && stat.serverTotal > 0) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Da scaricare
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-orange-600/10 text-orange-600 border-orange-600/20">
        Parziale
      </Badge>
    );
  };

  const getSyncColor = (percentage: number) => {
    if (percentage >= 98) return 'bg-green-600';
    if (percentage >= 50) return 'bg-orange-600';
    return 'bg-destructive';
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10"></TableHead>
            <TableHead>Cartella</TableHead>
            <TableHead className="text-right w-20">DB</TableHead>
            <TableHead className="text-right w-20">Server</TableHead>
            <TableHead className="text-right w-24">Mancanti</TableHead>
            <TableHead className="w-[200px]">Sincronizzazione</TableHead>
            <TableHead className="w-[140px]">Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nessuna cartella trovata
              </TableCell>
            </TableRow>
          ) : (
            folders.map((folder) => {
              const stat = getFolderStat(folder.name);
              const isSelected = selectedFolders.includes(folder.name);
              const depth = getDepth(folder.name);
              const progress = folderProgress?.get(folder.name);
              const isCurrentlyDownloading = progress?.status === 'downloading';

              return (
                <TableRow 
                  key={folder.name} 
                  className={`
                    ${!isSelected && !isCurrentlyDownloading ? 'opacity-50' : ''}
                    ${isCurrentlyDownloading ? 'bg-primary/5' : ''}
                  `}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(folder.name)}
                      disabled={isDownloading}
                    />
                  </TableCell>
                  <TableCell style={{ paddingLeft: `${8 + depth * 20}px` }}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{folder.name}</span>
                      {folder.recommended && (
                        <Badge variant="secondary" className="text-xs">Consigliata</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {stat?.dbCount.toLocaleString() || '0'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {stat?.serverTotal.toLocaleString() || '0'}
                  </TableCell>
                  <TableCell className="text-right">
                    {stat && stat.missing > 0 ? (
                      <span className="font-mono text-sm text-destructive font-medium">
                        {stat.missing.toLocaleString()}
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={stat?.syncPercentage || 0} 
                        className="h-2 flex-1"
                        indicatorClassName={stat ? getSyncColor(stat.syncPercentage) : ''}
                      />
                      <span className="text-xs font-medium w-12 text-right tabular-nums">
                        {Math.round(stat?.syncPercentage || 0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(stat, folder.name)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Folder Selector - Selettore dinamico cartelle email
 * Mostra conteggi server/DB e status sync per ogni cartella
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Folder, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { UnifiedFolderCount } from '@/lib/email-count-service';

interface FolderSelectorProps {
  folders: UnifiedFolderCount[];
  selectedFolder?: string;
  onSelect: (folderName: string) => void;
  showCounts?: boolean;
  showSyncStatus?: boolean;
}

export function FolderSelector({
  folders,
  selectedFolder,
  onSelect,
  showCounts = true,
  showSyncStatus = true
}: FolderSelectorProps) {
  
  const getSyncBadgeVariant = (syncPercentage: number) => {
    if (syncPercentage >= 90) return 'default';
    if (syncPercentage >= 50) return 'secondary';
    return 'destructive';
  };
  
  const getSyncIcon = (folder: UnifiedFolderCount) => {
    if (folder.errors.length > 0) return <AlertCircle className="h-3 w-3" />;
    if (folder.syncPercentage === 100) return <CheckCircle className="h-3 w-3" />;
    return <Info className="h-3 w-3" />;
  };
  
  if (folders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Nessuna cartella disponibile</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-2">
        {folders.length} cartelle disponibili
        {showSyncStatus && ` • ${folders.filter(f => f.isTestable).length} testabili`}
      </div>
      
      <div className="grid gap-2">
        {folders.map((folder) => (
          <TooltipProvider key={folder.folderName}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedFolder === folder.folderName ? 'default' : 'outline'}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => onSelect(folder.folderName)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    
                    <div className="flex-1 text-left">
                      <div className="font-medium">{folder.folderName}</div>
                      
                      {showCounts && (
                        <div className="text-xs text-muted-foreground mt-1 space-x-2">
                          <span>
                            Server: {folder.serverCount >= 0 ? folder.serverCount : 'N/A'}
                          </span>
                          <span>•</span>
                          <span>DB: {folder.dbCount}</span>
                          {folder.missing > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-destructive">
                                Missing: {folder.missing}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {showSyncStatus && (
                      <div className="flex items-center gap-1">
                        {getSyncIcon(folder)}
                        <Badge variant={getSyncBadgeVariant(folder.syncPercentage)}>
                          {folder.syncPercentage}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </Button>
              </TooltipTrigger>
              
              <TooltipContent side="right" className="max-w-sm">
                <div className="space-y-2">
                  <div className="font-semibold">{folder.folderName}</div>
                  
                  <div className="text-xs space-y-1">
                    <div>Server: {folder.serverCount >= 0 ? folder.serverCount : 'N/A'} email</div>
                    <div>DB Locale: {folder.dbCount} email</div>
                    <div>Missing: {folder.missing} email</div>
                    <div>Sync: {folder.syncPercentage}%</div>
                    <div>Source: {folder.serverSource}</div>
                    <div>Testable: {folder.isTestable ? '✅ Yes' : '❌ No (< 10 emails)'}</div>
                  </div>
                  
                  {folder.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="text-xs font-semibold text-destructive mb-1">
                        ⚠️ Issues:
                      </div>
                      {folder.errors.map((err, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          • {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

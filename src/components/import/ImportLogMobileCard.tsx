import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Upload, FileSpreadsheet, Calendar, TrendingUp, AlertTriangle, Wrench, FileDown, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImportLog {
  id: string;
  file_name: string;
  stato: string;
  righe_totali: number;
  righe_errori: number;
  contatti_selezionati: number;
  created_at: string;
  trasferiti_rubrica?: boolean;
}

interface ImportLogMobileCardProps {
  log: ImportLog;
  onProcess: () => void;
  onViewRecords: () => void;
  onDownloadOriginal: () => void;
  onDownloadContacts: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  isProcessing: boolean;
  isLoading: boolean;
  isSelected: boolean;
  isExportingOriginal: boolean;
  isExportingContacts: boolean;
}

export function ImportLogMobileCard({
  log,
  onProcess,
  onViewRecords,
  onDownloadOriginal,
  onDownloadContacts,
  getStatusBadge,
  isProcessing,
  isLoading,
  isSelected,
  isExportingOriginal,
  isExportingContacts
}: ImportLogMobileCardProps) {
  const navigate = useNavigate();
  const canProcess = log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato';
  const canView = !(log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato');

  return (
    <Card className={cn(
      "border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 rounded-xl bg-gradient-to-br from-background to-muted/30",
      isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
    )}>
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Date - centered at top */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(log.created_at).toLocaleDateString('it-IT')}</span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-foreground truncate">
                  {log.file_name}
                </span>
              </div>
            </div>
          </div>

          {/* Status - right aligned */}
          <div className="flex justify-end">
            <div className="text-sm font-medium text-white">{log.stato === 'completato' ? 'Completato' : log.stato === 'errore' ? 'Errore' : log.stato === 'in_corso' || log.stato === 'elaborazione' ? 'In elaborazione' : 'Pronto'}</div>
          </div>

          {/* Stats - left aligned with AI Repair button */}
          <div className="flex flex-col gap-2 items-start">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full">
                <AlertTriangle className="h-3 w-3 text-red-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-white">{log.righe_errori}</span>
                <span className="text-xs text-white ml-1">Errori rilevati</span>
              </div>
            </div>
            
            {/* AI Repair Button - shown if there are errors */}
            {log.righe_errori > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/import-errors-monitor?import_log_id=${log.id}`)}
                className="gap-2 bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20 text-white"
              >
                <Wrench className="h-3 w-3" />
                Ripara con AI ({log.righe_errori})
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full">
                <TrendingUp className="h-3 w-3 text-green-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-white">{log.righe_totali}</span>
                <span className="text-xs text-white ml-1">Record</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 justify-start flex-wrap">
            {canProcess && (
              <Button 
                size="sm"
                onClick={onProcess}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Elabora
              </Button>
            )}
            
            <Button 
              variant="outline"
              size="sm"
              onClick={onViewRecords}
              disabled={isLoading || !canView}
              className="px-3"
            >
              <Users className="h-4 w-4 mr-1" />
              {isLoading ? 'Caricamento...' : 'Gestisci'}
            </Button>

            {canView && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDownloadOriginal}
                        disabled={isExportingOriginal}
                        className="px-2"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Scarica CSV originale</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDownloadContacts}
                        disabled={isExportingContacts}
                        className="px-2"
                      >
                        <TableProperties className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Esporta contatti elaborati CSV</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
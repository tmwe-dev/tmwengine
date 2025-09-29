import React from 'react';
import { Users, Upload, Trash2, FileSpreadsheet, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  onDelete: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  isProcessing: boolean;
  isLoading: boolean;
  isSelected: boolean;
}

export function ImportLogMobileCard({
  log,
  onProcess,
  onViewRecords,
  onDelete,
  getStatusBadge,
  isProcessing,
  isLoading,
  isSelected
}: ImportLogMobileCardProps) {
  const canProcess = log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato';
  const canView = !(log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato');

  return (
    <Card className={cn(
      "border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 rounded-xl bg-gradient-to-br from-background to-muted/30",
      isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
    )}>
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-foreground truncate">
                  {log.file_name}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(log.created_at).toLocaleDateString('it-IT')}</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {getStatusBadge(log.stato)}
            {log.trasferiti_rubrica && (
              <Badge variant="outline" className="text-blue-700 border-blue-200">
                Trasferiti
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full border border-green-200">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">{log.righe_totali}</div>
                  <div className="text-xs text-muted-foreground">Righe totali</div>
                </div>
              </div>
            </div>
            
            {/* Errors section */}
            <div className="rounded-lg p-3 border border-red-200">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full border border-red-200">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-red-700">{log.righe_errori}</div>
                  <div className="text-xs text-red-600">Errori rilevati</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {canProcess && (
              <Button 
                size="sm"
                onClick={onProcess}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
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
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              {isLoading ? 'Caricamento...' : 'Gestisci'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
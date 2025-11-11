import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, RefreshCw, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';

interface ImportLog {
  id: string;
  file_name: string;
  file_path: string;
  nome_tabella_temporanea: string | null;
  righe_totali: number;
  righe_importate: number;
  righe_errori: number;
  contatti_selezionati: number;
  stato: string;
  trasferiti_rubrica: boolean;
  created_at: string;
}

interface ImportLogsTableProps {
  logs: ImportLog[];
  loading: boolean;
  lockedFiles: Set<string>;
  onToggleLock: (id: string) => void;
  onView: (log: ImportLog) => void;
  onProcess: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ImportLogsTable({
  logs,
  loading,
  lockedFiles,
  onToggleLock,
  onView,
  onProcess,
  onDelete
}: ImportLogsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nessun file importato
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Data Import</TableHead>
          <TableHead className="text-center">Righe Totali</TableHead>
          <TableHead className="text-center">Righe Importate</TableHead>
          <TableHead className="text-center">Righe Errori</TableHead>
          <TableHead className="text-center">Stato</TableHead>
          <TableHead className="text-center">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => {
          const isLocked = lockedFiles.has(log.id);
          
          return (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{log.file_name}</TableCell>
              <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
              <TableCell className="text-center">{log.righe_totali}</TableCell>
              <TableCell className="text-center">{log.righe_importate}</TableCell>
              <TableCell className="text-center">{log.righe_errori}</TableCell>
              <TableCell className="text-center">
                {log.stato === 'completato' && (
                  <Badge variant="default" className="bg-green-500">
                    Completato
                  </Badge>
                )}
                {log.stato === 'errore' && (
                  <Badge variant="destructive">Errore</Badge>
                )}
                {log.stato === 'in_attesa' && (
                  <Badge variant="secondary">In Attesa</Badge>
                )}
                {log.stato === 'elaborazione' && (
                  <Badge variant="outline">Elaborazione...</Badge>
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleLock(log.id)}
                    title={isLocked ? "Sblocca file" : "Blocca file"}
                  >
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-red-500" />
                    ) : (
                      <Unlock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {log.stato === 'in_attesa' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onProcess(log.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {!isLocked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(log.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

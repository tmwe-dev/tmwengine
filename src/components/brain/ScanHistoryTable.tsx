import React from 'react';
import { Eye, FileCode, Copy, Share2, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainScan } from '@/hooks/useBrainScans';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ScanHistoryTableProps {
  scans: BrainScan[];
  onRefresh?: () => void;
}

export function ScanHistoryTable({ scans }: ScanHistoryTableProps) {
  const navigate = useNavigate();

  const getScanTypeLabel = (type: string) => {
    switch (type) {
      case 'full':
        return 'Full';
      case 'incremental':
        return 'Incrementale';
      case 'specific':
        return 'Specifico';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completato
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In corso
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">Errore</Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: it,
      });
    } catch {
      return 'Data non valida';
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold">Data</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
            <TableHead className="font-semibold">Stato</TableHead>
            <TableHead className="font-semibold text-center">File</TableHead>
            <TableHead className="font-semibold text-center">Funzioni</TableHead>
            <TableHead className="font-semibold text-center">Duplicati</TableHead>
            <TableHead className="font-semibold text-center">Condivise</TableHead>
            <TableHead className="font-semibold text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan) => (
            <TableRow key={scan.id} className="hover:bg-muted/20">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDate(scan.started_at)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getScanTypeLabel(scan.scan_type)}</Badge>
              </TableCell>
              <TableCell>{getStatusBadge(scan.status)}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{scan.files_scanned}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium">{scan.functions_found}</span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Copy className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-500">{scan.duplicates_detected}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Share2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-500">{scan.shared_functions}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/brain/function-tree?scan=${scan.id}`)}
                  disabled={scan.status !== 'completed'}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Dettagli
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

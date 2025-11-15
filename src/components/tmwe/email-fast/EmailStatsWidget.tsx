import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { Mail, MailOpen, Star, Paperclip, HardDrive } from 'lucide-react';
import { useEmailStatsFast } from '@/hooks/email/useEmailFast';

interface EmailStatsWidgetProps {
  folder?: string;
  className?: string;
}

export const EmailStatsWidget: React.FC<EmailStatsWidgetProps> = ({
  folder,
  className
}) => {
  const { data: stats, isLoading, error } = useEmailStatsFast(folder);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingState message="Cargando estadísticas..." size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-destructive">
          Error al cargar estadísticas
        </CardContent>
      </Card>
    );
  }

  const statsData = stats?.data || stats || {};
  const total = statsData.total || 0;
  const unread = statsData.unread || 0;
  const flagged = statsData.flagged || 0;
  const withAttachments = statsData.with_attachments || 0;
  const sizeBytes = statsData.size_bytes || 0;

  // Format size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">
          {folder ? `Estadísticas: ${folder}` : 'Estadísticas Globales'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <div className="p-2 rounded-full bg-blue-500/10">
              <MailOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{unread}</div>
              <div className="text-xs text-muted-foreground">No leídos</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{flagged}</div>
              <div className="text-xs text-muted-foreground">Destacados</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <div className="p-2 rounded-full bg-green-500/10">
              <Paperclip className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{withAttachments}</div>
              <div className="text-xs text-muted-foreground">Con adjuntos</div>
            </div>
          </div>

          {sizeBytes > 0 && (
            <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg bg-accent/50">
              <div className="p-2 rounded-full bg-purple-500/10">
                <HardDrive className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatSize(sizeBytes)}</div>
                <div className="text-xs text-muted-foreground">Espacio usado</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

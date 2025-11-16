import { useEmailStatsFast } from '@/hooks/email/useEmailFast';
import { StatCard } from '@/components/design-system/cards/StatCard';
import { Mail, Inbox, Flag, Paperclip } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailHubQuickStatsAPIProps {
  folder?: string;
}

/**
 * EmailHubQuickStatsAPI - Estadísticas rápidas desde API
 * ✅ Usa useEmailStatsFast (hook optimizado)
 * ✅ Sin queries a email_messages
 */
export const EmailHubQuickStatsAPI = ({ folder }: EmailHubQuickStatsAPIProps) => {
  const { data: stats, isLoading, error } = useEmailStatsFast(folder);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar estadísticas: {error instanceof Error ? error.message : 'Error desconocido'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>
          No hay datos disponibles para esta carpeta
        </AlertDescription>
      </Alert>
    );
  }

  const totalEmails = stats.total || 0;
  const unreadEmails = stats.unread || 0;
  const flaggedEmails = stats.flagged || 0;
  const withAttachments = stats.with_attachments || 0;

  // Calcular tendencias (placeholder - en Sprint 2 se implementará histórico)
  const readPercentage = totalEmails > 0 
    ? Math.round(((totalEmails - unreadEmails) / totalEmails) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Estadísticas {folder ? `- ${folder}` : 'Globales'}
        </h3>
        <span className="text-xs text-muted-foreground">
          Actualizado: {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Mail}
          label="Total Emails"
          value={totalEmails.toLocaleString()}
        />

        <StatCard
          icon={Inbox}
          label="No Leídos"
          value={unreadEmails.toLocaleString()}
          trend={readPercentage > 50 ? 'down' : 'up'}
          trendValue={`${readPercentage}% leídos`}
        />

        <StatCard
          icon={Flag}
          label="Destacados"
          value={flaggedEmails.toLocaleString()}
        />

        <StatCard
          icon={Paperclip}
          label="Con Adjuntos"
          value={withAttachments.toLocaleString()}
        />
      </div>
    </div>
  );
};

/**
 * Component to run TMWE Email ID migration
 * Migrates existing email_ai_classifications to use tmwe_email_id
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { useMigrateTmweEmailIds } from '@/hooks/useMigrateTmweEmailIds';

export const TmweEmailIdMigration = () => {
  const { runMigration, checkPending, isRunning, progress } = useMigrateTmweEmailIds();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    migrated: number;
    failed: number;
    total: number;
  } | null>(null);

  const handleCheckPending = async () => {
    const count = await checkPending();
    setPendingCount(count);
  };

  const handleRunMigration = async () => {
    const result = await runMigration(20);
    setLastResult({
      migrated: result.migrated,
      failed: result.failed,
      total: result.total
    });
    // Refresh pending count
    await handleCheckPending();
  };

  const progressPercent = progress.total > 0 
    ? Math.round((progress.processed / progress.total) * 100) 
    : 0;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migración TMWE Email ID
        </CardTitle>
        <CardDescription>
          Migra clasificaciones existentes para usar tmwe_email_id de la API TMWE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Pendientes de migrar:</span>
          <div className="flex items-center gap-2">
            {pendingCount !== null ? (
              <Badge variant={pendingCount === 0 ? 'default' : 'secondary'}>
                {pendingCount}
              </Badge>
            ) : (
              <Badge variant="outline">—</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleCheckPending} disabled={isRunning}>
              Verificar
            </Button>
          </div>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progreso:</span>
              <span>{progress.processed} / {progress.total}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="truncate">{progress.currentEmail}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-green-500">✓ {progress.migrated}</span>
              <span className="text-red-500">✗ {progress.failed}</span>
            </div>
          </div>
        )}

        {/* Last result */}
        {lastResult && !isRunning && (
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              {lastResult.failed === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              Última migración
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total: {lastResult.total}</span>
              <span className="text-green-500">Migradas: {lastResult.migrated}</span>
              {lastResult.failed > 0 && (
                <span className="text-red-500">Fallidas: {lastResult.failed}</span>
              )}
            </div>
          </div>
        )}

        {/* Action button */}
        <Button 
          onClick={handleRunMigration} 
          disabled={isRunning || pendingCount === 0}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migrando...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Ejecutar Migración (batch 20)
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Procesa 20 clasificaciones por ejecución. Ejecuta múltiples veces para migrar todas.
        </p>
      </CardContent>
    </Card>
  );
};

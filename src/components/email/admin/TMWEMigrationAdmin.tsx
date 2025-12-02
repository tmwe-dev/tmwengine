/**
 * TMWEMigrationAdmin - Panel de administración para migración de TMWE Email IDs
 * Permite ejecutar dry-run y migración completa de email_ai_classifications
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database, Play, TestTube, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';

interface MigrationResult {
  success: boolean;
  dry_run: boolean;
  total_to_migrate: number;
  migrated: number;
  failed: number;
  skipped: number;
  details: Array<{
    id: string;
    sender_email: string;
    subject: string;
    tmwe_email_id?: number;
    status: 'migrated' | 'failed' | 'skipped';
    error?: string;
  }>;
  errors: string[];
}

export function TMWEMigrationAdmin() {
  const { userEmail } = useTMWEAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  // Check pending migrations (only for current user)
  const checkPending = async () => {
    if (!userEmail) {
      setPendingCount(0);
      return;
    }
    
    try {
      const { count, error } = await supabase
        .from('email_ai_classifications')
        .select('*', { count: 'exact', head: true })
        .is('tmwe_email_id', null)
        .eq('user_email', userEmail);

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (err) {
      console.error('Error checking pending:', err);
      toast.error('Error al verificar pendientes');
    }
  };

  // Execute migration
  const executeMigration = async (dryRun: boolean) => {
    if (!userEmail) {
      toast.error('No hay usuario autenticado');
      return;
    }
    
    setIsLoading(true);
    setIsDryRun(dryRun);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          handler: 'migrate_email_ids',
          batch_size: 50,
          dry_run: dryRun,
          user_email: userEmail
        }
      });

      if (error) throw error;

      setResult(data as MigrationResult);
      
      if (dryRun) {
        toast.info(`Dry-run completado: ${data.total_to_migrate} registros encontrados`);
      } else {
        toast.success(`Migración completada: ${data.migrated} registros actualizados`);
        checkPending(); // Refresh count
      }
    } catch (err: any) {
      console.error('Migration error:', err);
      toast.error(`Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check pending on mount
  useState(() => {
    checkPending();
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migración TMWE Email IDs
          </CardTitle>
          <CardDescription>
            Poblar el campo tmwe_email_id en registros existentes de email_ai_classifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Registros pendientes de migración</p>
              <p className="text-2xl font-bold">
                {pendingCount !== null ? pendingCount : '...'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={checkPending}>
              Actualizar
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => executeMigration(true)}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && isDryRun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              Dry Run (Test)
            </Button>
            <Button
              onClick={() => executeMigration(false)}
              disabled={isLoading || pendingCount === 0}
              className="flex-1"
            >
              {isLoading && !isDryRun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Ejecutar Migración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.dry_run ? (
                <TestTube className="h-5 w-5 text-blue-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              Resultados {result.dry_run ? '(Dry Run)' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{result.total_to_migrate}</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-xs text-green-600">Migrados</p>
                <p className="text-xl font-bold text-green-600">{result.migrated}</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <p className="text-xs text-red-600">Fallidos</p>
                <p className="text-xl font-bold text-red-600">{result.failed}</p>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-xs text-yellow-600">Omitidos</p>
                <p className="text-xl font-bold text-yellow-600">{result.skipped}</p>
              </div>
            </div>

            {/* Progress */}
            {result.total_to_migrate > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso</span>
                  <span>{Math.round((result.migrated / result.total_to_migrate) * 100)}%</span>
                </div>
                <Progress value={(result.migrated / result.total_to_migrate) * 100} />
              </div>
            )}

            {/* Details */}
            {result.details && result.details.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Detalles ({result.details.length})</p>
                <ScrollArea className="h-64 border rounded-lg">
                  <div className="p-2 space-y-2">
                    {result.details.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{item.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.sender_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.tmwe_email_id && (
                            <Badge variant="outline" className="text-xs">
                              ID: {item.tmwe_email_id}
                            </Badge>
                          )}
                          {item.status === 'migrated' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {item.status === 'failed' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {item.status === 'skipped' && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Errores</p>
                <div className="p-3 bg-red-500/10 rounded-lg text-sm text-red-600">
                  {result.errors.map((err, idx) => (
                    <p key={idx}>{err}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

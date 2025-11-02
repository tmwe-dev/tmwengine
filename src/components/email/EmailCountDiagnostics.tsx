/**
 * Email Count Diagnostics - Dashboard diagnostica unificata
 * Visualizza problemi di sincronizzazione e statistiche aggregate
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Activity, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getUnifiedFolderCounts, getAggregatedStats, type UnifiedFolderCount } from '@/lib/email-count-service';

export function EmailCountDiagnostics() {
  const { data: folders, isLoading, refetch, error } = useQuery<UnifiedFolderCount[]>({
    queryKey: ['email-diagnostics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');
      
      return getUnifiedFolderCounts(profile.tmwe_email);
    },
    enabled: true,
    refetchInterval: false
  });
  
  const stats = folders ? getAggregatedStats(folders) : null;
  const issuesDetected = folders?.filter(f => f.errors.length > 0 || f.syncPercentage < 90) || [];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            🔬 Email Count Diagnostics
          </CardTitle>
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Aggiorna Diagnostica
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analisi in corso...</p>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore Diagnostica</AlertTitle>
            <AlertDescription>
              {(error as Error).message}
            </AlertDescription>
          </Alert>
        )}
        
        {stats && folders && (
          <>
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Total Folders</div>
                <div className="text-2xl font-bold">{stats.totalFolders}</div>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Testable Folders</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.testableFolders}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {'>'}10 emails
                </div>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Synced</div>
                <div className="text-2xl font-bold">
                  {stats.syncedFolders}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  100% sync
                </div>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Missing</div>
                <div className={`text-2xl font-bold ${stats.totalMissing > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {stats.totalMissing}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  emails
                </div>
              </div>
            </div>
            
            {/* Email Totals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Server Emails</div>
                    <div className="text-3xl font-bold">{stats.totalServerEmails.toLocaleString()}</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">DB Local Emails</div>
                    <div className="text-3xl font-bold">{stats.totalDbEmails.toLocaleString()}</div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
            
            {/* Top 5 Folders by Size */}
            <div>
              <h3 className="font-semibold mb-3">📊 Top 5 Folders by Size</h3>
              <div className="space-y-2">
                {stats.topFolders.map((folder, i) => (
                  <div key={folder.folderName} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="text-lg font-bold text-muted-foreground w-6">
                      {i + 1}.
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{folder.folderName}</div>
                      <div className="text-sm text-muted-foreground">
                        {folder.serverCount.toLocaleString()} emails • {folder.syncPercentage}% synced
                      </div>
                    </div>
                    <Badge variant={folder.syncPercentage === 100 ? 'default' : 'secondary'}>
                      {folder.syncPercentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Issues Detected */}
            {issuesDetected.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  ⚠️ Issues Detected ({issuesDetected.length})
                </h3>
                <div className="space-y-2">
                  {issuesDetected.slice(0, 10).map((folder) => (
                    <Alert key={folder.folderName} variant={folder.errors.length > 0 ? 'destructive' : 'default'}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        {folder.folderName}
                        <Badge variant="outline">{folder.syncPercentage}% sync</Badge>
                      </AlertTitle>
                      <AlertDescription className="space-y-1 mt-2">
                        {folder.serverCount >= 0 && (
                          <div className="text-xs">
                            Server: {folder.serverCount} • DB: {folder.dbCount} • Missing: {folder.missing}
                          </div>
                        )}
                        {folder.errors.length > 0 && (
                          <div className="text-xs space-y-1 mt-1">
                            {folder.errors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}
                        {folder.serverCount < 0 && (
                          <div className="text-xs text-muted-foreground">
                            ⚠️ Server count unavailable - DB shows {folder.dbCount} emails
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                  
                  {issuesDetected.length > 10 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      ... e altri {issuesDetected.length - 10} problemi
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {issuesDetected.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">✅ Nessun Problema Rilevato</AlertTitle>
                <AlertDescription>
                  Tutte le cartelle sono sincronizzate correttamente.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * DUAL PHASE DOWNLOADER
 * 
 * FASE 1: Popola email_temp_index con UIDs mancanti (batch 25 per volta)
 * FASE 2: Importa email complete da temp_index (batch configurabili)
 */

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Layers, Database, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { 
  populateTempIndexForFolder, 
  fetchUIDsFromTempIndex, 
  importEmailFromTempIndex,
  getSingleFastFolders 
} from '@/lib/single-fast-core';

interface DualStats {
  phase: 'idle' | 'phase1' | 'phase2' | 'complete' | 'error';
  phase1_total: number;
  phase1_current: number;
  phase2_total: number;
  phase2_current: number;
  errors: number;
}

interface FolderStatus {
  name: string;
  missing: number;
  included: boolean;
  selected: boolean;
}

export function DualPhaseDownloader() {
  const [folders, setFolders] = useState<FolderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState<DualStats>({
    phase: 'idle',
    phase1_total: 0,
    phase1_current: 0,
    phase2_total: 0,
    phase2_current: 0,
    errors: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const shouldStop = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUserEmailAndFolders();
  }, []);

  const loadUserEmailAndFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: '❌ Errore', description: 'Utente non autenticato', variant: 'destructive' });
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) {
        toast({ title: '❌ Errore', description: 'Email TMWE non configurata', variant: 'destructive' });
        return;
      }

      const email = profile.tmwe_email;
      setUserEmail(email);

      // Carica cartelle con conteggio missing
      const folderList = await getSingleFastFolders(email);
      setFolders(folderList.map(f => ({
        name: f.folderName,
        missing: f.missing,
        included: f.included,
        selected: f.included && f.missing > 0
      })));

      addLog(`✅ Cartelle caricate: ${folderList.length} totali, ${folderList.filter(f => f.missing > 0).length} con email mancanti`);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast({ title: '❌ Errore', description: 'Impossibile caricare le cartelle', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('it-IT');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const toggleFolder = (folderName: string) => {
    setFolders(prev => prev.map(f => 
      f.name === folderName ? { ...f, selected: !f.selected } : f
    ));
  };

  const startDualPhase = async () => {
    const selectedFolders = folders.filter(f => f.selected);
    
    if (selectedFolders.length === 0) {
      toast({ title: '⚠️ Attenzione', description: 'Seleziona almeno una cartella' });
      return;
    }

    setIsRunning(true);
    shouldStop.current = false;
    setLogs([]);
    addLog('🚀 Avvio processo DUAL PHASE...');

    try {
      for (const folder of selectedFolders) {
        if (shouldStop.current) {
          addLog('🛑 Processo interrotto dall\'utente');
          break;
        }

        setCurrentFolder(folder.name);
        addLog(`📂 Elaborazione cartella: ${folder.name}`);

        // ========== FASE 1: Popola temp_index ==========
        addLog(`🔍 FASE 1: Caricamento UIDs mancanti (batch da 25)...`);
        setStats(prev => ({ ...prev, phase: 'phase1', phase1_current: 0, phase1_total: 0 }));

        try {
          const result = await populateTempIndexForFolder(
            folder.name,
            userEmail,
            {}, // config (usa defaults)
            (progress) => {
              setStats(prev => ({
                ...prev,
                phase1_current: progress.current,
                phase1_total: progress.total
              }));
            }
          );

          addLog(`✅ FASE 1 completata: ${result.totalMissing} email da importare`);

          // ========== FASE 2: Importa da temp_index ==========
          if (result.totalMissing > 0) {
            addLog(`📥 FASE 2: Download email complete (batch da 20)...`);
            setStats(prev => ({ 
              ...prev, 
              phase: 'phase2', 
              phase2_total: result.totalMissing,
              phase2_current: 0
            }));

            const uids = await fetchUIDsFromTempIndex(folder.name, userEmail);
            const batchSize = 20;

            for (let i = 0; i < uids.length; i += batchSize) {
              if (shouldStop.current) break;

              const batch = uids.slice(i, i + batchSize);
              
              await Promise.allSettled(
                batch.map(async (uid) => {
                  try {
                    await importEmailFromTempIndex(uid, folder.name, userEmail);
                    setStats(prev => ({ ...prev, phase2_current: prev.phase2_current + 1 }));
                  } catch (error) {
                    console.error(`Error importing UID ${uid}:`, error);
                    setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
                  }
                })
              );

              addLog(`📥 Importate ${Math.min(i + batchSize, uids.length)}/${uids.length} email`);
            }

            addLog(`✅ FASE 2 completata: ${uids.length} email importate`);
          }
        } catch (error) {
          console.error(`Error processing folder ${folder.name}:`, error);
          addLog(`❌ Errore cartella ${folder.name}: ${error}`);
          setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        }
      }

      setStats(prev => ({ ...prev, phase: 'complete' }));
      addLog('🎉 Processo DUAL PHASE completato!');
      
      toast({ 
        title: '✅ Download completato', 
        description: `Email scaricate con successo` 
      });

      queryClient.invalidateQueries({ queryKey: ['emails'] });
    } catch (error) {
      console.error('Fatal error:', error);
      setStats(prev => ({ ...prev, phase: 'error' }));
      addLog(`❌ Errore fatale: ${error}`);
      toast({ title: '❌ Errore', description: 'Processo interrotto', variant: 'destructive' });
    } finally {
      setIsRunning(false);
      setCurrentFolder('');
    }
  };

  const stopProcess = () => {
    shouldStop.current = true;
    addLog('🛑 Interruzione richiesta...');
  };

  const getPhaseLabel = () => {
    switch (stats.phase) {
      case 'phase1': return 'FASE 1: Caricamento UIDs';
      case 'phase2': return 'FASE 2: Download email';
      case 'complete': return 'Completato';
      case 'error': return 'Errore';
      default: return 'Pronto';
    }
  };

  const getProgressPercentage = () => {
    if (stats.phase === 'phase1' && stats.phase1_total > 0) {
      return Math.round((stats.phase1_current / stats.phase1_total) * 100);
    }
    if (stats.phase === 'phase2' && stats.phase2_total > 0) {
      return Math.round((stats.phase2_current / stats.phase2_total) * 100);
    }
    if (stats.phase === 'complete') return 100;
    return 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Dual Phase Downloader
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sistema progressivo a due fasi: prima carica gli UIDs (batch da 25), poi scarica le email complete (batch da 20)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Bar */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={stats.phase === 'error' ? 'destructive' : 'default'}>
                    {getPhaseLabel()}
                  </Badge>
                  {currentFolder && (
                    <span className="text-sm text-muted-foreground">
                      📂 {currentFolder}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} />
              
              {stats.phase === 'phase1' && (
                <p className="text-xs text-muted-foreground">
                  🔍 UIDs: {stats.phase1_current}/{stats.phase1_total}
                </p>
              )}
              {stats.phase === 'phase2' && (
                <p className="text-xs text-muted-foreground">
                  📥 Email: {stats.phase2_current}/{stats.phase2_total}
                </p>
              )}
              {stats.errors > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{stats.errors} errori</span>
                </div>
              )}
            </div>
          )}

          {/* Folder Selection */}
          {!isRunning && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Cartelle da sincronizzare:</h3>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Caricamento cartelle...</p>
                ) : folders.filter(f => f.included).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessuna cartella configurata per la sincronizzazione</p>
                ) : (
                  folders
                    .filter(f => f.included)
                    .map(folder => (
                      <div key={folder.name} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={folder.selected}
                            onChange={() => toggleFolder(folder.name)}
                            className="rounded"
                          />
                          <span className="text-sm">{folder.name}</span>
                        </div>
                        <Badge variant={folder.missing > 0 ? 'default' : 'secondary'}>
                          {folder.missing} mancanti
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isRunning ? (
              <>
                <Button 
                  onClick={startDualPhase} 
                  disabled={isLoading || folders.filter(f => f.selected).length === 0}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Avvia Download Dual Phase
                </Button>
                <Button 
                  variant="outline" 
                  onClick={loadUserEmailAndFolders}
                  disabled={isLoading}
                >
                  Ricarica
                </Button>
              </>
            ) : (
              <Button 
                onClick={stopProcess} 
                variant="destructive"
                className="flex-1"
              >
                🛑 Interrompi
              </Button>
            )}
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Log attività:</h3>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-muted/30 font-mono text-xs space-y-1">
                {logs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

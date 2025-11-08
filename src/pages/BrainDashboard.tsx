import React, { useState } from 'react';
import { Brain, Play, Clock, FileCode, Copy, Share2, AlertCircle } from 'lucide-react';
import { PageLayout } from '@/components/design-system/layouts/PageLayout';
import { StatsGrid } from '@/components/design-system/data-display/StatsGrid';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { Button } from '@/components/ui/button';
import { useBrainScans } from '@/hooks/useBrainScans';
import { FileSelectorDialog } from '@/components/brain/FileSelectorDialog';
import { ScanHistoryTable } from '@/components/brain/ScanHistoryTable';

export default function BrainDashboard() {
  const { data: scans, isLoading, refetch } = useBrainScans();
  const [showFileSelector, setShowFileSelector] = useState(false);

  // Calcola statistiche aggregate
  const stats = React.useMemo(() => {
    if (!scans?.length) {
      return {
        totalScans: 0,
        totalFunctions: 0,
        totalDuplicates: 0,
        totalShared: 0,
      };
    }

    return scans.reduce(
      (acc, scan) => ({
        totalScans: acc.totalScans + 1,
        totalFunctions: acc.totalFunctions + scan.functions_found,
        totalDuplicates: acc.totalDuplicates + scan.duplicates_detected,
        totalShared: acc.totalShared + scan.shared_functions,
      }),
      { totalScans: 0, totalFunctions: 0, totalDuplicates: 0, totalShared: 0 }
    );
  }, [scans]);

  const statsItems = [
    {
      icon: Brain,
      label: 'Scan Totali',
      value: stats.totalScans.toString(),
      variant: 'default' as const,
    },
    {
      icon: FileCode,
      label: 'Funzioni Analizzate',
      value: stats.totalFunctions.toString(),
      variant: 'default' as const,
    },
    {
      icon: Copy,
      label: 'Duplicati Rilevati',
      value: stats.totalDuplicates.toString(),
      variant: 'warning' as const,
      description: 'Funzioni duplicate trovate',
    },
    {
      icon: Share2,
      label: 'Funzioni Condivise',
      value: stats.totalShared.toString(),
      variant: 'success' as const,
      description: 'Funzioni riutilizzate',
    },
  ];

  if (isLoading) {
    return (
      <PageLayout
        title="Brain Code Scanner"
        description="Analizza il codice per trovare duplicati e ottimizzare la struttura"
      >
        <LoadingState message="Caricamento scan..." />
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="Brain Code Scanner"
        description="Analizza il codice per trovare duplicati, funzioni condivise e complessità"
        actions={
          <Button onClick={() => setShowFileSelector(true)} size="lg">
            <Play className="h-4 w-4 mr-2" />
            Nuovo Scan
          </Button>
        }
      >
        <div className="space-y-8">
          {/* Statistiche */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Panoramica</h2>
            <StatsGrid stats={statsItems} columns={4} animate />
          </section>

          {/* Storico Scan */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Storico Scan</h2>
              </div>
            </div>

            {scans && scans.length > 0 ? (
              <ScanHistoryTable scans={scans} onRefresh={refetch} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 border border-border rounded-lg bg-muted/20">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nessuno scan disponibile</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Avvia il primo scan per analizzare il codice e trovare duplicati
                </p>
                <Button onClick={() => setShowFileSelector(true)} variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Avvia Primo Scan
                </Button>
              </div>
            )}
          </section>
        </div>
      </PageLayout>

      <FileSelectorDialog
        open={showFileSelector}
        onOpenChange={setShowFileSelector}
        onScanComplete={refetch}
      />
    </>
  );
}

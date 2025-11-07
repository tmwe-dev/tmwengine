/**
 * DUAL DOWNLOAD PAGE
 * Pagina wrapper per DualPhaseDownloader
 */

import { PageLayout } from '@/components/design-system/layouts/PageLayout';
import { DualPhaseDownloader } from '@/components/email/DualPhaseDownloader';
import { Layers } from 'lucide-react';

export default function DualDownload() {
  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <Layers className="h-8 w-8 text-primary" />
          <span>Dual Phase Download</span>
        </div>
      }
      description="Sistema progressivo a due fasi: prima carica UIDs (batch 25), poi scarica email complete (batch 20)"
      className="bg-gradient-to-b from-background to-background/50"
    >
      <DualPhaseDownloader />
    </PageLayout>
  );
}

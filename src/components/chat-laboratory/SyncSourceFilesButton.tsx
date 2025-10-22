import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileData {
  file_path: string;
  file_type: string;
  content: string;
  file_size: number;
  line_count: number;
  imports: string[];
  exports: string[];
}

// ============ PROJECT FILES SNAPSHOT ============
// Questo snapshot viene generato da Lovable AI durante l'implementazione.
// Per aggiornarlo, chiedi: "Rigenera snapshot files per Albert"
const PROJECT_FILES_SNAPSHOT: FileData[] = [
  // 🔄 SNAPSHOT DA POPOLARE 
  // Lovable AI può leggere i file del progetto e generare questo array.
  // Esempio entry:
  // {
  //   file_path: 'src/components/chat-laboratory/AlbertModeSelector.tsx',
  //   file_type: 'tsx',
  //   content: '...contenuto completo...',
  //   file_size: 5432,
  //   line_count: 150,
  //   imports: ['react', '@/components/ui/select'],
  //   exports: ['AlbertModeSelector']
  // }
];

export const SyncSourceFilesButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (PROJECT_FILES_SNAPSHOT.length === 0) {
      toast({
        title: "⚠️ Snapshot vuoto",
        description: "Chiedi a Lovable AI: 'Rigenera snapshot files per Albert'",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);

    try {
      toast({
        title: "🔄 Sincronizzazione in corso...",
        description: `Invio ${PROJECT_FILES_SNAPSHOT.length} file al database`,
      });

      const { data, error } = await supabase.functions.invoke('sync-project-files', {
        body: { files: PROJECT_FILES_SNAPSHOT }
      });

      if (error) throw error;

      toast({
        title: "✅ Sincronizzazione completata",
        description: `${data.filesProcessed} file caricati nel database per Albert`,
      });

    } catch (error: any) {
      console.error('Errore sincronizzazione:', error);

      toast({
        title: "❌ Errore Sincronizzazione",
        description: error.message || "Impossibile sincronizzare i file",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span className="hidden md:inline">
              {isSyncing ? 'Sincronizzando...' : 'Sync Files'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Carica snapshot files del progetto per Albert</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

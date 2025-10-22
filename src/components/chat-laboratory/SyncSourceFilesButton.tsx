import { Button } from '@/components/ui/button';
import { Upload, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
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

export const SyncSourceFilesButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const extractMetadata = (content: string, filePath: string) => {
    const imports: string[] = [];
    const exports: string[] = [];

    // Estrai imports
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Estrai exports
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return { imports, exports };
  };

  const handleSync = async () => {
    // Crea input file nascosto
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsSyncing(true);

      try {
        toast({
          title: "📂 Lettura ZIP...",
          description: "Estrazione file in corso",
        });

        // Leggi ZIP con JSZip
        const zip = await JSZip.loadAsync(file);

        // Filtra solo src/, supabase/functions/, docs/
        const targetPaths = ['src/', 'supabase/functions/', 'docs/'];
        const allFiles: FileData[] = [];

        for (const [path, zipEntry] of Object.entries(zip.files)) {
          // Salta directory
          if (zipEntry.dir) continue;

          // Filtra solo path target
          const isTarget = targetPaths.some(prefix => path.startsWith(prefix));
          if (!isTarget) continue;

          try {
            // Leggi contenuto come testo
            const content = await zipEntry.async('text');

            // Estrai metadata
            const { imports, exports } = extractMetadata(content, path);

            // Determina tipo file
            const ext = path.split('.').pop()?.toLowerCase() || '';
            const fileType = ['ts', 'tsx', 'js', 'jsx'].includes(ext) ? ext : 'other';

            allFiles.push({
              file_path: path,
              file_type: fileType,
              content,
              file_size: content.length,
              line_count: content.split('\n').length,
              imports,
              exports
            });
          } catch (err) {
            console.warn(`Impossibile leggere ${path}:`, err);
          }
        }

        if (allFiles.length === 0) {
          toast({
            title: "⚠️ Nessun file trovato",
            description: "Lo ZIP non contiene cartelle src/, supabase/functions/ o docs/",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "💾 Salvataggio nel database...",
          description: `${allFiles.length} file trovati`,
        });

        // Pulisci tabella esistente
        await supabase.from('project_source_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Inserisci batch (max 100 alla volta)
        const batchSize = 100;
        for (let i = 0; i < allFiles.length; i += batchSize) {
          const batch = allFiles.slice(i, i + batchSize);
          const { error } = await supabase.from('project_source_files').insert(batch);

          if (error) throw error;
        }

        toast({
          title: "✅ Sincronizzazione completata",
          description: `${allFiles.length} file caricati da ZIP nel database`,
        });

      } catch (error: any) {
        console.error('Errore sincronizzazione ZIP:', error);

        toast({
          title: "❌ Errore Sincronizzazione",
          description: error.message || "Impossibile processare il file ZIP",
          variant: "destructive"
        });
      } finally {
        setIsSyncing(false);
      }
    };

    // Trigger click
    input.click();
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
              <Upload className="h-4 w-4" />
            )}
            <span className="hidden md:inline">
              {isSyncing ? 'Sincronizzando...' : 'Upload ZIP'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Carica file sorgenti da ZIP esportato da Lovable</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

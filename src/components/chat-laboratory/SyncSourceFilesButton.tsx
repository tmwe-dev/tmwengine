import { Button } from '@/components/ui/button';
import { RefreshCw, FolderOpen } from 'lucide-react';
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

  const readFilesRecursively = async (dirHandle: FileSystemDirectoryHandle, basePath = ''): Promise<FileData[]> => {
    const files: FileData[] = [];

    for await (const entry of (dirHandle as any).values()) {
      const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        // Ricorsione nelle sottocartelle
        const subFiles = await readFilesRecursively(entry as FileSystemDirectoryHandle, fullPath);
        files.push(...subFiles);
      } else if (entry.kind === 'file') {
        const file = await (entry as FileSystemFileHandle).getFile();
        const content = await file.text();
        
        // Determina tipo file
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        const fileType = ['ts', 'tsx', 'js', 'jsx'].includes(ext) ? ext : 'other';

        const { imports, exports } = extractMetadata(content, fullPath);

        files.push({
          file_path: fullPath,
          file_type: fileType,
          content,
          file_size: file.size,
          line_count: content.split('\n').length,
          imports,
          exports
        });
      }
    }

    return files;
  };

  const handleSync = async () => {
    if (!('showDirectoryPicker' in window)) {
      toast({
        title: "❌ Browser non supportato",
        description: "Il tuo browser non supporta File System Access API. Usa Chrome/Edge/Opera.",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      // Apri selettore cartella
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
        startIn: 'documents'
      });

      toast({
        title: "📂 Lettura file...",
        description: "Scansione cartelle in corso",
      });

      const allFiles: FileData[] = [];

      // Leggi src/
      try {
        const srcHandle = await dirHandle.getDirectoryHandle('src');
        const srcFiles = await readFilesRecursively(srcHandle, 'src');
        allFiles.push(...srcFiles);
      } catch (e) {
        console.warn('Cartella src/ non trovata');
      }

      // Leggi supabase/functions/
      try {
        const supabaseHandle = await dirHandle.getDirectoryHandle('supabase');
        const functionsHandle = await supabaseHandle.getDirectoryHandle('functions');
        const functionFiles = await readFilesRecursively(functionsHandle, 'supabase/functions');
        allFiles.push(...functionFiles);
      } catch (e) {
        console.warn('Cartella supabase/functions/ non trovata');
      }

      // Leggi docs/
      try {
        const docsHandle = await dirHandle.getDirectoryHandle('docs');
        const docFiles = await readFilesRecursively(docsHandle, 'docs');
        allFiles.push(...docFiles);
      } catch (e) {
        console.warn('Cartella docs/ non trovata');
      }

      toast({
        title: "💾 Salvataggio nel database...",
        description: `${allFiles.length} file trovati`,
      });

      // Pulisci tabella esistente
      await supabase.from('project_source_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Inserisci batch (max 100 alla volta per evitare timeout)
      const batchSize = 100;
      for (let i = 0; i < allFiles.length; i += batchSize) {
        const batch = allFiles.slice(i, i + batchSize);
        const { error } = await supabase.from('project_source_files').insert(batch);
        
        if (error) throw error;
      }

      toast({
        title: "✅ Sincronizzazione completata",
        description: `${allFiles.length} file caricati nel database`,
      });
      
    } catch (error: any) {
      console.error('Errore sincronizzazione file:', error);
      
      if (error.name === 'AbortError') {
        toast({
          title: "❌ Operazione annullata",
          description: "Selezione cartella annullata dall'utente",
          variant: "destructive"
        });
      } else {
        toast({
          title: "❌ Errore Sincronizzazione",
          description: error.message || "Impossibile sincronizzare i file",
          variant: "destructive"
        });
      }
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
              <FolderOpen className="h-4 w-4" />
            )}
            <span className="hidden md:inline">
              {isSyncing ? 'Sincronizzando...' : 'Sync Files'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sincronizza file sorgenti nel database per Albert</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

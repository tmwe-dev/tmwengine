import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IndexStats {
  indexed: number;
  updated: number;
  errors: number;
  files: string[];
  errorDetails?: string[];
  duration_ms: number;
}

export const useCodeIndexer = () => {
  const queryClient = useQueryClient();
  const [isIndexing, setIsIndexing] = useState(false);

  // Query per contare i file in code_index
  const { data: indexStatus, isLoading: isCheckingIndex, refetch: refetchStatus } = useQuery({
    queryKey: ['code-index-status'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('code_index')
        .select('*', { count: 'exact', head: true })
        .like('file_path', 'src/%');

      if (error) throw error;

      // Get last update time
      const { data: lastFile } = await supabase
        .from('code_index')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        fileCount: count || 0,
        lastIndexed: lastFile?.last_updated,
      };
    },
  });

  // Mutation per avviare l'indicizzazione
  const indexMutation = useMutation({
    mutationFn: async (forceReindex: boolean = false) => {
      setIsIndexing(true);
      console.log('🔍 [INDEXER] Step 1: Inizializzazione import.meta.glob');
      
      // Step 1: Read all files from project using Vite's import.meta.glob
      const modules = import.meta.glob('/src/**/*.{ts,tsx,js,jsx}', { 
        eager: false,
        query: '?raw',
        import: 'default'
      });

      console.log('✅ [INDEXER] Modules trovati:', Object.keys(modules).length, 'file patterns');
      console.log('🔍 [INDEXER] Step 2: Inizio caricamento contenuti...');

      // Step 2: Load all file contents
      const files = await Promise.all(
        Object.entries(modules).map(async ([path, loader]) => {
          try {
            const content = await loader() as string;
            console.log('✅ [INDEXER] File caricato:', path, '- Size:', content?.length || 0, 'bytes');
            return {
              file_path: path.replace(/^\//, ''), // Remove leading slash: /src/App.tsx -> src/App.tsx
              content
            };
          } catch (err) {
            console.error(`❌ [INDEXER] Error loading file ${path}:`, err);
            return null;
          }
        })
      );

      const validFiles = files.filter((f): f is { file_path: string; content: string } => f !== null);
      
      console.log('✅ [INDEXER] File validi pronti:', validFiles.length);
      console.log('📋 [INDEXER] Lista file:', validFiles.map(f => f.file_path));
      console.log('🚀 [INDEXER] Step 3: Invio a Edge Function con', validFiles.length, 'file');
      console.log('📦 [INDEXER] Body size:', JSON.stringify({ files: validFiles, forceReindex }).length, 'bytes');

      // Step 3: Send files to Edge Function for processing
      const { data, error } = await supabase.functions.invoke('index-codebase', {
        body: {
          files: validFiles,
          forceReindex,
        },
      });

      if (error) {
        console.error('❌ [INDEXER] Edge Function error:', error);
        throw error;
      }
      
      console.log('✅ [INDEXER] Edge Function response:', data);
      return data as { success: boolean; stats: IndexStats; duration: number };
    },
    onSuccess: (data) => {
      setIsIndexing(false);
      toast({
        title: '✅ Indicizzazione completata',
        description: `${data.stats.indexed} file indicizzati con successo in ${(data.duration / 1000).toFixed(1)}s`,
      });
      queryClient.invalidateQueries({ queryKey: ['code-index-status'] });
      refetchStatus();
    },
    onError: (error: Error) => {
      setIsIndexing(false);
      toast({
        title: '❌ Errore indicizzazione',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const runIndexing = async (forceReindex: boolean = false) => {
    toast({
      title: '🔄 Indicizzazione avviata',
      description: 'Caricamento e analisi file in corso...',
    });
    await indexMutation.mutateAsync(forceReindex);
  };

  return {
    indexStatus,
    isCheckingIndex,
    isIndexing: isIndexing || indexMutation.isPending,
    runIndexing,
    refetchStatus,
  };
};

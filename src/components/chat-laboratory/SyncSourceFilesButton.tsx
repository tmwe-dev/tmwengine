import { Button } from '@/components/ui/button';
import { RefreshCw, FolderSync } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const SyncSourceFilesButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-project-files');
      
      if (error) throw error;
      
      toast({
        title: "✅ File Sincronizzati",
        description: `${data.filesProcessed} file elaborati con successo`,
      });
      
    } catch (error: any) {
      console.error('Errore sincronizzazione file:', error);
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
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <FolderSync className="h-4 w-4" />
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

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ReIndexButton() {
  const [isIndexing, setIsIndexing] = useState(false);

  const handleReIndex = async () => {
    setIsIndexing(true);
    try {
      const { data, error } = await supabase.functions.invoke('index-codebase', {
        body: { 
          forceReindex: true,
          directories: [
            'src/components',
            'src/pages', 
            'src/hooks',
            'src/lib',
            'src/integrations',
            'supabase/functions',
            'docs'
          ]
        }
      });

      if (error) throw error;

      toast.success('Re-indexing completato', {
        description: `${data?.stats?.indexed || 0} file indicizzati, ${data?.stats?.updated || 0} aggiornati`
      });
    } catch (error) {
      console.error('Re-index error:', error);
      toast.error('Errore durante re-indexing', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <Button
      onClick={handleReIndex}
      disabled={isIndexing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isIndexing ? 'animate-spin' : ''}`} />
      {isIndexing ? 'Indicizzazione...' : 'Re-Index Codebase'}
    </Button>
  );
}

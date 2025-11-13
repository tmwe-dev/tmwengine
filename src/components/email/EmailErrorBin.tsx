import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useErrorRetry, ErrorEntry } from '@/hooks/useErrorRetry';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  userEmail: string;
  compact?: boolean;
}

export const EmailErrorBin = ({ userEmail, compact = false }: Props) => {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { isRetrying, progress, logs, retryFailedEmails } = useErrorRetry();

  // Carica conteggio errori
  useEffect(() => {
    if (!userEmail) return;
    
    const loadCount = async () => {
      const { count } = await supabase
        .from('email_import_errors')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail)
        .eq('status', 'pending');
      
      setErrorCount(count || 0);
    };

    loadCount();
    const interval = setInterval(loadCount, 10000); // Aggiorna ogni 10s
    return () => clearInterval(interval);
  }, [userEmail]);

  // Carica dettagli quando apriamo dialog
  const loadErrors = async () => {
    const { data } = await supabase
      .from('email_import_errors')
      .select('*')
      .eq('user_email', userEmail)
      .order('first_error_at', { ascending: false })
      .limit(100);
    
    setErrors(data || []);
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) loadErrors();
  };

  const handleRetry = () => {
    retryFailedEmails(userEmail);
  };

  const handleClearResolved = async () => {
    await supabase
      .from('email_import_errors')
      .delete()
      .eq('user_email', userEmail)
      .eq('status', 'imported');
    
    loadErrors();
  };

  if (errorCount === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size={compact ? "sm" : "default"}
          className={compact ? "w-full justify-start h-7 text-xs" : "relative"}
        >
          <AlertCircle className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${compact ? 'mr-2' : 'mr-2'} text-red-500`} />
          {compact ? 'Errori' : 'Errori Import'}
          <Badge variant="destructive" className={compact ? "ml-auto text-[10px] px-1 py-0" : "ml-2"}>
            {errorCount}
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Cestino Errori Import ({errorCount} pending)
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button 
            onClick={handleRetry} 
            disabled={isRetrying || errorCount === 0}
            className="flex-1"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            Riprova Tutti ({errorCount})
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearResolved}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Pulisci Risolti
          </Button>
        </div>

        {isRetrying && (
          <Card className="mb-4 bg-blue-500/10">
            <CardContent className="py-4">
              <div className="text-sm font-medium mb-2">
                Riprovando {progress.current} / {progress.total}
              </div>
              <ScrollArea className="h-32 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="py-1">{log}</div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {errors.map(error => (
              <Card key={error.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          error.status === 'pending' ? 'default' :
                          error.status === 'imported' ? 'outline' :
                          'destructive'
                        }>
                          {error.status}
                        </Badge>
                        <Badge variant="outline">{error.error_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Retry: {error.retry_count}
                        </span>
                      </div>
                      
                      <div className="font-mono text-sm truncate">
                        📁 {error.folder_name} / UID {error.uid}
                      </div>
                      
                      <div className="text-xs text-red-500 mt-1 truncate">
                        {error.error_message}
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(error.first_error_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

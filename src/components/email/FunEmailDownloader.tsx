import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

interface FunEmailDownloaderProps {
  onDownloadComplete?: (stats: {
    totalDownloaded: number;
    folders: string[];
    dateRange: { from: Date; to: Date };
  }) => void;
}

export const FunEmailDownloader = ({ onDownloadComplete }: FunEmailDownloaderProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFolder, setCurrentFolder] = useState('');
  const { toast } = useToast();

  const startDownload = async () => {
    setIsDownloading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Get user's TMWE email
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) {
        throw new Error('Email TMWE non configurato nel profilo');
      }

      // Call the sync master edge function
      // The edge function will use OAuth token from email_provider_credenziali
      setCurrentFolder('Inizializzazione...');
      setProgress(10);

      const { data, error } = await supabase.functions.invoke('tmwe-email-sync-master', {
        body: {
          mode: 'incremental',
          folder_name: 'INBOX',
          max_emails: 2000,
        },
      });

      if (error) throw error;

      setProgress(100);
      setCurrentFolder('Completato!');

      const stats = {
        totalDownloaded: data?.emails_downloaded || 0,
        folders: ['INBOX'],
        dateRange: {
          from: new Date(),
          to: new Date(),
        },
      };

      // Mark downloaded emails as fun_email_backup
      await supabase
        .from('email_messages')
        .update({ sync_status: 'fun_email_backup' })
        .eq('user_email', profile.tmwe_email)
        .is('sync_status', null);

      toast({
        title: '✅ Download completato',
        description: `${stats.totalDownloaded} email scaricate e pronte per l'analisi AI`,
      });

      onDownloadComplete?.(stats);

    } catch (error: any) {
      console.error('[FunEmailDownloader] Error:', error);
      toast({
        title: '❌ Errore durante il download',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setProgress(0);
      setCurrentFolder('');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col gap-2">
          <Button
            onClick={startDownload}
            disabled={isDownloading}
            className="w-full"
            size="lg"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scaricamento in corso...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Prepara Email per AI
              </>
            )}
          </Button>

          {isDownloading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {currentFolder}
              </p>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>📥 Scarica email da TMWE server</p>
          <p>💾 Salva come backup locale</p>
          <p>🤖 Prepara per analisi AI</p>
        </div>
      </CardContent>
    </Card>
  );
};

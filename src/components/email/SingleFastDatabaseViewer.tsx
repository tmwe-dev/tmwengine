/**
 * SINGLE FAST DATABASE VIEWER
 * Visualizzazione real-time delle righe caricate in email_temp_index
 * Con auto-scroll verso l'alto e contatori progressivi
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Database, Mail } from 'lucide-react';

interface TempIndexRow {
  uid: string;
  folder: string;
  subject: string | null;
  from_email: string;
  from_name: string | null;
  date: string;
  status: string;
  created_at: string;
}

interface SingleFastDatabaseViewerProps {
  userEmail: string;
  isRunning: boolean;
}

export function SingleFastDatabaseViewer({ userEmail, isRunning }: SingleFastDatabaseViewerProps) {
  const [rows, setRows] = useState<TempIndexRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(0);

  // Polling database ogni 2 secondi quando il processo è attivo
  useEffect(() => {
    if (!userEmail) return;

    const fetchRows = async () => {
      try {
        // Query per ottenere le righe ordinate per created_at DESC (più recenti in alto)
        const { data, error, count } = await supabase
          .from('email_temp_index')
          .select('uid, folder, subject, from_email, from_name, date, status, created_at', { count: 'exact' })
          .eq('user_email', userEmail)
          .order('created_at', { ascending: false })
          .limit(100); // Limita a ultime 100 per performance

        if (error) throw error;

        if (data) {
          setRows(data);
          setTotalCount(count || 0);
          
          // Auto-scroll solo se ci sono nuove righe
          if (count && count > previousCountRef.current) {
            previousCountRef.current = count;
            // Scroll to top per mostrare le nuove righe
            if (scrollRef.current) {
              scrollRef.current.scrollTop = 0;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching temp index rows:', err);
      }
    };

    // Carica subito all'avvio
    fetchRows();

    // Polling attivo solo quando il processo è in esecuzione
    let interval: NodeJS.Timeout | undefined;
    if (isRunning) {
      interval = setInterval(fetchRows, 2000); // Ogni 2 secondi
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userEmail, isRunning]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="bg-card/80 backdrop-blur border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <span>📊 Email caricate in database</span>
          </div>
          <div className="flex items-center gap-2 text-lg font-mono bg-primary/10 px-4 py-2 rounded-lg">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">{totalCount}</span>
            <span className="text-muted-foreground">totali</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]" ref={scrollRef}>
          <div className="space-y-2">
            {rows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna email nella tabella temporanea</p>
                <p className="text-sm mt-2">Avvia il processo per iniziare</p>
              </div>
            ) : (
              rows.map((row, index) => (
                <div
                  key={`${row.uid}-${row.created_at}`}
                  className="p-4 rounded-lg bg-accent/20 border border-border/50 hover:bg-accent/30 transition-all animate-in fade-in slide-in-from-top-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {row.folder}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          UID: {row.uid}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <p className="font-semibold text-sm truncate">
                          {row.from_name || row.from_email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.from_email}
                        </p>
                      </div>
                      
                      <p className="text-sm text-foreground/90 truncate mb-2">
                        {row.subject || '(Nessun oggetto)'}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>📅 {formatDate(row.date)}</span>
                        <span className="text-primary">✓ {row.status}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(row.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

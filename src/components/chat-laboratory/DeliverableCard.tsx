import { FileText, Download, Table, FileCode, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Deliverable {
  id: string;
  type: 'report' | 'canvas' | 'table' | 'diagram';
  format: 'md' | 'csv' | 'mermaid' | 'excalidraw';
  storage_path: string;
  file_size_bytes: number;
  metadata: {
    title?: string;
    generated_at?: string;
  };
  generation_status: string;
}

interface DeliverableCardProps {
  messageId: string;
}

export const DeliverableCard = ({ messageId }: DeliverableCardProps) => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliverables();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`deliverables-${messageId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_laboratory_deliverables',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          loadDeliverables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const loadDeliverables = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_deliverables')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliverables(data as Deliverable[] || []);
    } catch (error) {
      console.error('Error loading deliverables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (deliverable: Deliverable) => {
    try {
      const { data, error } = await supabase.storage
        .from('chat-deliverables')
        .createSignedUrl(deliverable.storage_path, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
        toast.success(`Download avviato: ${deliverable.metadata.title || 'file'}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Errore nel download del file');
    }
  };

  const getIcon = (type: string, format: string) => {
    if (format === 'csv') return <FileSpreadsheet className="h-5 w-5" />;
    if (format === 'mermaid') return <FileCode className="h-5 w-5" />;
    if (type === 'table') return <Table className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'report': 'Report',
      'canvas': 'Canvas',
      'table': 'Tabella',
      'diagram': 'Diagramma'
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading || deliverables.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      {deliverables.map((deliverable) => (
        <Card key={deliverable.id} className="p-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                {getIcon(deliverable.type, deliverable.format)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {deliverable.metadata.title || 'Untitled'}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {getTypeLabel(deliverable.type)}
                  </Badge>
                  <Badge variant="outline" className="text-xs uppercase">
                    {deliverable.format}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(deliverable.file_size_bytes)}
                  {deliverable.generation_status === 'completed' && ' • Pronto per il download'}
                  {deliverable.generation_status === 'pending' && ' • Generazione in corso...'}
                </p>
              </div>
            </div>
            
            {deliverable.generation_status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownload(deliverable)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Scarica
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

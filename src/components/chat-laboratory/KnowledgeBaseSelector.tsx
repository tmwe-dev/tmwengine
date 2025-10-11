import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
}

interface KnowledgeBaseSelectorProps {
  conversationId: string | null;
  onKBChange: (kbId: string | null) => void;
}

export const KnowledgeBaseSelector = ({ conversationId, onKBChange }: KnowledgeBaseSelectorProps) => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [activeKB, setActiveKB] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadKnowledgeBases();
    if (conversationId) {
      loadActiveKB();
    } else {
      // Carica da localStorage
      const pending = localStorage.getItem('bar-mode-kb-pending');
      if (pending) {
        const saved = JSON.parse(pending);
        setActiveKB(saved);
        onKBChange(saved);
      }
    }
  }, [conversationId]);

  const loadKnowledgeBases = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select(`
          id,
          name,
          description,
          documents:knowledge_base_documents(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const kbs = (data || []).map(kb => ({
        id: kb.id,
        name: kb.name,
        description: kb.description,
        document_count: kb.documents?.[0]?.count || 0
      }));

      setKnowledgeBases(kbs);
    } catch (error) {
      console.error('Errore caricamento Knowledge Bases:', error);
    }
  };

  const loadActiveKB = async () => {
    try {
      const { data } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('active_kb_id')
        .eq('conversation_id', conversationId)
        .single();

      if (data?.active_kb_id) {
        setActiveKB(data.active_kb_id);
        onKBChange(data.active_kb_id);
      }
    } catch (error) {
      console.error('Errore caricamento KB attiva:', error);
    }
  };

  const selectKB = async (kbId: string | null) => {
    setActiveKB(kbId);
    onKBChange(kbId);
    setOpen(false);

    if (conversationId) {
      // Salva nel database
      try {
        await supabase
          .from('chat_laboratory_bar_mode')
          .update({ active_kb_id: kbId })
          .eq('conversation_id', conversationId);

        toast({
          title: kbId ? "Knowledge Base Attivata" : "Knowledge Base Disattivata",
          description: kbId 
            ? "Le risposte includeranno informazioni dalla KB"
            : "Modalità conversazione standard",
        });
      } catch (error) {
        console.error('Errore salvataggio KB:', error);
      }
    } else {
      // Salva in localStorage
      localStorage.setItem('bar-mode-kb-pending', JSON.stringify(kbId));
    }
  };

  const activeKBName = knowledgeBases.find(kb => kb.id === activeKB)?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          {activeKBName ? (
            <>
              KB: <span className="font-semibold">{activeKBName}</span>
            </>
          ) : (
            'Seleziona KB'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium mb-1">Knowledge Base</h4>
            <p className="text-xs text-muted-foreground">
              Seleziona una Knowledge Base per arricchire le risposte con informazioni contestuali
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant={activeKB === null ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => selectKB(null)}
            >
              {activeKB === null && <Check className="h-4 w-4" />}
              <span>Nessuna KB (Standard)</span>
            </Button>

            {knowledgeBases.map((kb) => (
              <Button
                key={kb.id}
                variant={activeKB === kb.id ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => selectKB(kb.id)}
              >
                {activeKB === kb.id && <Check className="h-4 w-4" />}
                <div className="flex-1 text-left">
                  <div className="font-medium">{kb.name}</div>
                  {kb.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {kb.description}
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {kb.document_count} doc
                </Badge>
              </Button>
            ))}
          </div>

          {knowledgeBases.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nessuna Knowledge Base disponibile
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

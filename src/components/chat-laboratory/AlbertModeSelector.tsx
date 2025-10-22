import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Brain, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AlbertModeSelectorProps {
  currentConversationId: string | null;
  currentMode: 'bar_chat' | 'albert_advisor';
  onModeChange: (mode: 'bar_chat' | 'albert_advisor') => Promise<void>;
}

export const AlbertModeSelector = ({
  currentConversationId,
  currentMode,
  onModeChange
}: AlbertModeSelectorProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const { toast } = useToast();

  const { data: albertPrompt, isLoading } = useQuery({
    queryKey: ['albert-prompt-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_laboratory_albert_prompts')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: currentMode === 'albert_advisor'
  });

  const handleModeChange = async (newMode: 'bar_chat' | 'albert_advisor') => {
    if (!currentConversationId) {
      toast({
        title: "Errore",
        description: "Seleziona prima una conversazione",
        variant: "destructive"
      });
      return;
    }

    setIsChanging(true);
    try {
      await onModeChange(newMode);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentMode}
        onValueChange={handleModeChange}
        disabled={!currentConversationId || isChanging}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {currentMode === 'bar_chat' ? (
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Bar Chat
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Albert Advisor
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bar_chat">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <div>
                <div className="font-medium">💬 Bar Chat</div>
                <div className="text-xs text-muted-foreground">
                  Conversazione multi-agente libera
                </div>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="albert_advisor">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <div>
                <div className="font-medium">🧠 Albert Advisor</div>
                <div className="text-xs text-muted-foreground">
                  Consulenza tecnica con tools
                </div>
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {currentMode === 'albert_advisor' && (
        <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              title="Vedi istruzioni Albert"
              disabled={isLoading}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                Istruzioni Albert: {albertPrompt?.name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] w-full rounded border p-6">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
                {albertPrompt?.system_prompt}
              </pre>
            </ScrollArea>
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p><strong>Descrizione:</strong> {albertPrompt?.description}</p>
              <p className="mt-2"><strong>Tools disponibili:</strong></p>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>read_lovable_docs(docType)</li>
                <li>propose_lovable_task(title, file, problem, priority)</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
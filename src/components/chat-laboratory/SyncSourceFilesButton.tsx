import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
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

// ============ PROJECT FILES SNAPSHOT ============
// 📸 Snapshot generato: include file core essenziali per Albert
// Per aggiornare, chiedi: "Rigenera snapshot files per Albert"
const PROJECT_FILES_SNAPSHOT: FileData[] = [
  {
    file_path: 'src/components/chat-laboratory/AlbertModeSelector.tsx',
    file_type: 'tsx',
    content: `import { useState } from 'react';
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
};`,
    file_size: 4203,
    line_count: 144,
    imports: ['react', '@/components/ui/select', '@/components/ui/button', '@/components/ui/dialog', '@/components/ui/scroll-area', 'lucide-react', '@tanstack/react-query', '@/integrations/supabase/client', '@/hooks/use-toast'],
    exports: ['AlbertModeSelector']
  },
  {
    file_path: 'src/hooks/useExtractedFunctions.ts',
    file_type: 'ts',
    content: `import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExtractedFunction } from '@/types/design-lab-scanner';

export const useExtractedFunctions = (componentId?: string) => {
  const { data: functions, isLoading } = useQuery({
    queryKey: ['extracted-functions', componentId],
    queryFn: async () => {
      let query = supabase
        .from('design_lab_extracted_functions')
        .select('*')
        .order('created_at', { ascending: false });

      if (componentId) {
        query = query.eq('component_id', componentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ExtractedFunction[];
    },
  });

  return {
    functions,
    isLoading,
  };
};`,
    file_size: 682,
    line_count: 28,
    imports: ['@tanstack/react-query', '@/integrations/supabase/client', '@/types/design-lab-scanner'],
    exports: ['useExtractedFunctions']
  },
  {
    file_path: 'supabase/functions/sync-project-files/index.ts',
    file_type: 'ts',
    content: `// SYNC PROJECT FILES TO DATABASE (PAYLOAD VERSION)
// Riceve snapshot files dal client e li salva nel DB per accesso Albert
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { files } = await req.json();

    if (!files || !Array.isArray(files)) {
      return new Response(
        JSON.stringify({ error: 'Payload "files" array mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(\`🔄 [SYNC] Inizio sincronizzazione \${files.length} file da payload...\`);

    // Pulisci tabella esistente
    console.log('🗑️ Elimino file esistenti...');
    await supabaseClient
      .from('project_source_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserisci nuovi file in batch
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const { error } = await supabaseClient
        .from('project_source_files')
        .insert(batch);

      if (error) {
        console.error(\`❌ Errore insert batch \${i}-\${i + batch.length}:\`, error);
        throw error;
      }

      totalInserted += batch.length;
      console.log(\`   💾 Batch \${i + 1}-\${i + batch.length} salvato (\${totalInserted}/\${files.length})\`);
    }

    console.log(\`✅ Sincronizzazione completata: \${totalInserted} file inseriti\`);

    return new Response(
      JSON.stringify({
        success: true,
        filesProcessed: totalInserted,
        message: \`Sincronizzazione completata: \${totalInserted} file inseriti\`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ [SYNC] Errore:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`,
    file_size: 2145,
    line_count: 78,
    imports: ['https://deno.land/std@0.168.0/http/server.ts', 'https://esm.sh/@supabase/supabase-js@2.39.3'],
    exports: []
  }
];

export const SyncSourceFilesButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (PROJECT_FILES_SNAPSHOT.length === 0) {
      toast({
        title: "⚠️ Snapshot vuoto",
        description: "Chiedi a Lovable AI: 'Rigenera snapshot files per Albert'",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);

    try {
      toast({
        title: "🔄 Sincronizzazione in corso...",
        description: `Invio ${PROJECT_FILES_SNAPSHOT.length} file al database`,
      });

      const { data, error } = await supabase.functions.invoke('sync-project-files', {
        body: { files: PROJECT_FILES_SNAPSHOT }
      });

      if (error) throw error;

      toast({
        title: "✅ Sincronizzazione completata",
        description: `${data.filesProcessed} file caricati nel database per Albert`,
      });

    } catch (error: any) {
      console.error('Errore sincronizzazione:', error);

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
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span className="hidden md:inline">
              {isSyncing ? 'Sincronizzando...' : 'Sync Files'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Carica snapshot files del progetto per Albert</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

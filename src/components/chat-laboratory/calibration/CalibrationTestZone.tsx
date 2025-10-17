import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CalibrationConfig, TestResult } from '@/pages/ChatLaboratoryCalibration';

interface CalibrationTestZoneProps {
  config: CalibrationConfig;
  onTestComplete: (results: TestResult[]) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

interface RealParticipant {
  id: string;
  type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
}

export const CalibrationTestZone = ({ 
  config, 
  onTestComplete, 
  isRunning, 
  setIsRunning 
}: CalibrationTestZoneProps) => {
  const { toast } = useToast();
  const [testMessage, setTestMessage] = useState('Ciao, potresti spiegarmi come funziona la logistica internazionale?');
  const [realConversationId, setRealConversationId] = useState<string | null>(null);
  const [realParticipants, setRealParticipants] = useState<RealParticipant[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Crea automaticamente conversazione se non esiste
  useEffect(() => {
    const ensureConversationExists = async () => {
      try {
        let conversationId = localStorage.getItem('last_lab_conversation_id');
        
        // Se non esiste conversazione, creala
        if (!conversationId) {
          const { data: { user } } = await supabase.auth.getUser();
          
          // 1. Crea conversazione
          const { data: newConv, error: convError } = await supabase
            .from('chat_laboratory_conversations')
            .insert({
              titolo: 'Calibration Test',
              user_id: user?.id
            })
            .select()
            .single();
          
          if (convError) throw convError;
          conversationId = newConv.id;
          
          // 2. Crea Bar Mode
          await supabase.from('chat_laboratory_bar_mode').insert({
            conversation_id: conversationId,
            user_id: user?.id
          });
          
          // 3. Crea partecipante Claude di default
          const { data: participant } = await supabase
            .from('chat_laboratory_participants')
            .insert({
              conversation_id: conversationId,
              type: 'claude',
              name: 'Claude',
              is_active: true
            })
            .select()
            .single();
          
          setRealParticipants([participant as RealParticipant]);
          localStorage.setItem('last_lab_conversation_id', conversationId);
          
          toast({
            title: "✅ Conversazione creata",
            description: "Nuova conversazione di test pronta",
          });
        } else {
          // Conversazione esiste, carica partecipanti
          const { data: participants } = await supabase
            .from('chat_laboratory_participants')
            .select('id, type, name, is_active')
            .eq('conversation_id', conversationId)
            .eq('is_active', true);
          
          if (participants && participants.length > 0) {
            setRealParticipants(participants as RealParticipant[]);
          } else {
            // Nessun partecipante, creane uno di default
            const { data: participant } = await supabase
              .from('chat_laboratory_participants')
              .insert({
                conversation_id: conversationId,
                type: 'claude',
                name: 'Claude',
                is_active: true
              })
              .select()
              .single();
            
            setRealParticipants([participant as RealParticipant]);
          }
        }
        
        setRealConversationId(conversationId);
        setConfigLoaded(true);
        
      } catch (error: any) {
        console.error('Errore:', error);
        toast({
          title: "❌ Errore",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    ensureConversationExists();
    
    // Ricarica quando la pagina torna visibile
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ensureConversationExists();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const runTest = async () => {
    if (!testMessage.trim()) {
      toast({
        title: "⚠️ Attenzione",
        description: "Inserisci un messaggio di test",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);

    try {
      // 1️⃣ Ottieni numero messaggio corrente
      const { count } = await supabase
        .from('chat_laboratory_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', realConversationId);

      const messageSequence = (count || 0) + 1;

      // 2️⃣ Inserisci messaggio di test nella conversazione REALE
      await supabase.from('chat_laboratory_messages').insert({
        conversation_id: realConversationId,
        message_sequence: messageSequence,
        sender_type: 'human',
        sender_name: '[TEST] User',
        content: testMessage,
        is_visible_to_ai: true
      });

      const startTime = Date.now();

      // 3️⃣ Chiama orchestrator con configurazione REALE
      const { data, error } = await supabase.functions.invoke('bar-chat-orchestrator', {
        body: {
          conversationId: realConversationId,
          userMessage: testMessage,
          participants: realParticipants.map(p => ({
            type: p.type,
            name: p.name,
            is_active: p.is_active
          }))
        }
      });

      const endTime = Date.now();

      if (error) throw error;

      // 4️⃣ Estrai risultati
      const result: TestResult = {
        provider: data.speaker || realParticipants[0]?.name || 'AI',
        latency: endTime - startTime,
        tokens_in: data.tokens_in || 0,
        tokens_out: data.tokens_out || 0,
        success: true,
        response_preview: data.response?.substring(0, 100),
        cost_estimate: data.cost_estimate || 0,
        structured_prompt: data.structured_prompt
      };

      onTestComplete([result]);

      toast({
        title: "✅ Test completato",
        description: `Risposta ricevuta in ${result.latency}ms`,
      });
    } catch (error: any) {
      console.error('Test error:', error);
      
      const failedResult: TestResult = {
        provider: 'error',
        latency: 0,
        tokens_in: 0,
        tokens_out: 0,
        success: false,
        error_message: error.message
      };

      onTestComplete([failedResult]);

      toast({
        title: "❌ Test fallito",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-md">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <span className="text-xl">🧪</span>
          <span>Test Zone</span>
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Pronto per il test • {realParticipants.length} partecipanti attivi
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div>
          <label className="text-xs sm:text-sm font-medium mb-2 block">
            Messaggio di Test
          </label>
          <Textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Inserisci un messaggio per testare la configurazione..."
            className="min-h-[80px] sm:min-h-[100px] text-sm"
            disabled={isRunning}
          />
        </div>

        <Button
          onClick={runTest}
          disabled={isRunning}
          className="w-full gap-2"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Test in corso...</span>
              <span className="sm:hidden">Testing...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Esegui Test con Configurazione Reale</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

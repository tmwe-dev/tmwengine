import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CalibrationConfig, TestResult } from '@/pages/ChatLaboratoryCalibration';

interface CalibrationTestZoneProps {
  config: CalibrationConfig;
  onTestComplete: (results: TestResult[]) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

export const CalibrationTestZone = ({ 
  config, 
  onTestComplete, 
  isRunning, 
  setIsRunning 
}: CalibrationTestZoneProps) => {
  const { toast } = useToast();
  const [testMessage, setTestMessage] = useState('Ciao, potresti spiegarmi come funziona la logistica internazionale?');

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 1️⃣ Crea conversazione temporanea
      const { data: tempConv, error: convError } = await supabase
        .from('chat_laboratory_conversations')
        .insert({
          titolo: `🧪 Calibration Test ${new Date().toLocaleTimeString()}`,
          active_participants: [{ type: 'ai', name: 'Test AI' }],
          user_id: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // 2️⃣ Abilita Bar Mode per questa conversazione
      await supabase.from('chat_laboratory_bar_mode').insert({
        conversation_id: tempConv.id,
        mode: 'bar',
        voice_enabled: false,
        user_id: user.id
      });

      // 3️⃣ Inserisci almeno 1 partecipante AI attivo
      await supabase.from('chat_laboratory_participants').insert({
        conversation_id: tempConv.id,
        type: 'ai',
        name: 'Test AI',
        system_prompt: 'You are a helpful AI assistant for testing purposes.',
        is_active: true
      });

      // 4️⃣ Salva messaggio utente
      await supabase.from('chat_laboratory_messages').insert({
        conversation_id: tempConv.id,
        message_sequence: 1,
        sender_type: 'human',
        sender_name: 'Test User',
        content: testMessage,
        is_visible_to_ai: true
      });

      const startTime = Date.now();

      // 5️⃣ Chiama orchestrator con dati reali
      const { data, error } = await supabase.functions.invoke('bar-chat-orchestrator', {
        body: {
          conversationId: tempConv.id,
          userMessage: testMessage,
          participants: [{ type: 'ai', name: 'Test AI', is_active: true }]
        }
      });

      const endTime = Date.now();

      if (error) throw error;

      // 6️⃣ Estrai risultati
      const result: TestResult = {
        provider: data.speaker || 'Test AI',
        latency: endTime - startTime,
        tokens_in: data.tokens_in || 0,
        tokens_out: data.tokens_out || 0,
        success: true,
        response_preview: data.response?.substring(0, 100),
        cost_estimate: data.cost_estimate || 0,
        structured_prompt: data.structured_prompt
      };

      onTestComplete([result]);

      // 7️⃣ Cleanup: Elimina conversazione temporanea
      await supabase.from('chat_laboratory_messages').delete().eq('conversation_id', tempConv.id);
      await supabase.from('chat_laboratory_participants').delete().eq('conversation_id', tempConv.id);
      await supabase.from('chat_laboratory_bar_mode').delete().eq('conversation_id', tempConv.id);
      await supabase.from('chat_laboratory_conversations').delete().eq('id', tempConv.id);

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
          Esegui un test per verificare le performance
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
              <span>Esegui Test</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

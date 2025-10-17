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
      const startTime = Date.now();

      // Call the orchestrator with current config
      const { data, error } = await supabase.functions.invoke('bar-chat-orchestrator', {
        body: {
          conversationId: 'calibration-test',
          userMessage: testMessage,
          participants: [],
          calibrationMode: true,
          calibrationConfig: config
        }
      });

      const endTime = Date.now();

      if (error) throw error;

      const result: TestResult = {
        provider: data.speaker || 'unknown',
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Test Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Messaggio di Test
          </label>
          <Textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Inserisci un messaggio per testare la configurazione..."
            className="min-h-[100px]"
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
              Test in corso...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Esegui Test
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

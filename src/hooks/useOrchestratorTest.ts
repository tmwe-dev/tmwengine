import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestConfig {
  turnStrategy: string;
  pauseBetweenTurns: number;
  enableDirectCalls: boolean;
  selectedTopic?: string;
  activeKbId?: string;
  voiceEnabled: boolean;
}

interface TestResult {
  id: string;
  timestamp: string;
  turnStrategy: string;
  pauseBetweenTurns: number;
  enableDirectCalls: boolean;
  selectedAgent: string;
  responseTime: number;
  tokensInput: number;
  tokensOutput: number;
  success: boolean;
  errorMessage?: string;
  
  // 🆕 DATI TECNICI ORCHESTRAZIONE
  provider?: string;
  aiLatencyMs?: number;
  directCallDetected?: boolean;
  economyMode?: boolean;
  selectedScore?: number;
  allScores?: Array<{
    agent: string;
    score: number;
    expertise: number;
    gapPenalty: number;
  }>;
}

export function useOrchestratorTest(conversationId: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<TestConfig>({
    turnStrategy: 'RANDOM_30',
    pauseBetweenTurns: 800,
    enableDirectCalls: true,
    voiceEnabled: false,
  });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const updateConfig = (updates: Partial<TestConfig>) => {
    console.log('🔧 updateConfig chiamato con:', updates);
    setCurrentConfig(prev => {
      const newConfig = { ...prev, ...updates };
      console.log('📝 Nuovo config:', newConfig);
      return newConfig;
    });
  };

  const saveConfig = async (configName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orchestrator_test_configs')
        .insert({
          user_id: user.id,
          config_name: configName,
          ...currentConfig,
          active_kb_id: currentConfig.activeKbId,
          selected_topic: currentConfig.selectedTopic,
          voice_enabled: currentConfig.voiceEnabled,
        });

      if (error) throw error;

      toast({
        title: '✅ Configurazione salvata',
        description: `"${configName}" salvata con successo`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadConfig = async (configId: string) => {
    try {
      const { data, error } = await supabase
        .from('orchestrator_test_configs')
        .select('*')
        .eq('id', configId)
        .single();

      if (error) throw error;

      setCurrentConfig({
        turnStrategy: data.turn_strategy || 'RANDOM_30',
        pauseBetweenTurns: data.pause_between_turns_ms || 800,
        enableDirectCalls: data.enable_direct_calls ?? true,
        selectedTopic: data.selected_topic,
        activeKbId: data.active_kb_id,
        voiceEnabled: data.voice_enabled ?? false,
      });

      toast({
        title: '✅ Configurazione caricata',
        description: data.config_name,
      });
    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const runTest = async (testMessage: string) => {
    setIsRunning(true);
    const startTime = Date.now();

    try {
      // 1. Aggiorna le impostazioni Bar Mode (forza mode = 'bar')
      await supabase
        .from('chat_laboratory_bar_mode')
        .update({
          mode: 'bar',
          turn_strategy: currentConfig.turnStrategy,
          pause_between_turns_ms: currentConfig.pauseBetweenTurns,
          enable_direct_call_detection: currentConfig.enableDirectCalls,
          selected_topic: currentConfig.selectedTopic,
          active_kb_id: currentConfig.activeKbId,
          voice_enabled: currentConfig.voiceEnabled,
        })
        .eq('conversation_id', conversationId);

      // 2. Ottieni i partecipanti attivi
      const { data: participants } = await supabase
        .from('chat_laboratory_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_active', true);

      if (!participants || participants.length === 0) {
        throw new Error('Nessun partecipante attivo');
      }

      // 3. Invoca orchestrator
      const { data, error } = await supabase.functions.invoke('bar-chat-orchestrator', {
        body: {
          conversationId,
          userMessage: testMessage,
          participants,
        },
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        throw error;
      }

      // 4. Salva risultato
      const { data: { user } } = await supabase.auth.getUser();
      
      const testResult: Omit<TestResult, 'id' | 'timestamp'> = {
        turnStrategy: currentConfig.turnStrategy,
        pauseBetweenTurns: currentConfig.pauseBetweenTurns,
        enableDirectCalls: currentConfig.enableDirectCalls,
        selectedAgent: data.speaker || 'Unknown',
        responseTime,
        tokensInput: data.tokens?.input || 0,
        tokensOutput: data.tokens?.output || 0,
        success: true,
        
        // 🆕 DATI TECNICI ORCHESTRAZIONE
        provider: data.orchestration?.provider || 'unknown',
        aiLatencyMs: data.orchestration?.aiLatencyMs || responseTime,
        directCallDetected: data.orchestration?.directCallDetected || false,
        economyMode: data.orchestration?.economyMode || false,
        selectedScore: data.orchestration?.selectedScore,
        allScores: data.orchestration?.allScores
      };

      if (user) {
        await supabase.from('orchestrator_test_results').insert([{
          user_id: user.id,
          conversation_id: conversationId,
          test_config: currentConfig as any,
          input_message: testMessage,
          selected_agent: testResult.selectedAgent,
          response_time_ms: testResult.responseTime,
          tokens_input: testResult.tokensInput,
          tokens_output: testResult.tokensOutput,
          success: true,
        }]);
      }

      setTestResults(prev => [{
        ...testResult,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }, ...prev]);

      toast({
        title: '✅ Test completato',
        description: `${testResult.selectedAgent} ha risposto in ${responseTime}ms`,
      });

      return data;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      const failedResult: TestResult = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        turnStrategy: currentConfig.turnStrategy,
        pauseBetweenTurns: currentConfig.pauseBetweenTurns,
        enableDirectCalls: currentConfig.enableDirectCalls,
        selectedAgent: 'N/A',
        responseTime,
        tokensInput: 0,
        tokensOutput: 0,
        success: false,
        errorMessage: error.message,
      };

      setTestResults(prev => [failedResult, ...prev]);

      toast({
        title: '❌ Test fallito',
        description: error.message,
        variant: 'destructive',
      });

      throw error;
    } finally {
      setIsRunning(false);
    }
  };

  const loadTestResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orchestrator_test_results')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTestResults(
        data.map(r => {
          const config = r.test_config as any;
          return {
            id: r.id,
            timestamp: r.created_at,
            turnStrategy: config?.turnStrategy || 'Unknown',
            pauseBetweenTurns: config?.pauseBetweenTurns || 0,
            enableDirectCalls: config?.enableDirectCalls ?? false,
            selectedAgent: r.selected_agent || 'N/A',
            responseTime: r.response_time_ms || 0,
            tokensInput: r.tokens_input || 0,
            tokensOutput: r.tokens_output || 0,
            success: r.success,
            errorMessage: r.error_message,
          };
        })
      );
    } catch (error: any) {
      console.error('Error loading test results:', error);
    }
  };

  return {
    currentConfig,
    updateConfig,
    saveConfig,
    loadConfig,
    runTest,
    isRunning,
    testResults,
    loadTestResults,
  };
}

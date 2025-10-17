import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings2, Save, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CalibrationTestZone } from '@/components/chat-laboratory/calibration/CalibrationTestZone';
import { CalibrationParamsPanel } from '@/components/chat-laboratory/calibration/CalibrationParamsPanel';
import { CalibrationMetricsCard } from '@/components/chat-laboratory/calibration/CalibrationMetricsCard';
import { PromptViewer } from '@/components/chat-laboratory/calibration/PromptViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CalibrationConfig {
  timeout_ms: number;
  max_retries: number;
  base_delay_ms: number;
  context_limit: number;
  economy_mode: boolean;
  kb_match_threshold: number;
  kb_match_count: number;
  temperature: number;
  max_tokens: number;
  top_p: number;
  turn_strategy: string;
  smart_weights: {
    expertise: number;
    balance: number;
    freshness: number;
  };
  vad_silence_duration: number;
  conversation_style: string;
}

export interface TestResult {
  provider: string;
  latency: number;
  tokens_in: number;
  tokens_out: number;
  success: boolean;
  error_message?: string;
  response_preview?: string;
  cost_estimate?: number;
  structured_prompt?: any;
}

const ChatLaboratoryCalibration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<CalibrationConfig>({
    timeout_ms: 8000,
    max_retries: 2,
    base_delay_ms: 300,
    context_limit: 20,
    economy_mode: true,
    kb_match_threshold: 0.7,
    kb_match_count: 3,
    temperature: 0.8,
    max_tokens: 1500,
    top_p: 0.9,
    turn_strategy: 'RANDOM_30',
    smart_weights: {
      expertise: 50,
      balance: 30,
      freshness: 20
    },
    vad_silence_duration: 3000,
    conversation_style: 'colleagues'
  });

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);

  const handleSaveConfig = async (configName: string) => {
    try {
      // First, deactivate all existing configs
      await supabase
        .from('chat_laboratory_calibration_configs')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new config
      const { error } = await supabase
        .from('chat_laboratory_calibration_configs')
        .insert({
          config_name: configName,
          ...config,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "✅ Configurazione salvata",
        description: `"${configName}" è ora la configurazione attiva`,
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile salvare la configurazione",
        variant: "destructive",
      });
    }
  };

  const handleTestComplete = (results: TestResult[]) => {
    setTestResults(results);
    if (results[0]?.structured_prompt) {
      setSelectedPrompt(results[0].structured_prompt);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900/20 via-background to-violet-900/20 p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat-laboratory')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                <Settings2 className="h-6 w-6 text-indigo-600" />
                AI Calibration Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Test, optimize, and fine-tune AI parameters
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => {
              const name = prompt('Nome configurazione:');
              if (name) handleSaveConfig(name);
            }}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salva Config
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Sidebar - Parameters */}
          <div className="col-span-3">
            <CalibrationParamsPanel
              config={config}
              onChange={setConfig}
            />
          </div>

          {/* Center - Test Zone & Prompt Viewer */}
          <div className="col-span-6 space-y-4">
            <CalibrationTestZone
              config={config}
              onTestComplete={handleTestComplete}
              isRunning={isTestRunning}
              setIsRunning={setIsTestRunning}
            />

            {selectedPrompt && (
              <PromptViewer
                structuredPrompt={selectedPrompt}
                onSectionEdit={(sectionKey, newContent) => {
                  setSelectedPrompt({
                    ...selectedPrompt,
                    [sectionKey]: newContent
                  });
                }}
              />
            )}
          </div>

          {/* Right Sidebar - Metrics */}
          <div className="col-span-3 space-y-4">
            {testResults.map((result, idx) => (
              <CalibrationMetricsCard
                key={idx}
                result={result}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLaboratoryCalibration;

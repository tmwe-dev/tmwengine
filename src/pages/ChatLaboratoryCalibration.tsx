import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PromptViewer } from '@/components/chat-laboratory/calibration/PromptViewer';
import { OrchestratorTestPanel } from '@/components/chat-laboratory/calibration/OrchestratorTestPanel';
import { TestResultsTable } from '@/components/chat-laboratory/calibration/TestResultsTable';
import { ConfigurationSelector } from '@/components/chat-laboratory/calibration/ConfigurationSelector';
import { supabase } from '@/integrations/supabase/client';
import { useOrchestratorTest } from '@/hooks/useOrchestratorTest';

interface Message {
  id: string;
  sender_name: string;
  content: string;
  tempo_risposta_ms: number | null;
  token_input: number | null;
  token_output: number | null;
  created_at: string;
  attachments?: any;
}

const ChatLaboratoryCalibration = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const orchestratorTest = useOrchestratorTest(conversationId || '');

  useEffect(() => {
    // Carica l'ultima conversazione dal localStorage
    const lastConvId = localStorage.getItem('last_lab_conversation_id');
    if (lastConvId) {
      setConversationId(lastConvId);
      loadMessages(lastConvId);
      if (orchestratorTest) {
        orchestratorTest.loadTestResults();
      }
    }
  }, []);

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('chat_laboratory_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const handleMessageClick = (message: Message) => {
    // Estrai il prompt strutturato dagli attachments se disponibile
    if (message.attachments && typeof message.attachments === 'object') {
      const attachmentsObj = message.attachments as any;
      if (attachmentsObj.structured_prompt) {
        setSelectedPrompt(attachmentsObj.structured_prompt);
      }
    }
  };

  const handleRunTest = async (message: string) => {
    const response = await orchestratorTest.runTest(message);
    if (response) {
      setLastResponse({
        speaker: response.speaker,
        content: response.content,
        responseTime: response.responseTime || 0,
        tokensUsed: response.tokensUsed,
      });
    }
    return response;
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                AI Calibration Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitor real-time AI performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column: Messages + Config Selector */}
          <div className="col-span-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messaggi Recenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nessun messaggio disponibile
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors ${
                        selectedPrompt?.message_id === message.id
                          ? 'ring-2 ring-primary bg-accent/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-semibold text-sm">
                          {message.sender_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString('it-IT')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {message.content}
                      </p>

                      {/* Metrics */}
                      <div className="flex flex-wrap gap-2">
                        {message.tempo_risposta_ms !== null && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            {message.tempo_risposta_ms}ms
                          </Badge>
                        )}
                        {message.token_input !== null && (
                          <Badge variant="outline" className="text-xs gap-1">
                            ↓ {message.token_input} tok
                          </Badge>
                        )}
                        {message.token_output !== null && (
                          <Badge variant="outline" className="text-xs gap-1">
                            ↑ {message.token_output} tok
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <ConfigurationSelector onLoadConfig={orchestratorTest.loadConfig} />
          </div>

          {/* Center Column: Orchestrator Test Panel */}
          <div className="col-span-4">
            {conversationId ? (
              <OrchestratorTestPanel
                config={orchestratorTest.currentConfig}
                onConfigChange={orchestratorTest.updateConfig}
                onRunTest={handleRunTest}
                onSaveConfig={orchestratorTest.saveConfig}
                isRunning={orchestratorTest.isRunning}
                lastResponse={lastResponse}
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">
                    Avvia una conversazione in Chat Laboratory per testare l'orchestrator
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Prompt Viewer + Test Results + Debug Panel */}
          <div className="col-span-4 space-y-4">
            {/* Prompt Viewer - mostra il prompt del messaggio selezionato */}
            {selectedPrompt && (
              <PromptViewer structuredPrompt={selectedPrompt} />
            )}

            {/* Last Call Debug Panel */}
            {lastResponse && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  🔍 Last Call Debug
                  <Badge variant="secondary" className="text-xs">Live</Badge>
                </h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agent:</span>
                    <span className="font-semibold">{lastResponse.speaker}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{lastResponse.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tokens IN:</span>
                    <span>{lastResponse.tokensUsed?.input || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tokens OUT:</span>
                    <span>{lastResponse.tokensUsed?.output || 0}</span>
                  </div>
                </div>
              </Card>
            )}
            
            <TestResultsTable results={orchestratorTest.testResults} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLaboratoryCalibration;

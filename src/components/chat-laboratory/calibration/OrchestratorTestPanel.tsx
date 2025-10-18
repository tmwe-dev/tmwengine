import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Play, Save, Eye } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { OrchestratorDebugModal } from './OrchestratorDebugModal';

interface OrchestratorTestPanelProps {
  config: {
    pauseBetweenTurns: number;
    selectedTopic?: string;
    activeKbId?: string;
  };
  onConfigChange: (updates: any) => void;
  onRunTest: (message: string) => Promise<any>;
  onSaveConfig: (name: string) => void;
  isRunning: boolean;
  lastResponse?: {
    speaker: string;
    content: string;
    responseTime: number;
    tokensUsed?: { input: number; output: number };
  };
  debugTimeline?: any[];
  debugMeta?: any;
  lastTestMessage?: string;
}

export function OrchestratorTestPanel({
  config,
  onConfigChange,
  onRunTest,
  onSaveConfig,
  isRunning,
  lastResponse,
  debugTimeline = [],
  debugMeta,
  lastTestMessage = '',
}: OrchestratorTestPanelProps) {
  const [testMessage, setTestMessage] = useState('');
  const [configName, setConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);

  const handleTest = async () => {
    if (!testMessage.trim()) return;
    await onRunTest(testMessage);
  };

  const handleSave = () => {
    if (configName.trim()) {
      onSaveConfig(configName);
      setConfigName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎯 Configurazione Orchestrator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pause Between Turns */}
          <div className="space-y-2">
            <Label>Pause Between Turns (ms)</Label>
            <Input
              type="number"
              value={config.pauseBetweenTurns}
              onChange={(e) => onConfigChange({ pauseBetweenTurns: parseInt(e.target.value) || 0 })}
              min={0}
              max={5000}
              step={100}
            />
            <p className="text-xs text-muted-foreground">
              Pausa manuale tra risposte consecutive (0 = nessuna pausa)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {showSaveDialog ? (
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Nome configurazione..."
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <Button onClick={handleSave} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Salva
                </Button>
                <Button onClick={() => setShowSaveDialog(false)} variant="ghost" size="sm">
                  Annulla
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowSaveDialog(true)} variant="outline" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Salva Configurazione
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🧪 Test Orchestrator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Messaggio di test</Label>
            <Textarea
              placeholder="Inserisci un messaggio per testare l'orchestrator..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleTest} 
            disabled={isRunning || !testMessage.trim()}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Test in corso...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Avvia Test
              </>
            )}
          </Button>

          {lastResponse && (
            <div className="p-4 border rounded-lg bg-accent/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">🤖 {lastResponse.speaker}</span>
                <span className="text-muted-foreground">
                  {lastResponse.responseTime}ms
                </span>
              </div>
              <p className="text-sm">{lastResponse.content}</p>
              {lastResponse.tokensUsed && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>↓ {lastResponse.tokensUsed.input} tok in</span>
                  <span>↑ {lastResponse.tokensUsed.output} tok out</span>
                </div>
              )}
            </div>
          )}

          {/* Debug Button */}
          {debugTimeline && debugTimeline.length > 0 && debugMeta && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowDebugModal(true)}
                className="w-full gap-2"
              >
                <Eye className="h-4 w-4" />
                🔍 View Orchestration Debug
              </Button>

              <OrchestratorDebugModal
                open={showDebugModal}
                onClose={() => setShowDebugModal(false)}
                timeline={debugTimeline}
                meta={debugMeta}
                userMessage={lastTestMessage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

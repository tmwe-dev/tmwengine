import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface OrchestratorTestPanelProps {
  config: {
    turnStrategy: string;
    pauseBetweenTurns: number;
    enableDirectCalls: boolean;
    selectedTopic?: string;
    activeKbId?: string;
    voiceEnabled: boolean;
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
}

export function OrchestratorTestPanel({
  config,
  onConfigChange,
  onRunTest,
  onSaveConfig,
  isRunning,
  lastResponse,
}: OrchestratorTestPanelProps) {
  const [testMessage, setTestMessage] = useState('');
  const [configName, setConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

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
          {/* Turn Strategy */}
          <div className="space-y-2">
            <Label>Turn Strategy</Label>
            <Select
              value={config.turnStrategy}
              onValueChange={(value) => onConfigChange({ turnStrategy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RANDOM_30">RANDOM_30 (30% random)</SelectItem>
                <SelectItem value="SMART_PRIORITY">SMART_PRIORITY (AI-based)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          </div>

          {/* Enable Direct Call Detection */}
          <div className="flex items-center justify-between">
            <Label>Enable Direct Call Detection</Label>
            <Switch
              checked={config.enableDirectCalls}
              onCheckedChange={(checked) => onConfigChange({ enableDirectCalls: checked })}
            />
          </div>

          {/* Voice Enabled */}
          <div className="flex items-center justify-between">
            <Label>Voice Enabled</Label>
            <Switch
              checked={config.voiceEnabled}
              onCheckedChange={(checked) => onConfigChange({ voiceEnabled: checked })}
            />
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
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CalibrationConfig } from '@/pages/ChatLaboratoryCalibration';

interface CalibrationParamsPanelProps {
  config: CalibrationConfig;
  onChange: (config: CalibrationConfig) => void;
}

export const CalibrationParamsPanel = ({ config, onChange }: CalibrationParamsPanelProps) => {
  const updateConfig = (key: keyof CalibrationConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Resilience */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">⚡ Resilience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Timeout (ms)</Label>
            <Slider
              value={[config.timeout_ms]}
              onValueChange={([v]) => updateConfig('timeout_ms', v)}
              min={5000}
              max={30000}
              step={1000}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.timeout_ms}ms</span>
          </div>

          <div>
            <Label className="text-xs">Max Retries</Label>
            <Slider
              value={[config.max_retries]}
              onValueChange={([v]) => updateConfig('max_retries', v)}
              min={0}
              max={5}
              step={1}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.max_retries}</span>
          </div>

          <div>
            <Label className="text-xs">Base Delay (ms)</Label>
            <Slider
              value={[config.base_delay_ms]}
              onValueChange={([v]) => updateConfig('base_delay_ms', v)}
              min={100}
              max={1000}
              step={100}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.base_delay_ms}ms</span>
          </div>
        </CardContent>
      </Card>

      {/* Context */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">📚 Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Message Limit</Label>
            <Slider
              value={[config.context_limit]}
              onValueChange={([v]) => updateConfig('context_limit', v)}
              min={5}
              max={50}
              step={5}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.context_limit} msgs</span>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Economy Mode</Label>
            <Switch
              checked={config.economy_mode}
              onCheckedChange={(v) => updateConfig('economy_mode', v)}
            />
          </div>

          <div>
            <Label className="text-xs">KB Match Threshold</Label>
            <Slider
              value={[config.kb_match_threshold * 100]}
              onValueChange={([v]) => updateConfig('kb_match_threshold', v / 100)}
              min={50}
              max={95}
              step={5}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.kb_match_threshold}</span>
          </div>

          <div>
            <Label className="text-xs">KB Match Count</Label>
            <Slider
              value={[config.kb_match_count]}
              onValueChange={([v]) => updateConfig('kb_match_count', v)}
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.kb_match_count} docs</span>
          </div>
        </CardContent>
      </Card>

      {/* AI Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">🤖 AI Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Temperature</Label>
            <Slider
              value={[config.temperature * 10]}
              onValueChange={([v]) => updateConfig('temperature', v / 10)}
              min={0}
              max={20}
              step={1}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.temperature}</span>
          </div>

          <div>
            <Label className="text-xs">Max Tokens</Label>
            <Slider
              value={[config.max_tokens]}
              onValueChange={([v]) => updateConfig('max_tokens', v)}
              min={100}
              max={4000}
              step={100}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.max_tokens}</span>
          </div>

          <div>
            <Label className="text-xs">Top P</Label>
            <Slider
              value={[config.top_p * 100]}
              onValueChange={([v]) => updateConfig('top_p', v / 100)}
              min={0}
              max={100}
              step={5}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{config.top_p}</span>
          </div>
        </CardContent>
      </Card>

      {/* Turn Strategy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">🔄 Turn Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Strategy</Label>
            <Select
              value={config.turn_strategy}
              onValueChange={(v) => updateConfig('turn_strategy', v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RANDOM_30">Random 30%</SelectItem>
                <SelectItem value="SMART_PRIORITY">Smart Priority</SelectItem>
                <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

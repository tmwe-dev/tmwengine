import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span>Resilience</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">Timeout</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.timeout_ms}ms
              </Badge>
            </div>
            <Slider
              value={[config.timeout_ms]}
              onValueChange={([v]) => updateConfig('timeout_ms', v)}
              min={5000}
              max={30000}
              step={1000}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">Max Retries</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.max_retries}
              </Badge>
            </div>
            <Slider
              value={[config.max_retries]}
              onValueChange={([v]) => updateConfig('max_retries', v)}
              min={0}
              max={5}
              step={1}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">Base Delay</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.base_delay_ms}ms
              </Badge>
            </div>
            <Slider
              value={[config.base_delay_ms]}
              onValueChange={([v]) => updateConfig('base_delay_ms', v)}
              min={100}
              max={1000}
              step={100}
            />
          </div>
        </CardContent>
      </Card>

      {/* Context */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <span className="text-lg">📚</span>
            <span>Context</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">Message Limit</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.context_limit}
              </Badge>
            </div>
            <Slider
              value={[config.context_limit]}
              onValueChange={([v]) => updateConfig('context_limit', v)}
              min={5}
              max={50}
              step={5}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">Economy Mode</Label>
            <Switch
              checked={config.economy_mode}
              onCheckedChange={(v) => updateConfig('economy_mode', v)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">KB Threshold</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.kb_match_threshold}
              </Badge>
            </div>
            <Slider
              value={[config.kb_match_threshold * 100]}
              onValueChange={([v]) => updateConfig('kb_match_threshold', v / 100)}
              min={50}
              max={95}
              step={5}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">KB Count</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.kb_match_count}
              </Badge>
            </div>
            <Slider
              value={[config.kb_match_count]}
              onValueChange={([v]) => updateConfig('kb_match_count', v)}
              min={1}
              max={10}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Parameters */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span>AI Provider</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">Temperature</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.temperature}
              </Badge>
            </div>
            <Slider
              value={[config.temperature * 10]}
              onValueChange={([v]) => updateConfig('temperature', v / 10)}
              min={0}
              max={20}
              step={1}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">Max Tokens</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.max_tokens}
              </Badge>
            </div>
            <Slider
              value={[config.max_tokens]}
              onValueChange={([v]) => updateConfig('max_tokens', v)}
              min={100}
              max={4000}
              step={100}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs sm:text-sm">Top P</Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {config.top_p}
              </Badge>
            </div>
            <Slider
              value={[config.top_p * 100]}
              onValueChange={([v]) => updateConfig('top_p', v / 100)}
              min={0}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Turn Strategy */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <span>Turn Strategy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div>
            <Label className="text-xs sm:text-sm mb-2 block">Strategy</Label>
            <Select
              value={config.turn_strategy}
              onValueChange={(v) => updateConfig('turn_strategy', v)}
            >
              <SelectTrigger className="text-xs sm:text-sm">
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

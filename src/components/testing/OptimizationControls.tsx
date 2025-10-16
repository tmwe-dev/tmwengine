import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, FileText, GitBranch, Clock, Timer } from 'lucide-react';

export interface OptimizationFlags {
  enableLogging: boolean;
  useDoubleSerializat: boolean;
  useSequentialExecution: boolean;
  useTextResponse: boolean;
  benchmarkDelay: number;
}

interface OptimizationControlsProps {
  flags: OptimizationFlags;
  onFlagsChange: (flags: OptimizationFlags) => void;
}

export const OptimizationControls = ({ flags, onFlagsChange }: OptimizationControlsProps) => {
  const updateFlag = (key: keyof OptimizationFlags, value: boolean | number) => {
    onFlagsChange({ ...flags, [key]: value });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Optimization A/B Testing Controls
        </CardTitle>
        <CardDescription>
          Toggle ottimizzazioni individuali per vedere l'impatto sulle performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logging */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="logging" className="text-sm font-semibold">
                🪵 Edge Function Logging
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                ON: Full logging (+100-150ms) | OFF: Errors only
              </p>
            </div>
          </div>
          <Switch
            id="logging"
            checked={flags.enableLogging}
            onCheckedChange={(checked) => updateFlag('enableLogging', checked)}
          />
        </div>

        {/* Double Serialization */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="serialization" className="text-sm font-semibold">
                📦 Double Serialization
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                ON: responseText + JSON.parse (+20-50ms) | OFF: response.json()
              </p>
            </div>
          </div>
          <Switch
            id="serialization"
            checked={flags.useDoubleSerializat}
            onCheckedChange={(checked) => updateFlag('useDoubleSerializat', checked)}
          />
        </div>

        {/* Sequential Execution */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="execution" className="text-sm font-semibold">
                ⚡ Sequential Execution
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                ON: Sequential await | OFF: Promise.all() parallel (-30-40%)
              </p>
            </div>
          </div>
          <Switch
            id="execution"
            checked={flags.useSequentialExecution}
            onCheckedChange={(checked) => updateFlag('useSequentialExecution', checked)}
          />
        </div>

        {/* Text Response */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="response" className="text-sm font-semibold">
                ⏱️ Response Processing
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                ON: .text() + manual parse (+15-30ms) | OFF: .json() direct
              </p>
            </div>
          </div>
          <Switch
            id="response"
            checked={flags.useTextResponse}
            onCheckedChange={(checked) => updateFlag('useTextResponse', checked)}
          />
        </div>

        {/* Benchmark Delay */}
        <div className="p-4 rounded-lg bg-background/50 border space-y-3">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="delay" className="text-sm font-semibold">
                ⏳ Benchmark Delay: {flags.benchmarkDelay}ms
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Pausa tra test per evitare throttling
              </p>
            </div>
          </div>
          <Slider
            id="delay"
            min={50}
            max={2000}
            step={50}
            value={[flags.benchmarkDelay]}
            onValueChange={([value]) => updateFlag('benchmarkDelay', value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50ms (veloce)</span>
            <span>2000ms (sicuro)</span>
          </div>
        </div>

        {/* Impact Summary */}
        <div className="p-4 rounded-lg bg-primary/10 border-primary/30 border">
          <p className="text-xs font-semibold mb-2">📊 Impatto Stimato Totale:</p>
          <p className="text-sm text-muted-foreground">
            {flags.enableLogging && '🪵 +100ms '}
            {flags.useDoubleSerializat && '📦 +50ms '}
            {flags.useTextResponse && '⏱️ +30ms '}
            {!flags.useSequentialExecution && '⚡ -30% '}
            {!flags.enableLogging && !flags.useDoubleSerializat && !flags.useTextResponse && '✅ Fully Optimized'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

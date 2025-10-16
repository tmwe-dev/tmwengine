import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, FileText, GitBranch, Clock, Timer } from 'lucide-react';

export interface OptimizationFlags {
  enableLogging: boolean;
  useDoubleSerializat: boolean;
  useSequentialExecution: boolean;
  useTextResponse: boolean;
  benchmarkDelay: number;
  useBatchParallelization?: boolean;
  batchChunkSize?: number;
}

interface OptimizationControlsProps {
  flags: OptimizationFlags;
  onFlagsChange: (flags: OptimizationFlags) => void;
}

export const OptimizationControls = ({ flags, onFlagsChange }: OptimizationControlsProps) => {
  const updateFlag = (key: keyof OptimizationFlags, value: boolean | number) => {
    onFlagsChange({ ...flags, [key]: value });
  };

  // Calcola impatto performance stimato
  const calculateImpact = () => {
    let impact = 0;
    if (!flags.enableLogging) impact += 15; // -100-150ms su ~1000ms baseline = ~15%
    if (!flags.useDoubleSerializat) impact += 5; // -20-50ms
    if (!flags.useSequentialExecution) impact += 35; // -30-40% su batch
    if (!flags.useTextResponse) impact += 3; // -15-30ms
    if (flags.useBatchParallelization) impact += 10; // -30-50% su batch grandi
    return Math.min(impact, 70); // Cap al 70%
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          ⚙️ Optimization Lab - Flag Controls
        </CardTitle>
        <CardDescription>
          Configurazione ottimale già impostata ✅ - Modifica per testare varianti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logging */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="logging" className="text-sm font-semibold">
                  🪵 Edge Function Logging
                </Label>
                {!flags.enableLogging && (
                  <Badge variant="default" className="bg-green-500 text-white">
                    ✅ FASTEST (-100-150ms)
                  </Badge>
                )}
              </div>
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="execution" className="text-sm font-semibold">
                  ⚡ Sequential Execution
                </Label>
                {!flags.useSequentialExecution && (
                  <Badge variant="default" className="bg-green-500 text-white">
                    ✅ FASTEST (-30-40%)
                  </Badge>
                )}
              </div>
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

        {/* Batch Parallelization */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="batchParallel" className="text-sm font-semibold">
                🧩 Batch Parallelization
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Chunking per batch grandi (oltre 10 msg) - Impatto: -30 a -50%
              </p>
            </div>
          </div>
          <Switch
            id="batchParallel"
            checked={flags.useBatchParallelization || false}
            onCheckedChange={(checked) => updateFlag('useBatchParallelization', checked)}
          />
        </div>

        {/* Batch Chunk Size */}
        <div className="p-4 rounded-lg bg-background/50 border space-y-3">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="chunkSize" className="text-sm font-semibold">
                📦 Chunk Size: {flags.batchChunkSize || 10} msgs
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Numero di messaggi per chunk (5-20)
              </p>
            </div>
          </div>
          <Slider
            id="chunkSize"
            min={5}
            max={20}
            step={5}
            value={[flags.batchChunkSize || 10]}
            onValueChange={([value]) => updateFlag('batchChunkSize', value)}
            disabled={!flags.useBatchParallelization}
            className="w-full"
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
        </div>

        {/* Live Impact Calculator */}
        <Card className={`${calculateImpact() > 50 ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">📊 Impatto Performance Stimato</p>
              <p className={`text-4xl font-bold ${calculateImpact() > 50 ? 'text-green-500' : 'text-yellow-500'}`}>
                -{calculateImpact()}%
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                rispetto alla baseline (tutti flag ON)
              </p>
              <div className="mt-3 text-xs space-y-1">
                {!flags.enableLogging && <p className="text-green-600">✅ Logging disabled: -15%</p>}
                {!flags.useSequentialExecution && <p className="text-green-600">✅ Parallel execution: -35%</p>}
                {flags.useBatchParallelization && <p className="text-green-600">✅ Batch chunking: -10%</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

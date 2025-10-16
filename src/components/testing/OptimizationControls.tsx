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
  useBatchParallelization?: boolean;
  batchChunkSize?: number;
  useFolderCache?: boolean;
  folderCacheTTL?: number;
  usePaginationCache?: boolean;
  paginationCacheTTL?: number;
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

        {/* Folder Cache - HIGH PRIORITY */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <Label htmlFor="folderCache" className="text-sm font-semibold">
                🗂️ Folder Cache (Critical -90-95%)
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Cache aggressiva per get_folders con counts/hierarchy
              </p>
            </div>
          </div>
          <Switch
            id="folderCache"
            checked={flags.useFolderCache || false}
            onCheckedChange={(checked) => updateFlag('useFolderCache', checked)}
          />
        </div>

        {flags.useFolderCache && (
          <div className="p-4 rounded-lg bg-background/50 border space-y-3 ml-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="folderCacheTTL" className="text-sm font-semibold">
                  ⏱️ Folder Cache TTL: {flags.folderCacheTTL || 60}s
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Durata cache cartelle (30-300s)
                </p>
              </div>
            </div>
            <Slider
              id="folderCacheTTL"
              min={30}
              max={300}
              step={30}
              value={[flags.folderCacheTTL || 60]}
              onValueChange={([value]) => updateFlag('folderCacheTTL', value)}
              className="w-full"
            />
          </div>
        )}

        {/* Pagination Cache - HIGH PRIORITY */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <Label htmlFor="paginationCache" className="text-sm font-semibold">
                📄 Pagination Cache (Optimization -80-95%)
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Cache risultati paginati per get_messages
              </p>
            </div>
          </div>
          <Switch
            id="paginationCache"
            checked={flags.usePaginationCache || false}
            onCheckedChange={(checked) => updateFlag('usePaginationCache', checked)}
          />
        </div>

        {flags.usePaginationCache && (
          <div className="p-4 rounded-lg bg-background/50 border space-y-3 ml-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="paginationCacheTTL" className="text-sm font-semibold">
                  ⏱️ Pagination Cache TTL: {flags.paginationCacheTTL || 60}s
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Durata cache paginazione (30-180s)
                </p>
              </div>
            </div>
            <Slider
              id="paginationCacheTTL"
              min={30}
              max={180}
              step={30}
              value={[flags.paginationCacheTTL || 60]}
              onValueChange={([value]) => updateFlag('paginationCacheTTL', value)}
              className="w-full"
            />
          </div>
        )}

        {/* Impact Summary */}
        <div className="p-4 rounded-lg bg-primary/10 border-primary/30 border">
          <p className="text-xs font-semibold mb-2">📊 Impatto Stimato Totale:</p>
          <p className="text-sm text-muted-foreground">
            {flags.enableLogging && '🪵 +100ms '}
            {flags.useDoubleSerializat && '📦 +50ms '}
            {flags.useTextResponse && '⏱️ +30ms '}
            {!flags.useSequentialExecution && '⚡ -30% '}
            {flags.useBatchParallelization && '🧩 Chunking '}
            {flags.useFolderCache && '🗂️ -90% (Folder) '}
            {flags.usePaginationCache && '📄 -80% (Pagination) '}
            {!flags.enableLogging && !flags.useDoubleSerializat && !flags.useTextResponse && flags.useFolderCache && flags.usePaginationCache && '🚀 MAXIMUM OPTIMIZATION'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

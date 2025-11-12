/**
 * Incremental Download Tester
 * Test component per IncrementalStrategy (Metodo di Luca)
 * Scarica solo nuove email da MAX(uid) + 1
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rocket, StopCircle, RotateCcw, Zap, ArrowRight } from 'lucide-react';
import { useEmailDownload, type DownloadStrategyType } from '@/hooks/useEmailDownload';
import { cn } from '@/lib/utils';

export const IncrementalDownloadTester = () => {
  const [testRunning, setTestRunning] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<DownloadStrategyType>('incremental');

  const {
    isRunning,
    logs,
    progress,
    start,
    stop,
    reset
  } = useEmailDownload({
    strategy: selectedStrategy
  });

  const handleStart = async () => {
    setTestRunning(true);
    try {
      await start();
    } finally {
      setTestRunning(false);
    }
  };

  const handleStop = () => {
    stop();
    setTestRunning(false);
  };

  const handleReset = () => {
    reset();
    setTestRunning(false);
  };

  // Calculate progress percentage
  const progressPercent = progress.total > 0 
    ? Math.round((progress.imported / progress.total) * 100)
    : 0;

  // Get last log entry
  const lastLog = logs[logs.length - 1];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Download Test - Multiple Strategies
            </CardTitle>
            <CardDescription>
              Test different download strategies and compare performance
            </CardDescription>
            
            {/* Strategy Selector */}
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedStrategy('incremental')}
                variant={selectedStrategy === 'incremental' ? 'default' : 'outline'}
                size="sm"
                disabled={isRunning}
              >
                Incremental
              </Button>
              <Button
                onClick={() => setSelectedStrategy('luca')}
                variant={selectedStrategy === 'luca' ? 'default' : 'outline'}
                size="sm"
                disabled={isRunning}
              >
                Luca (Zero Liste)
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isRunning ? (
              <>
                <Button
                  onClick={handleStart}
                  disabled={testRunning}
                  className="gap-2"
                >
                  <Rocket className="h-4 w-4" />
                  Start Test
                </Button>
                {logs.length > 0 && (
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="icon"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={handleStop}
                variant="destructive"
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Real-time Progress */}
        {(isRunning || progress.imported > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {progress.imported} / {progress.total > 0 ? progress.total : '?'} emails
              </span>
            </div>
            
            <Progress value={progressPercent} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {progress.imported}
                </div>
                <div className="text-muted-foreground">Downloaded</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-destructive">
                  {progress.errors}
                </div>
                <div className="text-muted-foreground">Errors</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {progressPercent}%
                </div>
                <div className="text-muted-foreground">Complete</div>
              </div>
            </div>

            {/* Current Folder */}
            {progress.current_folder && (
              <div className="flex items-center gap-2 text-sm p-3 bg-primary/10 rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-medium">Current folder:</span>
                <Badge variant="secondary">{progress.current_folder}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Live Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Live Logs</h4>
            {logs.length > 0 && (
              <Badge variant="outline">{logs.length} entries</Badge>
            )}
          </div>

          <ScrollArea className="h-[300px] rounded-md border bg-muted/20 p-4">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No logs yet. Start the test to see progress.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded text-xs font-mono",
                      log.phase === 'error' && "bg-destructive/10 text-destructive",
                      log.phase === 'completed' && "bg-green-500/10 text-green-600",
                      log.phase === 'warning' && "bg-yellow-500/10 text-yellow-600",
                      log.phase === 'importing' && "bg-blue-500/10 text-blue-600",
                      log.phase === 'preparing' && "bg-purple-500/10 text-purple-600",
                      log.phase === 'skip' && "bg-gray-500/10 text-gray-600"
                    )}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Strategy Info */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            {selectedStrategy === 'luca' ? 'How Luca Strategy Works' : 'How Incremental Strategy Works'}
          </h4>
          {selectedStrategy === 'luca' ? (
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li><strong>Zero temp_index queries</strong> - hardcoded folder list</li>
              <li>Queries MAX(uid) directly from email_messages (blazing fast)</li>
              <li>Downloads from MAX(uid) + 1 in batches of 25</li>
              <li>Stops after 3 consecutive empty batches</li>
              <li>Starts in ~50ms vs 3-5s of other strategies</li>
              <li>Perfect for automated daily incremental sync</li>
            </ul>
          ) : (
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Uses temp_index to find pending emails</li>
              <li>Queries MAX(uid) from database for each folder</li>
              <li>Downloads from MAX(uid) + 1 in batches of 25</li>
              <li>Stops after 3 consecutive empty batches</li>
              <li>Zero query overhead - starts immediately</li>
              <li>Perfect for daily sync automation</li>
            </ul>
          )}
        </div>

        {/* Last Status */}
        {lastLog && !isRunning && (
          <div className={cn(
            "p-3 rounded-lg text-sm",
            lastLog.phase === 'completed' ? "bg-green-500/10 border border-green-500/20" :
            lastLog.phase === 'error' ? "bg-destructive/10 border border-destructive/20" :
            "bg-muted/30 border"
          )}>
            <div className="font-medium mb-1">Last Status:</div>
            <div className="text-muted-foreground">{lastLog.message}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

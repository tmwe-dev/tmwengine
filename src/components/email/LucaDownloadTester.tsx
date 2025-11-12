/**
 * Luca Download Tester
 * Production download component using LucaStrategy
 * Zero overhead, direct download from MAX(uid) + 1
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rocket, StopCircle, RotateCcw, Zap, ArrowRight } from 'lucide-react';
import { useEmailDownload } from '@/hooks/useEmailDownload';
import { cn } from '@/lib/utils';

export const LucaDownloadTester = () => {
  const [testRunning, setTestRunning] = useState(false);

  // ✅ Uses LucaStrategy as default
  const {
    isRunning,
    logs,
    progress,
    start,
    stop,
    reset
  } = useEmailDownload(); // Default = 'luca'

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
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Luca Method - Production Download
            </CardTitle>
            <CardDescription>
              Zero overhead, direct download from MAX(uid) + 1 - Production download strategy
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            {!isRunning ? (
              <>
                <Button
                  onClick={handleStart}
                  disabled={testRunning}
                  className="gap-2"
                  size="lg"
                >
                  <Rocket className="h-4 w-4" />
                  Start Download
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
                size="lg"
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
                No logs yet. Start the download to see progress.
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

        {/* Strategy Info Card */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm">📋 Luca Method - How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              <li>• <strong>Zero overhead:</strong> No preliminary queries on email_temp_index</li>
              <li>• <strong>Hardcoded folders:</strong> ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk', 'Archive']</li>
              <li>• <strong>Fast MAX query:</strong> Single query on email_messages (~50ms)</li>
              <li>• <strong>Direct download:</strong> Starts from MAX(uid) + 1 in batches of 25</li>
              <li>• <strong>Smart stop:</strong> Stops after 3 consecutive empty batches</li>
              <li>• <strong>Performance:</strong> 10x faster preparation than index-based strategies</li>
              <li>• <strong>Ideal for:</strong> Daily incremental sync, fast downloads, production use</li>
            </ul>
          </CardContent>
        </Card>

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

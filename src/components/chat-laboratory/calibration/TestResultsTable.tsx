import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

interface TestResult {
  id: string;
  timestamp: string;
  turnStrategy: string;
  pauseBetweenTurns: number;
  enableDirectCalls: boolean;
  selectedAgent: string;
  responseTime: number;
  tokensInput: number;
  tokensOutput: number;
  success: boolean;
  errorMessage?: string;
  
  // 🆕 DATI TECNICI ORCHESTRAZIONE
  provider?: string;
  aiLatencyMs?: number;
  directCallDetected?: boolean;
  economyMode?: boolean;
  selectedScore?: number;
  allScores?: Array<{
    agent: string;
    score: number;
    expertise: number;
    gapPenalty: number;
  }>;
}

interface TestResultsTableProps {
  results: TestResult[];
}

export function TestResultsTable({ results }: TestResultsTableProps) {
  const formatTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('it-IT');
  };

  const getStrategyBadge = (strategy: string) => {
    return strategy === 'RANDOM_30' ? (
      <Badge variant="secondary">R30</Badge>
    ) : (
      <Badge variant="default">SMART</Badge>
    );
  };

  const getProviderBadge = (provider?: string) => {
    if (!provider || provider === 'unknown') return <Badge variant="outline">N/A</Badge>;
    
    const colors: Record<string, string> = {
      claude: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      anthropic: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      openai: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      chatgpt: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      gemini: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      google: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    };
    
    return (
      <Badge variant="outline" className={colors[provider.toLowerCase()] || ''}>
        {provider}
      </Badge>
    );
  };

  const fastestTest = results.reduce((fastest, current) => {
    if (!fastest || (current.success && current.responseTime < fastest.responseTime)) {
      return current;
    }
    return fastest;
  }, null as TestResult | null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Risultati Test
          {results.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              {results.length} test
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessun test eseguito ancora</p>
            <p className="text-sm mt-1">Avvia un test per vedere i risultati qui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ora</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>AI Latency</TableHead>
                  <TableHead>Overhead</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Direct</TableHead>
                  <TableHead>Economy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => {
                  const overhead = result.responseTime - (result.aiLatencyMs || result.responseTime);
                  const totalTokens = result.tokensInput + result.tokensOutput;
                  
                  return (
                    <TableRow key={result.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimestamp(result.timestamp)}
                      </TableCell>
                      <TableCell>{getStrategyBadge(result.turnStrategy)}</TableCell>
                      <TableCell className="font-medium">{result.selectedAgent}</TableCell>
                      <TableCell>{getProviderBadge(result.provider)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatTime(result.aiLatencyMs || result.responseTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {overhead > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            +{formatTime(overhead)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="text-muted-foreground">{result.tokensInput}</span>
                          <span className="mx-1">/</span>
                          <span className="text-muted-foreground">{result.tokensOutput}</span>
                          <span className="ml-1 font-medium">({totalTokens})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.selectedScore !== undefined ? (
                          <span className="text-sm font-mono">{result.selectedScore.toFixed(1)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.directCallDetected !== undefined ? (
                          <Badge variant={result.directCallDetected ? "default" : "secondary"} className="text-xs">
                            {result.directCallDetected ? 'SI' : 'NO'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.economyMode !== undefined ? (
                          <Badge variant={result.economyMode ? "default" : "outline"} className="text-xs">
                            {result.economyMode ? 'ON' : 'OFF'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.success ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            ERR
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {fastestTest?.id === result.id && result.success && (
                          <span className="text-xl" title="Test più veloce">
                            🏆
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

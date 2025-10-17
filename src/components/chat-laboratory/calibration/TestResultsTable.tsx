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
                  <TableHead>Tempo</TableHead>
                  <TableHead>Token In</TableHead>
                  <TableHead>Token Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(result.timestamp)}
                    </TableCell>
                    <TableCell>{getStrategyBadge(result.turnStrategy)}</TableCell>
                    <TableCell className="font-medium">{result.selectedAgent}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(result.responseTime)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {result.tokensInput}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {result.tokensOutput}
                    </TableCell>
                    <TableCell>
                      {result.success ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Error
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

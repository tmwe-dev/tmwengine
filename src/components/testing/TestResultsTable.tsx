import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Trophy } from 'lucide-react';
import type { TestResult } from '@/lib/testing/test-types';

interface TestResultsTableProps {
  results: TestResult[];
}

export const TestResultsTable = ({ results }: TestResultsTableProps) => {
  const fastestTest = results
    .filter(r => r.status !== 'error')
    .reduce((fastest, current) => 
      current.execution_time_ms < fastest.execution_time_ms ? current : fastest
    , results[0]);
  
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'slow':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };
  
  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />OK</Badge>;
      case 'slow':
        return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" />Lento</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Errore</Badge>;
    }
  };
  
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Test</TableHead>
            <TableHead className="text-right">Tempo</TableHead>
            <TableHead className="text-right">Atteso</TableHead>
            <TableHead className="text-right">Delta</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">🏆</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <div>
                    <div>{result.test_name}</div>
                    {result.metadata?.description && (
                      <div className="text-xs text-muted-foreground">
                        {result.metadata.description}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {result.execution_time_ms}ms
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {result.expected_time_ms}ms
              </TableCell>
              <TableCell className="text-right font-mono">
                <span className={
                  result.delta_ms > result.expected_time_ms * 0.5 
                    ? 'text-destructive' 
                    : result.delta_ms > 0 
                    ? 'text-warning' 
                    : 'text-success'
                }>
                  {result.delta_ms > 0 ? '+' : ''}{result.delta_ms}ms
                </span>
              </TableCell>
              <TableCell>
                {getStatusBadge(result.status)}
              </TableCell>
              <TableCell className="text-center">
                {result.test_name === fastestTest?.test_name && result.status !== 'error' && (
                  <Trophy className="h-4 w-4 text-yellow-500 mx-auto" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

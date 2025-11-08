/**
 * Comparison Table - Tabella comparativa risultati test
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import type { TestResult } from '@/lib/email-testing-utils';

interface ComparisonTableProps {
  results: TestResult[];
}

export function ComparisonTable({ results }: ComparisonTableProps) {
  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      idle: { variant: 'secondary' as const, text: 'Idle', icon: '⏸️' },
      running: { variant: 'default' as const, text: 'Running', icon: '⏳' },
      success: { variant: 'outline' as const, text: 'Success', icon: '✅' },
      error: { variant: 'destructive' as const, text: 'Error', icon: '❌' },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant}>
        {config.icon} {config.text}
      </Badge>
    );
  };

  const getBestMethod = () => {
    const successfulTests = results.filter(r => r.status === 'success');
    if (successfulTests.length === 0) return null;
    
    return successfulTests.reduce((best, current) => {
      if (current.duration < best.duration && current.failed < best.failed) {
        return current;
      }
      return best;
    });
  };

  const bestMethod = getBestMethod();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          📊 Confronto Real-Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Metodo</th>
                <th className="text-left py-3 px-4 font-semibold">Downloaded</th>
                <th className="text-left py-3 px-4 font-semibold">Failed</th>
                <th className="text-left py-3 px-4 font-semibold">Duration</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const isBest = bestMethod?.method === result.method;
                return (
                  <tr 
                    key={result.method} 
                    className={`border-b ${isBest ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                  >
                    <td className="py-3 px-4 font-medium">
                      {result.method}
                      {isBest && (
                        <Badge variant="outline" className="ml-2 text-green-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Best
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">{result.downloaded}</td>
                    <td className="py-3 px-4">
                      {result.failed > 0 ? (
                        <span className="text-destructive font-medium">
                          {result.failed}
                        </span>
                      ) : (
                        result.failed
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {result.duration > 0 ? `${result.duration}s` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(result.status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {bestMethod && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 mt-0.5 text-green-600" />
              <div className="text-sm">
                <span className="font-semibold text-green-700 dark:text-green-400">
                  {bestMethod.method}
                </span>
                <span className="text-muted-foreground">
                  {' '}è attualmente il metodo più veloce e affidabile ({bestMethod.duration}s, {bestMethod.failed} errori)
                </span>
              </div>
            </div>
          </div>
        )}

        {results.some(r => r.failed > 0) && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600" />
              <span className="text-sm text-muted-foreground">
                Alcuni metodi hanno riscontrato errori. Verifica i log per dettagli.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

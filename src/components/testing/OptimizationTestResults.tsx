import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface TestResult {
  configName: string;
  responseTime: number;
  isBaseline?: boolean;
  flags: {
    enableLogging: boolean;
    useDoubleSerializat: boolean;
    useSequentialExecution: boolean;
    useTextResponse: boolean;
    benchmarkDelay: number;
  };
}

interface OptimizationTestResultsProps {
  results: TestResult[];
}

export const OptimizationTestResults = ({ results }: OptimizationTestResultsProps) => {
  if (results.length === 0) return null;

  const baseline = results.find(r => r.isBaseline);
  const baselineTime = baseline?.responseTime || results[0]?.responseTime || 1000;

  const chartData = results.map((r) => ({
    name: r.configName.substring(0, 25) + (r.configName.length > 25 ? '...' : ''),
    time: r.responseTime,
    improvement: ((baselineTime - r.responseTime) / baselineTime * 100).toFixed(1),
    isBaseline: r.isBaseline,
    fullName: r.configName
  }));

  const getBarColor = (entry: typeof chartData[0]) => {
    if (entry.isBaseline) return '#6b7280'; // Grigio per baseline
    const improvement = parseFloat(entry.improvement);
    if (improvement > 20) return '#10b981'; // Verde per ottimo
    if (improvement > 10) return '#3b82f6'; // Blu per buono
    if (improvement > 0) return '#f59e0b'; // Arancione per moderato
    return '#ef4444'; // Rosso per peggioramento
  };

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
          <CardDescription>
            Baseline: {baselineTime.toFixed(0)}ms - Confronto ottimizzazioni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">{data.fullName}</p>
                          <p className="text-sm">Tempo: <span className="font-bold">{data.time}ms</span></p>
                          <p className="text-sm">
                            Miglioramento: 
                            <span className={`font-bold ml-1 ${parseFloat(data.improvement) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {data.improvement}%
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="time" name="Response Time (ms)">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Configuration</th>
                  <th className="text-right p-2">Time (ms)</th>
                  <th className="text-right p-2">vs Baseline</th>
                  <th className="text-left p-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => {
                  const improvement = ((baselineTime - result.responseTime) / baselineTime * 100);
                  return (
                    <tr key={idx} className={`border-b ${result.isBaseline ? 'bg-muted/30' : ''}`}>
                      <td className="p-2 font-medium">
                        {result.configName}
                        {result.isBaseline && <Badge variant="outline" className="ml-2">Baseline</Badge>}
                      </td>
                      <td className="text-right p-2 font-mono">{result.responseTime.toFixed(0)}ms</td>
                      <td className="text-right p-2">
                        <div className="flex items-center justify-end gap-1">
                          {improvement > 0 ? (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          )}
                          <span className={improvement > 0 ? 'text-green-500' : 'text-red-500'}>
                            {improvement > 0 ? '-' : '+'}{Math.abs(improvement).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {result.flags.enableLogging && <Badge variant="secondary" className="text-xs">🪵</Badge>}
                          {result.flags.useDoubleSerializat && <Badge variant="secondary" className="text-xs">📦</Badge>}
                          {result.flags.useSequentialExecution && <Badge variant="secondary" className="text-xs">⚡Seq</Badge>}
                          {result.flags.useTextResponse && <Badge variant="secondary" className="text-xs">⏱️</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

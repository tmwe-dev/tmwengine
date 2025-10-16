import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { TestResult } from '@/lib/testing/test-types';

interface PerformanceChartProps {
  results: TestResult[];
}

export const PerformanceChart = ({ results }: PerformanceChartProps) => {
  const chartData = results.map(r => ({
    name: r.test_name.substring(0, 30) + (r.test_name.length > 30 ? '...' : ''),
    time: r.execution_time_ms,
    expected: r.expected_time_ms,
    status: r.status
  }));
  
  const getBarColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'hsl(var(--success))';
      case 'slow':
        return 'hsl(var(--warning))';
      case 'error':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--primary))';
    }
  };
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 11 }}
        />
        <YAxis 
          label={{ value: 'Tempo (ms)', angle: -90, position: 'insideLeft' }}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value: number, name: string) => [
            `${value}ms`,
            name === 'time' ? 'Tempo effettivo' : 'Tempo atteso'
          ]}
        />
        <ReferenceLine 
          y={0} 
          stroke="hsl(var(--border))" 
          strokeDasharray="3 3"
        />
        <Bar dataKey="time" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
          ))}
        </Bar>
        <Bar dataKey="expected" fill="hsl(var(--muted))" opacity={0.3} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

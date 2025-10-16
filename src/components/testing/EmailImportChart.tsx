import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface EmailResult {
  uid: string;
  subject: string;
  from: string;
  date: string;
  downloadTime: number;
  batchSize: number;
  success: boolean;
  error?: string;
}

interface EmailImportChartProps {
  results: EmailResult[];
}

export function EmailImportChart({ results }: EmailImportChartProps) {
  // Calcola tempo medio per email nel tempo (mostra trend)
  const progressData = results.map((result, index) => ({
    index: index + 1,
    time: result.downloadTime,
    avgTime: results.slice(0, index + 1).reduce((sum, r) => sum + r.downloadTime, 0) / (index + 1)
  }));

  // Raggruppa per batch size (se l'utente testa più batch size)
  const batchSizeData = results.reduce((acc, result) => {
    const key = `${result.batchSize}`;
    if (!acc[key]) {
      acc[key] = { batchSize: result.batchSize, times: [] };
    }
    acc[key].times.push(result.downloadTime);
    return acc;
  }, {} as Record<string, { batchSize: number; times: number[] }>);

  const batchSizeAvgData = Object.values(batchSizeData).map(item => ({
    batchSize: item.batchSize,
    avgTime: item.times.reduce((sum, t) => sum + t, 0) / item.times.length
  }));

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Tempo di Download Progressivo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="index" 
                label={{ value: 'Email #', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Tempo (ms)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(0)}ms`}
                labelFormatter={(label) => `Email #${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="time" 
                stroke="hsl(var(--primary))" 
                name="Tempo singola email"
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="avgTime" 
                stroke="hsl(var(--accent))" 
                name="Tempo medio"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {batchSizeAvgData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Tempo Medio per Batch Size</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={batchSizeAvgData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="batchSize" 
                  label={{ value: 'Batch Size', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Tempo Medio (ms)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(0)}ms`}
                  labelFormatter={(label) => `Batch: ${label} email`}
                />
                <Bar 
                  dataKey="avgTime" 
                  fill="hsl(var(--primary))" 
                  name="Tempo medio"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

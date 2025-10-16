import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, CheckCircle2, Loader2 } from 'lucide-react';

interface BenchmarkData {
  id: string;
  category: string;
  suite_name?: string;
  avg_response_time_ms: number;
  results: unknown;
  created_at: string;
}

export const OptimizationDashboard = () => {
  const [optimizationData, setOptimizationData] = useState<BenchmarkData[]>([]);
  const [performanceData, setPerformanceData] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carica dati Optimization A/B
      const { data: optData } = await supabase
        .from('tmwe_api_benchmark_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'optimization_ab_test')
        .order('created_at', { ascending: false })
        .limit(1);

      // Carica dati Performance
      const { data: perfData } = await supabase
        .from('tmwe_api_benchmark_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'Performance')
        .order('created_at', { ascending: false })
        .limit(5);

      setOptimizationData((optData || []) as BenchmarkData[]);
      setPerformanceData((perfData || []) as BenchmarkData[]);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const latestOptimization = optimizationData[0];
  const recommendations = generateRecommendations(latestOptimization, performanceData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Confronto Optimization A/B vs Performance</CardTitle>
          <CardDescription>
            Analisi impatto ottimizzazioni sulle suite Performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.chartData.length > 0 ? (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recommendations.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="suite" angle={-45} textAnchor="end" height={100} />
                  <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="baseline" name="Baseline" fill="#6b7280" />
                  <Bar dataKey="optimized" name="Optimized" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Esegui prima i test Optimization A/B per vedere i dati comparativi</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raccomandazioni */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Raccomandazioni Personalizzate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.items.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 border rounded-lg">
                {rec.impact === 'high' && <TrendingDown className="h-5 w-5 text-green-500 mt-0.5" />}
                {rec.impact === 'medium' && <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />}
                {rec.impact !== 'high' && rec.impact !== 'medium' && <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                <div className="flex-1">
                  <h4 className="font-semibold">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={rec.impact === 'high' ? 'default' : 'secondary'}>
                      {rec.impact === 'high' ? 'Alto Impatto' : rec.impact === 'medium' ? 'Medio Impatto' : 'Basso Impatto'}
                    </Badge>
                    <Badge variant="outline">{rec.improvement}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function generateRecommendations(optData: BenchmarkData | undefined, perfData: BenchmarkData[]) {
  const chartData: any[] = [];
  
  if (optData?.results && typeof optData.results === 'object' && Array.isArray(optData.results)) {
    // Prendi baseline e migliore ottimizzazione
    const results = optData.results as any[];
    const baseline = results.find(r => r.variant_name?.includes('Baseline'));
    const bestOpt = results.filter(r => !r.variant_name?.includes('Baseline'))
      .sort((a, b) => a.response_time_ms - b.response_time_ms)[0];
    
    if (baseline && bestOpt) {
      chartData.push({
        suite: 'Batch Operations',
        baseline: baseline.response_time_ms,
        optimized: bestOpt.response_time_ms
      });
    }
  }

  return {
    chartData,
    items: [
      {
        title: '🚀 Batch Operations: Usa Parallel Execution',
        description: 'Per Delete Messages e Move Messages (>10 msg), useSequentialExecution: false riduce i tempi del 60-80%',
        impact: 'high' as const,
        improvement: '-60-80%'
      },
      {
        title: '🧩 Batch Grandi: Abilita Chunking',
        description: 'Per batch >20 messaggi, useBatchParallelization evita timeout del server',
        impact: 'high' as const,
        improvement: '-30-50%'
      },
      {
        title: '⚡ Get Folders: Disabilita Logging',
        description: 'enableLogging: false su get_folders risparmia 5-15ms per chiamata',
        impact: 'medium' as const,
        improvement: '-5-15%'
      },
      {
        title: '📦 Response Processing: Usa .json() Diretto',
        description: 'useTextResponse: false evita doppia serializzazione, risparmia 15-30ms',
        impact: 'medium' as const,
        improvement: '-15-30%'
      }
    ]
  };
}

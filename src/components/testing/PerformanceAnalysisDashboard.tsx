/**
 * 📊 Performance Analysis Dashboard
 * 
 * Visualizza l'analisi dei risultati dei test e le configurazioni ottimali
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  analyzePerformanceResults, 
  exportOptimalConfig, 
  printPerformanceReport,
  type PerformanceAnalysis 
} from '@/lib/performance-config-optimizer';
import { Download, RefreshCw, TrendingUp, AlertCircle, CheckCircle, Zap } from 'lucide-react';

export function PerformanceAnalysisDashboard() {
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = () => {
    setLoading(true);
    const result = analyzePerformanceResults();
    if (result) {
      setAnalysis(result);
      printPerformanceReport(result);
    }
    setLoading(false);
  };

  const handleExportConfig = () => {
    if (!analysis) return;
    
    const configCode = exportOptimalConfig(analysis);
    const blob = new Blob([configCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimal-email-config-${Date.now()}.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Analyzing test results...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Performance Analysis</CardTitle>
          <CardDescription>No test results found</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              Run the Complete Test Suite first to generate performance analysis.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Degraded</Badge>;
      case 'critical':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default" className="bg-green-600">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📊 Performance Analysis Dashboard</CardTitle>
              <CardDescription>
                Analysis from {analysis.totalTestsRun} tests run on {analysis.testDate}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadAnalysis} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExportConfig} variant="default" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Config
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Overall Success Rate</p>
              <p className="text-2xl font-bold">{analysis.overallSuccessRate}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tests Run</p>
              <p className="text-2xl font-bold">{analysis.totalTestsRun}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IMAP Health */}
      {analysis.imapHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              IMAP Health Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                {getHealthBadge(analysis.imapHealth.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Connection Time</span>
                <span className="font-mono text-sm">{analysis.imapHealth.avgConnectionTime}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Retrieval Time</span>
                <span className="font-mono text-sm">{analysis.imapHealth.avgRetrievalTime}ms</span>
              </div>
              {analysis.imapHealth.issues.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Issues Detected</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 mt-2">
                      {analysis.imapHealth.issues.map((issue, idx) => (
                        <li key={idx} className="text-xs">{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata Insight */}
      {analysis.metadataInsight && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Metadata vs Full Body Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Speedup Factor</span>
                <Badge variant="default" className="bg-green-600">
                  {analysis.metadataInsight.speedupFactor.toFixed(2)}x faster
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Recommendation</span>
                <Badge variant="secondary">{analysis.metadataInsight.recommendation}</Badge>
              </div>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {analysis.metadataInsight.notes}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimal Folder Configs */}
      <Card>
        <CardHeader>
          <CardTitle>📁 Optimal Folder Configurations</CardTitle>
          <CardDescription>
            Configurations generated from test results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analysis.folderConfigs).map(([folder, config]) => (
              <div key={folder} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{folder}</h4>
                  {getConfidenceBadge(config.confidence)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Batch Size:</span>
                    <span className="ml-2 font-mono">{config.batchSize}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parallel Batches:</span>
                    <span className="ml-2 font-mono">{config.parallelBatches}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timeout:</span>
                    <span className="ml-2 font-mono">{config.timeout}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Retries:</span>
                    <span className="ml-2 font-mono">{config.maxRetries}</span>
                  </div>
                </div>
                {config.notes.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    {config.notes.map((note, idx) => (
                      <div key={idx}>{note}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-muted-foreground">{idx + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Play, Download, Lightbulb } from 'lucide-react';
import { TestRunner } from '@/lib/testing/test-runner';
import { databaseTestSuites } from '@/lib/testing/database-tests';
import { TestSuiteSelector } from '@/components/testing/TestSuiteSelector';
import { TestResultsTable } from '@/components/testing/TestResultsTable';
import { PerformanceChart } from '@/components/testing/PerformanceChart';
import type { TestResult } from '@/lib/testing/test-types';

export const DatabaseRelationsTester = () => {
  const [selectedSuite, setSelectedSuite] = useState(databaseTestSuites[0]?.name || '');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  
  const runner = new TestRunner();
  
  const handleRunTests = async () => {
    const suite = databaseTestSuites.find(s => s.name === selectedSuite);
    if (!suite) return;
    
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setRecommendations([]);
    
    const result = await runner.runTestSuite(
      suite.name,
      suite.tests,
      (current, total) => {
        setProgress((current / total) * 100);
      }
    );
    
    setResults(result.results);
    setRecommendations(runner.generateRecommendations(result.results));
    setIsRunning(false);
  };
  
  const handleExport = () => {
    const suite = databaseTestSuites.find(s => s.name === selectedSuite);
    const report = {
      suite: suite?.name,
      timestamp: new Date().toISOString(),
      results,
      recommendations,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'success').length,
        slow: results.filter(r => r.status === 'slow').length,
        failed: results.filter(r => r.status === 'error').length
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-test-report-${Date.now()}.json`;
    a.click();
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Relations Performance Testing
          </CardTitle>
          <CardDescription>
            Test performance relazioni tra tabelle: Rubrica, Attività, Import, User Assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TestSuiteSelector
            suites={databaseTestSuites}
            selectedSuite={selectedSuite}
            onSuiteChange={setSelectedSuite}
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleRunTests}
              disabled={isRunning}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Test in corso...' : 'Esegui Test Suite'}
            </Button>
            
            {results.length > 0 && (
              <Button
                onClick={handleExport}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Esporta Report
              </Button>
            )}
          </div>
          
          {isRunning && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}% completato
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {results.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Risultati Test</CardTitle>
              <CardDescription>
                {results.filter(r => r.status === 'success').length} successi, {' '}
                {results.filter(r => r.status === 'slow').length} lenti, {' '}
                {results.filter(r => r.status === 'error').length} errori
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestResultsTable results={results} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Grafico Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart results={results} />
            </CardContent>
          </Card>
          
          {recommendations.length > 0 && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Raccomandazioni:</div>
                <ul className="space-y-1">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
};

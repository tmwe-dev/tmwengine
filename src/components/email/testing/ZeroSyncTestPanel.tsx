/**
 * Zero-Sync Test Panel
 * Panel de pruebas automatizadas para verificar arquitectura Zero-Sync
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Play,
  RefreshCw,
  Database,
  Cloud,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { analyzeSenders } from '@/lib/email-sender-analyzer';
import { useUserEmail } from '@/hooks/useUserEmail';
import { toast } from 'sonner';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  duration?: number;
  message?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
}

export function ZeroSyncTestPanel() {
  const { data: userEmail } = useUserEmail();
  const [isRunning, setIsRunning] = useState(false);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  // ========== TEST 1: API Connection ==========
  const testApiConnection = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const response = await emailSearchApi.getFolders();
      const duration = Date.now() - startTime;

      if (response?.data?.length > 0) {
        return {
          id: 'api-connection',
          name: 'API Connection',
          status: 'passed',
          duration,
          message: `✅ Connected - ${response.data.length} folders found`,
          details: { folders: response.data.length }
        };
      } else {
        return {
          id: 'api-connection',
          name: 'API Connection',
          status: 'warning',
          duration,
          message: '⚠️ Connected but no folders found',
          details: response
        };
      }
    } catch (error: any) {
      return {
        id: 'api-connection',
        name: 'API Connection',
        status: 'failed',
        duration: Date.now() - startTime,
        message: `❌ Connection failed: ${error.message}`,
        details: error
      };
    }
  };

  // ========== TEST 2: Email List API vs DB ==========
  const testEmailListComparison = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      // Get data from API
      const apiResponse = await emailSearchApi.getEmailsMetadata({
        folder: 'INBOX',
        page: 1,
        limit: 100,
      });

      // Get data from local DB
      const { count: dbCount } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', 'INBOX');

      const duration = Date.now() - startTime;
      const apiCount = apiResponse?.emails?.length || 0;

      // Zero-Sync should use API, DB is just legacy
      if (apiCount > 0) {
        return {
          id: 'email-list',
          name: 'Email List (API vs DB)',
          status: 'passed',
          duration,
          message: `✅ API: ${apiCount} emails | DB: ${dbCount || 0} emails (legacy)`,
          details: { 
            api_count: apiCount, 
            db_count: dbCount,
            ratio: dbCount ? (apiCount / dbCount * 100).toFixed(1) + '%' : 'N/A'
          }
        };
      } else {
        return {
          id: 'email-list',
          name: 'Email List (API vs DB)',
          status: 'failed',
          duration,
          message: '❌ API returned 0 emails',
          details: { api_count: 0, db_count: dbCount }
        };
      }
    } catch (error: any) {
      return {
        id: 'email-list',
        name: 'Email List (API vs DB)',
        status: 'failed',
        duration: Date.now() - startTime,
        message: `❌ Test failed: ${error.message}`,
        details: error
      };
    }
  };

  // ========== TEST 3: Folder Stats ==========
  const testFolderStats = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const response = await emailSearchApi.getStatistics({ folder: 'INBOX' });
      const duration = Date.now() - startTime;

      if (response?.data) {
        const stats = response.data;
        return {
          id: 'folder-stats',
          name: 'Folder Statistics',
          status: 'passed',
          duration,
          message: `✅ Total: ${stats.total || 0} | Unread: ${stats.unread || 0}`,
          details: stats
        };
      } else {
        return {
          id: 'folder-stats',
          name: 'Folder Statistics',
          status: 'warning',
          duration,
          message: '⚠️ Stats returned but empty',
          details: response
        };
      }
    } catch (error: any) {
      return {
        id: 'folder-stats',
        name: 'Folder Statistics',
        status: 'failed',
        duration: Date.now() - startTime,
        message: `❌ Stats failed: ${error.message}`,
        details: error
      };
    }
  };

  // ========== TEST 4: Sender Analysis ==========
  const testSenderAnalysis = async (): Promise<TestResult> => {
    const startTime = Date.now();
    if (!userEmail) {
      return {
        id: 'sender-analysis',
        name: 'Sender Analysis',
        status: 'failed',
        duration: 0,
        message: '❌ User email not configured'
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const analysis = await analyzeSenders(userEmail, user.id);
      const duration = Date.now() - startTime;

      const classified = analysis.filter(s => s.isClassified).length;
      const unclassified = analysis.filter(s => !s.isClassified).length;

      return {
        id: 'sender-analysis',
        name: 'Sender Analysis',
        status: 'passed',
        duration,
        message: `✅ Total: ${analysis.length} | Classified: ${classified} | Unclassified: ${unclassified}`,
        details: {
          total_senders: analysis.length,
          classified,
          unclassified,
          classification_rate: ((classified / analysis.length) * 100).toFixed(1) + '%'
        }
      };
    } catch (error: any) {
      return {
        id: 'sender-analysis',
        name: 'Sender Analysis',
        status: 'failed',
        duration: Date.now() - startTime,
        message: `❌ Analysis failed: ${error.message}`,
        details: error
      };
    }
  };

  // ========== TEST 5: Classification with tmwe_email_id ==========
  const testClassificationMetadata = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      // Check if email_ai_classifications uses tmwe_email_id
      const { data: recentClassifications, error } = await supabase
        .from('email_ai_classifications')
        .select('tmwe_email_id, email_id, sender_email, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const duration = Date.now() - startTime;
      const withTmweId = recentClassifications?.filter(c => c.tmwe_email_id !== null).length || 0;
      const total = recentClassifications?.length || 0;

      if (total === 0) {
        return {
          id: 'classification-metadata',
          name: 'Classification Metadata',
          status: 'warning',
          duration,
          message: '⚠️ No classifications found yet',
          details: { total: 0 }
        };
      }

      if (withTmweId === total) {
        return {
          id: 'classification-metadata',
          name: 'Classification Metadata',
          status: 'passed',
          duration,
          message: `✅ All ${total} recent classifications use tmwe_email_id`,
          details: { with_tmwe_id: withTmweId, total }
        };
      } else {
        return {
          id: 'classification-metadata',
          name: 'Classification Metadata',
          status: 'warning',
          duration,
          message: `⚠️ Only ${withTmweId}/${total} use tmwe_email_id`,
          details: { with_tmwe_id: withTmweId, total }
        };
      }
    } catch (error: any) {
      return {
        id: 'classification-metadata',
        name: 'Classification Metadata',
        status: 'failed',
        duration: Date.now() - startTime,
        message: `❌ Test failed: ${error.message}`,
        details: error
      };
    }
  };

  // ========== TEST 6: API Performance ==========
  const testApiPerformance = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const response = await emailSearchApi.getEmailsMetadata({
        folder: 'INBOX',
        page: 1,
        limit: 30,
      });

      const duration = Date.now() - startTime;
      const emailCount = response?.emails?.length || 0;

      let status: 'passed' | 'warning' | 'failed' = 'passed';
      let message = `✅ Loaded ${emailCount} emails in ${duration}ms`;

      if (duration > 5000) {
        status = 'warning';
        message = `⚠️ Slow: ${emailCount} emails in ${duration}ms (>5s)`;
      } else if (duration > 10000) {
        status = 'failed';
        message = `❌ Too slow: ${emailCount} emails in ${duration}ms (>10s)`;
      }

      return {
        id: 'api-performance',
        name: 'API Performance',
        status,
        duration,
        message,
        details: { email_count: emailCount, load_time_ms: duration }
      };
    } catch (error: any) {
      return {
        id: 'api-performance',
        name: 'API Performance',
        status: 'failed',
        duration: Date.now() - startTime,
        message: `❌ Performance test failed: ${error.message}`,
        details: error
      };
    }
  };

  // ========== RUN ALL TESTS ==========
  const runAllTests = async () => {
    setIsRunning(true);
    setTestSuites([]);
    
    const suite: TestSuite = {
      name: 'Zero-Sync Architecture Tests',
      description: 'Verificación completa de integración TMWE API',
      tests: [],
      totalTests: 6,
      passed: 0,
      failed: 0,
      warnings: 0
    };

    const tests = [
      { name: 'API Connection', fn: testApiConnection },
      { name: 'Email List Comparison', fn: testEmailListComparison },
      { name: 'Folder Statistics', fn: testFolderStats },
      { name: 'Sender Analysis', fn: testSenderAnalysis },
      { name: 'Classification Metadata', fn: testClassificationMetadata },
      { name: 'API Performance', fn: testApiPerformance },
    ];

    for (const test of tests) {
      setCurrentTest(test.name);
      const result = await test.fn();
      suite.tests.push(result);

      if (result.status === 'passed') suite.passed++;
      else if (result.status === 'failed') suite.failed++;
      else if (result.status === 'warning') suite.warnings++;

      setTestSuites([{ ...suite }]);
    }

    setCurrentTest('');
    setIsRunning(false);

    if (suite.failed === 0) {
      toast.success(`✅ Tests completados: ${suite.passed} passed, ${suite.warnings} warnings`);
    } else {
      toast.error(`❌ Tests completados: ${suite.failed} failed`);
    }
  };

  // ========== EXPORT RESULTS ==========
  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      user_email: userEmail,
      test_suites: testSuites,
      summary: {
        total_tests: testSuites.reduce((acc, s) => acc + s.totalTests, 0),
        passed: testSuites.reduce((acc, s) => acc + s.passed, 0),
        failed: testSuites.reduce((acc, s) => acc + s.failed, 0),
        warnings: testSuites.reduce((acc, s) => acc + s.warnings, 0),
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zero-sync-test-report-${Date.now()}.json`;
    a.click();
    toast.success('📥 Reporte exportado');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants: Record<TestResult['status'], any> = {
      passed: 'default',
      failed: 'destructive',
      warning: 'secondary',
      running: 'outline',
      pending: 'outline'
    };
    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Zero-Sync Architecture Tests</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Verificación de integración 100% TMWE API
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {testSuites.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportResults}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Reporte
                </Button>
              )}
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Ejecutar Tests
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Test */}
      {isRunning && currentTest && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              <div>
                <p className="font-medium">Ejecutando: {currentTest}</p>
                <p className="text-sm text-muted-foreground">Por favor espera...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testSuites.map((suite, suiteIdx) => (
        <Card key={suiteIdx}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{suite.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {suite.description}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{suite.passed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{suite.warnings}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">{suite.failed}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="results">
                  <Cloud className="h-4 w-4 mr-2" />
                  Resultados
                </TabsTrigger>
                <TabsTrigger value="details">
                  <Database className="h-4 w-4 mr-2" />
                  Detalles
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="space-y-3 mt-4">
                {suite.tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <p className="font-medium">{test.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {test.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {test.duration && (
                        <span className="text-sm text-muted-foreground">
                          {test.duration}ms
                        </span>
                      )}
                      {getStatusBadge(test.status)}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <div className="space-y-4">
                  {suite.tests.map((test) => (
                    <div key={test.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{test.name}</p>
                        {getStatusBadge(test.status)}
                      </div>
                      {test.details && (
                        <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}

      {/* Architecture Info */}
      {testSuites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arquitectura Zero-Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Cloud className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Fuente de Datos: TMWE API</p>
                <p className="text-sm text-muted-foreground">
                  Todos los emails se leen directamente desde el API, sin sincronización local
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Base de Datos Local: Solo Metadata</p>
                <p className="text-sm text-muted-foreground">
                  Clasificaciones (email_ai_classifications) y reglas (email_sender_rules) 
                  vinculadas por tmwe_email_id
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

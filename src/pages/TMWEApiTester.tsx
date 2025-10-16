import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Play, Copy, ChevronRight, Settings2, BarChart3, Zap, Database, AlertTriangle, TrendingUp, Award, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { OptimizationControls, OptimizationFlags } from '@/components/testing/OptimizationControls';
import { OptimizationTestRunner } from '@/components/testing/OptimizationTestRunner';
import { OptimizationDashboard } from '@/components/testing/OptimizationDashboard';
import { BENCHMARK_SUITES } from '@/lib/testing/benchmark-suites';

// API Configurations
const API_CONFIG = {
  email_message: {
    path: "/app.php?action=email_message",
    handlers: {
      get_messages: { handler: "get_messages", folder: "INBOX", page: 1, per_page: 20 },
      get_message: { handler: "get_message", message_id: "" },
      send_message: { handler: "send_message" },
      mark_as_read: { handler: "mark_as_read", message_id: "" },
      mark_as_unread: { handler: "mark_as_unread", message_id: "" },
      delete_message: { handler: "delete_message", message_id: "" },
      move_message: { handler: "move_message", message_id: "", target_folder: "" }
    }
  },
  email_folder: {
    path: "/app.php?action=email_folder",
    handlers: {
      get_folders: { handler: "get_folders" },
      get_folder_info: { handler: "get_folder_info", folder: "INBOX" },
      create_folder: { handler: "create_folder", folder_name: "" },
      delete_folder: { handler: "delete_folder", folder_name: "" }
    }
  },
  email_account: {
    path: "/app.php?action=email_account",
    handlers: {
      test_connection: { handler: "test_connection" },
      get_account_info: { handler: "get_account_info" },
      get_quota: { handler: "get_quota" }
    }
  },
  email_sync: {
    path: "/app.php?action=email_sync",
    handlers: {
      get_sync_status: { handler: "get_sync_status" }
    }
  }
};

interface TestResult {
  timestamp: string;
  endpoint: string;
  handler: string;
  status: number;
  statusText: string;
  responseTime: number;
  body: any;
  headers: Record<string, string>;
}

interface BenchmarkResult {
  variant: string;
  responseTime: number;
  status: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface BenchmarkSuite {
  name: string;
  category: string;
  description: string;
  variants: {
    name: string;
    endpoint: string;
    data: any;
    optimizationFlags?: Record<string, any>;
  }[];
}

interface BenchmarkSummary {
  suiteName: string;
  category: string;
  totalVariants: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  winner?: {
    variantName: string;
    responseTime: number;
  };
  results: BenchmarkResult[];
}

const BENCHMARK_SUITES: BenchmarkSuite[] = [
  // Example suite - add real suites as needed
  {
    name: "Get Messages - Basic Limits",
    category: "Performance",
    description: "Test different limits for get_messages",
    variants: [
      {
        name: "Limit 5",
        endpoint: API_CONFIG.email_message.path,
        data: { handler: "get_messages", folder: "INBOX", limit: 5, offset: 0 }
      },
      {
        name: "Limit 10",
        endpoint: API_CONFIG.email_message.path,
        data: { handler: "get_messages", folder: "INBOX", limit: 10, offset: 0 }
      },
      {
        name: "Limit 25",
        endpoint: API_CONFIG.email_message.path,
        data: { handler: "get_messages", folder: "INBOX", limit: 25, offset: 0 }
      },
      {
        name: "Limit 50",
        endpoint: API_CONFIG.email_message.path,
        data: { handler: "get_messages", folder: "INBOX", limit: 50, offset: 0 }
      }
    ]
  },
  // Add more suites as needed
];

const TMWEApiTester = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState('email_message');
  const [selectedHandler, setSelectedHandler] = useState('get_messages');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [customData, setCustomData] = useState<string>('');
  
  // Advanced Benchmark States
  const [selectedSuite, setSelectedSuite] = useState<string>(BENCHMARK_SUITES[0]?.name || "");
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [benchmarkDelay, setBenchmarkDelay] = useState(500);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [benchmarkHistory, setBenchmarkHistory] = useState<any[]>([]);
  
  // 🚀 Optimization Testing States
  const [optimizationFlags, setOptimizationFlags] = useState<OptimizationFlags>({
    enableLogging: true,
    useDoubleSerializat: true,
    useSequentialExecution: true,
    useTextResponse: true,
    benchmarkDelay: 500,
    useBatchParallelization: false,
    batchChunkSize: 10,
    useFolderCache: false,
    folderCacheTTL: 60,
    usePaginationCache: false,
    paginationCacheTTL: 60
  });
  const [optimizationResults, setOptimizationResults] = useState<any[]>([]);

  // Effect to update customData when handler changes
  useEffect(() => {
    const endpointConfig = API_CONFIG[selectedEndpoint];
    if (!endpointConfig) return;
    const handlerConfig = endpointConfig.handlers[selectedHandler];
    if (!handlerConfig) return;
    setCustomData(JSON.stringify(handlerConfig, null, 2));
  }, [selectedEndpoint, selectedHandler]);

  const handleEndpointChange = (endpoint: string) => {
    setSelectedEndpoint(endpoint);
    const endpointConfig = API_CONFIG[endpoint];
    if (!endpointConfig) return;
    const firstHandler = Object.keys(endpointConfig.handlers)[0];
    setSelectedHandler(firstHandler);
    const handlerConfig = endpointConfig.handlers[firstHandler];
    setCustomData(JSON.stringify(handlerConfig, null, 2));
  };

  const handleHandlerChange = (handler: string) => {
    setSelectedHandler(handler);
    const endpointConfig = API_CONFIG[selectedEndpoint];
    if (!endpointConfig) return;
    const handlerConfig = endpointConfig.handlers[handler];
    setCustomData(JSON.stringify(handlerConfig, null, 2));
  };

  const getAccessToken = async () => {
    const config = await supabase
      .from('user_tmwe_credentials')
      .select('access_token')
      .single();
    return config.data?.access_token || '';
  };

  const handleExecuteTest = async () => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      const body = JSON.parse(customData);
      const endpoint = API_CONFIG[selectedEndpoint].path;
      const accessToken = await getAccessToken();

      // Use edge function as proxy
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint,
          data: body,
          bearerToken: accessToken
        }
      });

      const responseTime = performance.now() - startTime;

      if (invokeError) {
        throw new Error(invokeError.message || 'Edge function invocation failed');
      }

      const result: TestResult = {
        timestamp: new Date().toISOString(),
        endpoint,
        handler: selectedHandler,
        status: 200,
        statusText: "OK",
        headers: { 'content-type': 'application/json' },
        body: responseData,
        responseTime: Math.round(responseTime),
      };

      setTestResult(result);
      setHistory([result, ...history].slice(0, 10));

      toast.success(`✅ Test completato in ${Math.round(responseTime)}ms`);

    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      const result: TestResult = {
        timestamp: new Date().toISOString(),
        endpoint: API_CONFIG[selectedEndpoint].path,
        handler: selectedHandler,
        status: 0,
        statusText: "Error",
        headers: {},
        body: { error: error.message },
        responseTime: Math.round(responseTime),
      };

      setTestResult(result);
      setHistory([result, ...history].slice(0, 10));

      toast.error(`❌ Errore nel test: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter suites by category
  const filteredSuites = selectedCategory === "all" 
    ? BENCHMARK_SUITES 
    : BENCHMARK_SUITES.filter(s => s.category === selectedCategory);

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(BENCHMARK_SUITES.map(s => s.category)))];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">TMWE API Tester</h1>
        <p className="text-muted-foreground">
          Test e debug delle chiamate API TMWE in tempo reale
        </p>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="standard">
            <Settings2 className="mr-2 h-4 w-4" />
            Standard Testing
          </TabsTrigger>
          <TabsTrigger value="benchmark">
            <BarChart3 className="mr-2 h-4 w-4" />
            Advanced Benchmark
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <Zap className="mr-2 h-4 w-4" />
            Optimization A/B
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <TrendingUp className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Standard Testing Tab */}
        <TabsContent value="standard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Configurazione Test</CardTitle>
                <CardDescription>Seleziona endpoint, handler e parametri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Endpoint</Label>
                  <Select value={selectedEndpoint} onValueChange={handleEndpointChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(API_CONFIG).map((endpoint) => (
                        <SelectItem key={endpoint} value={endpoint}>
                          {endpoint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground font-mono">
                    {API_CONFIG[selectedEndpoint].path}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Handler</Label>
                  <Select value={selectedHandler} onValueChange={handleHandlerChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(API_CONFIG[selectedEndpoint].handlers).map((handler) => (
                        <SelectItem key={handler} value={handler}>
                          {handler}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Request Body (JSON)</Label>
                  <ScrollArea className="h-48 rounded-md border p-2 font-mono text-sm bg-background">
                    <pre>{customData}</pre>
                  </ScrollArea>
                </div>

                <Button 
                  onClick={handleExecuteTest} 
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Play className="mr-2 h-4 w-4 animate-spin" />
                      Esecuzione in corso...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Esegui Test
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Risultati</CardTitle>
                <CardDescription>Response dell'API in tempo reale</CardDescription>
              </CardHeader>
              <CardContent>
                {testResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={testResult.status === 0 ? "bg-destructive" : "bg-green-500"}>
                        {testResult.status === 0 ? 'ERROR' : `${testResult.status} ${testResult.statusText}`}
                      </Badge>
                      <Badge variant="outline">{testResult.responseTime}ms</Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        {testResult.handler}
                      </Badge>
                    </div>

                    {testResult.body?.error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTitle>Errore</AlertTitle>
                        <AlertDescription>{testResult.body.error}</AlertDescription>
                      </Alert>
                    )}

                    <ScrollArea className="h-64 w-full rounded-md border mt-2 p-2 font-mono text-xs bg-background">
                      <pre>{JSON.stringify(testResult.body, null, 2)}</pre>
                    </ScrollArea>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(testResult.body, null, 2));
                        toast.success("Contenuto copiato negli appunti");
                      }}
                    >
                      <Copy className="mr-2 h-3 w-3" />
                      Copia JSON
                    </Button>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nessun test eseguito</p>
                      <p className="text-sm">Clicca "Esegui Test" per iniziare</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Benchmark Tab */}
        <TabsContent value="benchmark" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Suite</CardTitle>
              <CardDescription>Seleziona suite di test automatici</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "all" ? "Tutte le categorie" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Suite di Test</Label>
                <Select value={selectedSuite} onValueChange={setSelectedSuite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSuites.map((suite) => (
                      <SelectItem key={suite.name} value={suite.name}>
                        {suite.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const suite = BENCHMARK_SUITES.find(s => s.name === selectedSuite);
                  return suite ? (
                    <>
                      <p className="text-xs text-muted-foreground">{suite.description}</p>
                      <Badge variant="outline">{suite.variants.length} varianti</Badge>
                      <Badge variant="outline">{suite.category}</Badge>
                    </>
                  ) : null;
                })()}
              </div>

              <div className="space-y-2">
                <Label>Delay tra test (ms): {benchmarkDelay}</Label>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={benchmarkDelay}
                  onChange={(e) => setBenchmarkDelay(parseInt(e.target.value))}
                  disabled={isBenchmarking}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo di attesa tra test per non sovraccaricare il server
                </p>
              </div>

              {(isBenchmarking) && (
                <div className="space-y-2">
                  <Label>Progresso</Label>
                  <Progress value={benchmarkProgress} />
                  <p className="text-xs text-muted-foreground text-center">
                    {Math.round(benchmarkProgress)}%
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    const suite = BENCHMARK_SUITES.find(s => s.name === selectedSuite);
                    if (!suite) return;
                    setIsBenchmarking(true);
                    setBenchmarkResults([]);
                    setBenchmarkProgress(0);

                    const results: BenchmarkResult[] = [];
                    const accessToken = await getAccessToken();

                    for (let i = 0; i < suite.variants.length; i++) {
                      const variant = suite.variants[i];
                      const startTime = performance.now();

                      try {
                        const { data: responseData, error: invokeError } = await supabase.functions.invoke('tmwe-api-proxy', {
                          body: {
                            endpoint: variant.endpoint,
                            data: variant.data,
                            bearerToken: accessToken
                          }
                        });

                        const responseTime = performance.now() - startTime;

                        const result: BenchmarkResult = {
                          timestamp: new Date().toISOString(),
                          endpoint: variant.endpoint,
                          handler: variant.data.handler,
                          status: invokeError ? 0 : 200,
                          success: !invokeError,
                          responseTime: Math.round(responseTime),
                          variant: variant.name,
                          error: invokeError?.message
                        };

                        results.push(result);
                        setBenchmarkResults([...results]);
                      } catch (error: any) {
                        const responseTime = performance.now() - startTime;
                        results.push({
                          timestamp: new Date().toISOString(),
                          endpoint: variant.endpoint,
                          handler: variant.data.handler,
                          status: 0,
                          success: false,
                          responseTime: Math.round(responseTime),
                          variant: variant.name,
                          error: error.message
                        });
                      }

                      setBenchmarkProgress(((i + 1) / suite.variants.length) * 100);

                      if (i < suite.variants.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, benchmarkDelay));
                      }
                    }

                    setIsBenchmarking(false);
                    toast.success(`✅ Benchmark completato: ${results.length} test eseguiti`);
                  }}
                  disabled={isBenchmarking}
                  className="flex-1"
                  size="lg"
                >
                  {isBenchmarking ? (
                    <>
                      <Play className="mr-2 h-4 w-4 animate-spin" />
                      Test in corso...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Esegui Benchmark
                    </>
                  )}
                </Button>
              </div>

              {benchmarkResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Risultati Benchmark</h3>
                  <ScrollArea className="h-64 rounded-md border p-2 font-mono text-xs bg-background">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="p-1">Variante</th>
                          <th className="p-1">Tempo (ms)</th>
                          <th className="p-1">Status</th>
                          <th className="p-1">Errore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchmarkResults.map((result, idx) => (
                          <tr key={idx} className={result.status === 200 ? "bg-green-50" : "bg-red-50"}>
                            <td className="p-1">{result.variant}</td>
                            <td className="p-1">{result.responseTime}</td>
                            <td className="p-1">{result.status}</td>
                            <td className="p-1">{result.error || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization A/B Testing Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization A/B Testing</CardTitle>
              <CardDescription>
                Esegui test paralleli per valutare l'impatto delle ottimizzazioni
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OptimizationControls 
                flags={optimizationFlags}
                onFlagsChange={setOptimizationFlags}
              />
              <OptimizationTestRunner
                flags={optimizationFlags}
                onResultsUpdate={setOptimizationResults}
              />
              {optimizationResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Risultati Ottimizzazioni</h3>
                  <ScrollArea className="h-64 rounded-md border p-2 font-mono text-xs bg-background">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="p-1">Configurazione</th>
                          <th className="p-1">Tempo (ms)</th>
                          <th className="p-1">Baseline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimizationResults.map((result, idx) => (
                          <tr key={idx} className={result.isBaseline ? "bg-yellow-50" : ""}>
                            <td className="p-1">{result.configName}</td>
                            <td className="p-1">{result.responseTime.toFixed(0)}</td>
                            <td className="p-1">{result.isBaseline ? "✔️" : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <OptimizationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TMWEApiTester;

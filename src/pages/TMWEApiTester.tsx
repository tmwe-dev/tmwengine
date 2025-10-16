import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Copy, CheckCircle2, XCircle, BarChart3, Zap, Settings2, Download, FileSpreadsheet, StopCircle, AlertTriangle } from "lucide-react";
import { getApiConfigFromDB } from "@/lib/tmwe-api-integrated";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Configurazioni endpoint con handlers
const API_ENDPOINTS = {
  email_folder: {
    path: "/app.php?action=email_folder",
    handlers: {
      get_folders: { handler: "get_folders", include_counts: true, hierarchy: true },
      get_folder_info: { handler: "get_folder_info", folder_name: "INBOX", include_counts: true },
      create_folder: { handler: "create_folder", folder_name: "TestFolder" },
      delete_folder: { handler: "delete_folder", folder_name: "TestFolder" },
      rename_folder: { handler: "rename_folder", old_name: "OldFolder", new_name: "NewFolder" }
    }
  },
  email_message: {
    path: "/app.php?action=email_message",
    handlers: {
      get_messages: { handler: "get_messages", folder: "INBOX", limit: 10, offset: 0 },
      get_message: { handler: "get_message", uid: 123, mark_as_read: true },
      get_messages_filtered: { 
        handler: "get_messages", 
        folder: "INBOX",
        page: 1,
        limit: 50,
        sort: "date",
        order: "DESC",
        include_attachments: true,
        format: "html"
      },
      send_message: { 
        handler: "send_message", 
        to: ["test@example.com"], 
        subject: "Test", 
        body: "Test message"
      },
      delete_email: { handler: "delete_email", uid: 123 },
      move_to_trash: { handler: "move_to_trash", uid: 123 },
      delete_messages: { handler: "delete_messages", uids: [123, 456] }
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
  headers: Record<string, string>;
  body: any;
  responseTime: number;
  error?: string;
}

interface BenchmarkConfig {
  name: string;
  endpoint: string;
  handler: string;
  variations: Record<string, any>[];
  description: string;
  category: string;
}

interface BenchmarkResult extends TestResult {
  variantName: string;
  variantConfig: Record<string, any>;
}

interface AllBenchmarkResults {
  suiteName: string;
  category: string;
  totalVariants: number;
  results: BenchmarkResult[];
  winner: BenchmarkResult | null;
  avgResponseTime: number;
  successRate: number;
}

// Suite di benchmark predefinite (ESPANSE - FASE 1)
const BENCHMARK_SUITES: BenchmarkConfig[] = [
  // ========== SYNC OPERATIONS (3 suite) ==========
  {
    name: "🔄 Sync - Full vs Incremental",
    category: "Sync",
    endpoint: "/app.php?action=email_sync",
    handler: "start_sync",
    description: "Confronto tra sync completa e incrementale",
    variations: [
      { handler: "get_sync_status" },
      { handler: "cancel_sync" },
    ]
  },
  
  // ========== MESSAGE OPERATIONS (7 suite - esistenti + nuove) ==========
  {
    name: "📧 Get Messages - Limit Test",
    category: "Performance",
    endpoint: "/app.php?action=email_message",
    handler: "get_messages",
    description: "Test performance con diversi limiti di email recuperate",
    variations: [
      { handler: "get_messages", folder: "INBOX", limit: 10, offset: 0 },
      { handler: "get_messages", folder: "INBOX", limit: 25, offset: 0 },
      { handler: "get_messages", folder: "INBOX", limit: 50, offset: 0 },
      { handler: "get_messages", folder: "INBOX", limit: 100, offset: 0 },
    ]
  },
  {
    name: "📎 Get Messages - Attachments Impact",
    category: "Performance",
    endpoint: "/app.php?action=email_message",
    handler: "get_messages",
    description: "Impatto degli attachments sulla velocità di risposta",
    variations: [
      { handler: "get_messages", folder: "INBOX", limit: 50, include_attachments: false },
      { handler: "get_messages", folder: "INBOX", limit: 50, include_attachments: true },
    ]
  },
  {
    name: "📄 Get Messages - Format Test",
    category: "Performance",
    endpoint: "/app.php?action=email_message",
    handler: "get_messages",
    description: "Confronto performance tra formati text, html e both",
    variations: [
      { handler: "get_messages", folder: "INBOX", limit: 50, format: "text" },
      { handler: "get_messages", folder: "INBOX", limit: 50, format: "html" },
      { handler: "get_messages", folder: "INBOX", limit: 50, format: "both" },
    ]
  },
  {
    name: "🔢 Get Messages - Pagination Strategy",
    category: "Optimization",
    endpoint: "/app.php?action=email_message",
    handler: "get_messages",
    description: "Confronto tra offset e page per la paginazione",
    variations: [
      { handler: "get_messages", folder: "INBOX", limit: 50, offset: 0 },
      { handler: "get_messages", folder: "INBOX", limit: 50, page: 1 },
      { handler: "get_messages", folder: "INBOX", limit: 50, offset: 50 },
      { handler: "get_messages", folder: "INBOX", limit: 50, page: 2 },
    ]
  },
  {
    name: "🔽 Get Messages - Sort & Order",
    category: "Optimization",
    endpoint: "/app.php?action=email_message",
    handler: "get_messages",
    description: "Impatto di sort e order sulla velocità",
    variations: [
      { handler: "get_messages", folder: "INBOX", limit: 50, sort: "date", order: "DESC" },
      { handler: "get_messages", folder: "INBOX", limit: 50, sort: "date", order: "ASC" },
      { handler: "get_messages", folder: "INBOX", limit: 50, sort: "subject", order: "ASC" },
    ]
  },
  {
    name: "📁 Get Folders - Optimization",
    category: "Performance",
    endpoint: "/app.php?action=email_folder",
    handler: "get_folders",
    description: "Impatto di counts e hierarchy sulla performance",
    variations: [
      { handler: "get_folders", include_counts: false, hierarchy: false },
      { handler: "get_folders", include_counts: true, hierarchy: false },
      { handler: "get_folders", include_counts: false, hierarchy: true },
      { handler: "get_folders", include_counts: true, hierarchy: true },
    ]
  },
  // ========== SINGLE MESSAGE OPERATIONS (4 nuove suite) ==========
  {
    name: "📩 Get Single Message - Format Impact",
    category: "Performance",
    endpoint: "/app.php?action=email_message",
    handler: "get_message",
    description: "Impatto formato su singolo messaggio",
    variations: [
      { handler: "get_message", uid: 1, format: "text" },
      { handler: "get_message", uid: 1, format: "html" },
      { handler: "get_message", uid: 1, format: "both" },
    ]
  },
  {
    name: "✅ Mark as Read - Batch Performance",
    category: "Optimization",
    endpoint: "/app.php?action=email_message",
    handler: "mark_as_read",
    description: "Performance batch vs singolo",
    variations: [
      { handler: "mark_as_read", message_ids: ["1"] },
      { handler: "mark_as_read", message_ids: ["1", "2", "3", "4", "5"] },
      { handler: "mark_as_read", message_ids: Array.from({length: 20}, (_, i) => String(i + 1)) },
    ]
  },
  {
    name: "🗑️ Delete Messages - Performance",
    category: "Performance",
    endpoint: "/app.php?action=email_message",
    handler: "delete_messages",
    description: "Performance cancellazione messaggi",
    variations: [
      { handler: "delete_messages", message_ids: ["1"], permanent: false },
      { handler: "delete_messages", message_ids: ["1"], permanent: true },
      { handler: "delete_messages", message_ids: ["1", "2", "3"], permanent: false },
    ]
  },
  {
    name: "📁 Move Messages - Folder Operations",
    category: "Performance",
    endpoint: "/app.php?action=email_message",
    handler: "move_messages",
    description: "Performance spostamento tra cartelle",
    variations: [
      { handler: "move_messages", message_ids: ["1"], target_folder: "Archive" },
      { handler: "move_messages", message_ids: ["1", "2", "3"], target_folder: "Archive" },
    ]
  },
  
  // ========== FOLDER MANAGEMENT (3 suite) ==========
  {
    name: "📂 Folder CRUD - Operations Speed",
    category: "Performance",
    endpoint: "/app.php?action=email_folder",
    handler: "create_folder",
    description: "Performance operazioni CRUD cartelle",
    variations: [
      { handler: "get_folder_info", folder: "INBOX" },
      { handler: "get_folder_info", folder: "Sent" },
    ]
  },
  {
    name: "📊 Get Folders - Optimization Critical",
    category: "Critical",
    endpoint: "/app.php?action=email_folder",
    handler: "get_folders",
    description: "🚨 ANALISI CRITICA: quale combinazione funziona?",
    variations: [
      { handler: "get_folders", include_counts: false, hierarchy: false },
      { handler: "get_folders", include_counts: false, hierarchy: true },
      { handler: "get_folders", include_counts: true, hierarchy: false },
      { handler: "get_folders", include_counts: true, hierarchy: true },
    ]
  },
  
  // ========== SEND OPERATIONS (1 suite) ==========
  {
    name: "📤 Send Email - Plain vs HTML",
    category: "Performance",
    endpoint: "/app.php?action=email_message",
    handler: "send_message",
    description: "Impatto formato su invio (MOCK - non invia realmente)",
    variations: [
      { handler: "get_messages", folder: "Sent", limit: 5 }, // Mock: legge sent invece di inviare
    ]
  },
  
  // ========== ACCOUNT OPERATIONS (1 suite) ==========
  {
    name: "⚡ Account Operations - Baseline",
    category: "Baseline",
    endpoint: "/app.php?action=email_account",
    handler: "test_connection",
    description: "Baseline performance per operazioni account",
    variations: [
      { handler: "test_connection" },
      { handler: "get_account_info" },
      { handler: "get_quota" },
    ]
  }
];

const TMWEApiTester = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("email_folder");
  const [selectedHandler, setSelectedHandler] = useState<string>("get_folders");
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify(API_ENDPOINTS.email_folder.handlers.get_folders, null, 2)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);
  
  // Benchmark state
  const [selectedSuite, setSelectedSuite] = useState<string>(BENCHMARK_SUITES[0].name);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [benchmarkDelay, setBenchmarkDelay] = useState(500);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [benchmarkHistory, setBenchmarkHistory] = useState<any[]>([]);
  
  // Run All Benchmarks state
  const [allBenchmarkResults, setAllBenchmarkResults] = useState<AllBenchmarkResults[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [allBenchmarksProgress, setAllBenchmarksProgress] = useState({
    currentSuite: 0,
    totalSuites: 0,
    currentSuiteProgress: 0,
    suiteName: ''
  });
  
  const { toast } = useToast();

  const handleEndpointChange = (endpoint: string) => {
    setSelectedEndpoint(endpoint);
    type EndpointKey = keyof typeof API_ENDPOINTS;
    const endpointConfig = API_ENDPOINTS[endpoint as EndpointKey];
    const firstHandler = Object.keys(endpointConfig.handlers)[0];
    setSelectedHandler(firstHandler);
    const handlerConfig = (endpointConfig.handlers as any)[firstHandler];
    setRequestBody(JSON.stringify(handlerConfig, null, 2));
  };

  const handleHandlerChange = (handler: string) => {
    setSelectedHandler(handler);
    type EndpointKey = keyof typeof API_ENDPOINTS;
    const endpointConfig = API_ENDPOINTS[selectedEndpoint as EndpointKey];
    const handlerConfig = (endpointConfig.handlers as any)[handler];
    setRequestBody(JSON.stringify(handlerConfig, null, 2));
  };

  const handleExecuteTest = async () => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      const body = JSON.parse(requestBody);
      const endpoint = API_ENDPOINTS[selectedEndpoint as keyof typeof API_ENDPOINTS].path;
      const accessToken = await getAccessToken();

      console.log('🧪 API TEST - Starting via Edge Function', { endpoint, body });

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

      toast({
        title: "✅ Test completato",
        description: `${Math.round(responseTime)}ms`,
      });

    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      const result: TestResult = {
        timestamp: new Date().toISOString(),
        endpoint: API_ENDPOINTS[selectedEndpoint as keyof typeof API_ENDPOINTS].path,
        handler: selectedHandler,
        status: 0,
        statusText: "Error",
        headers: {},
        body: { error: error.message },
        responseTime: Math.round(responseTime),
        error: error.message
      };

      setTestResult(result);
      setHistory([result, ...history].slice(0, 10));

      toast({
        title: "❌ Errore nel test",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessToken = async () => {
    const config = await getApiConfigFromDB();
    return config?.accessToken || '';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "📋 Copiato",
      description: "Contenuto copiato negli appunti",
    });
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return "bg-destructive";
    if (status >= 200 && status < 300) return "bg-green-500";
    if (status >= 300 && status < 400) return "bg-yellow-500";
    return "bg-destructive";
  };

  const runBenchmarkSuite = async () => {
    const suite = BENCHMARK_SUITES.find(s => s.name === selectedSuite);
    if (!suite) return;

    setIsBenchmarking(true);
    setBenchmarkResults([]);
    setBenchmarkProgress(0);

    const results: BenchmarkResult[] = [];
    const accessToken = await getAccessToken();

    for (let i = 0; i < suite.variations.length; i++) {
      const variation = suite.variations[i];
      const startTime = performance.now();

      try {
        const { data: responseData, error: invokeError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: suite.endpoint,
            data: variation,
            bearerToken: accessToken
          }
        });

        const responseTime = performance.now() - startTime;

        const result: BenchmarkResult = {
          timestamp: new Date().toISOString(),
          endpoint: suite.endpoint,
          handler: suite.handler,
          status: invokeError ? 0 : 200,
          statusText: invokeError ? "Error" : "OK",
          headers: { 'content-type': 'application/json' },
          body: responseData,
          responseTime: Math.round(responseTime),
          error: invokeError?.message,
          variantName: Object.entries(variation)
            .filter(([key]) => key !== 'handler')
            .map(([key, val]) => `${key}:${val}`)
            .join(', '),
          variantConfig: variation
        };

        results.push(result);
        setBenchmarkResults([...results]);
      } catch (error: any) {
        const responseTime = performance.now() - startTime;
        results.push({
          timestamp: new Date().toISOString(),
          endpoint: suite.endpoint,
          handler: suite.handler,
          status: 0,
          statusText: "Error",
          headers: {},
          body: { error: error.message },
          responseTime: Math.round(responseTime),
          error: error.message,
          variantName: JSON.stringify(variation),
          variantConfig: variation
        });
      }

      setBenchmarkProgress(((i + 1) / suite.variations.length) * 100);

      if (i < suite.variations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, benchmarkDelay));
      }
    }

    setIsBenchmarking(false);
    toast({
      title: "✅ Benchmark completato",
      description: `${results.length} test eseguiti`,
    });
  };

  const runAllBenchmarks = async () => {
    const suitesToRun = filteredSuites;
    setIsRunningAll(true);
    setAllBenchmarkResults([]);
    setAllBenchmarksProgress({
      currentSuite: 0,
      totalSuites: suitesToRun.length,
      currentSuiteProgress: 0,
      suiteName: ''
    });

    const allResults: AllBenchmarkResults[] = [];
    const accessToken = await getAccessToken();

    for (let suiteIndex = 0; suiteIndex < suitesToRun.length; suiteIndex++) {
      if (!isRunningAll) break; // Allow interruption

      const suite = suitesToRun[suiteIndex];
      setAllBenchmarksProgress(prev => ({
        ...prev,
        currentSuite: suiteIndex + 1,
        suiteName: suite.name
      }));

      const suiteResults: BenchmarkResult[] = [];

      for (let i = 0; i < suite.variations.length; i++) {
        if (!isRunningAll) break;

        const variation = suite.variations[i];
        const startTime = performance.now();

        try {
          const { data: responseData, error: invokeError } = await supabase.functions.invoke('tmwe-api-proxy', {
            body: {
              endpoint: suite.endpoint,
              data: variation,
              bearerToken: accessToken
            }
          });

          const responseTime = performance.now() - startTime;

          const result: BenchmarkResult = {
            timestamp: new Date().toISOString(),
            endpoint: suite.endpoint,
            handler: suite.handler,
            status: invokeError ? 0 : 200,
            statusText: invokeError ? "Error" : "OK",
            headers: { 'content-type': 'application/json' },
            body: responseData,
            responseTime: Math.round(responseTime),
            error: invokeError?.message,
            variantName: Object.entries(variation)
              .filter(([key]) => key !== 'handler')
              .map(([key, val]) => `${key}:${val}`)
              .join(', '),
            variantConfig: variation
          };

          suiteResults.push(result);
        } catch (error: any) {
          const responseTime = performance.now() - startTime;
          suiteResults.push({
            timestamp: new Date().toISOString(),
            endpoint: suite.endpoint,
            handler: suite.handler,
            status: 0,
            statusText: "Error",
            headers: {},
            body: { error: error.message },
            responseTime: Math.round(responseTime),
            error: error.message,
            variantName: JSON.stringify(variation),
            variantConfig: variation
          });
        }

        setAllBenchmarksProgress(prev => ({
          ...prev,
          currentSuiteProgress: ((i + 1) / suite.variations.length) * 100
        }));

        if (i < suite.variations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, benchmarkDelay));
        }
      }

      const successfulResults = suiteResults.filter(r => r.status === 200);
      const winner = successfulResults.sort((a, b) => a.responseTime - b.responseTime)[0] || null;
      const avgResponseTime = successfulResults.length > 0
        ? Math.round(successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length)
        : 0;

      allResults.push({
        suiteName: suite.name,
        category: suite.category,
        totalVariants: suite.variations.length,
        results: suiteResults,
        winner,
        avgResponseTime,
        successRate: (successfulResults.length / suiteResults.length) * 100
      });

      setAllBenchmarkResults([...allResults]);
    }

    setIsRunningAll(false);

    // Save to history
    const newHistory = [...benchmarkHistory, {
      timestamp: Date.now(),
      category: selectedCategory,
      results: allResults
    }].slice(-20);
    setBenchmarkHistory(newHistory);
    localStorage.setItem('benchmark_history', JSON.stringify(newHistory));

    toast({
      title: "🎉 Tutti i benchmark completati!",
      description: `${allResults.length} suite eseguite con successo`,
    });
  };

  const exportAllBenchmarks = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const report = {
        timestamp: new Date().toISOString(),
        category: selectedCategory,
        totalSuites: allBenchmarkResults.length,
        suites: allBenchmarkResults.map(suite => ({
          name: suite.suiteName,
          category: suite.category,
          variants: suite.totalVariants,
          avgResponseTime: suite.avgResponseTime,
          successRate: suite.successRate,
          winner: suite.winner?.variantName || 'N/A',
          results: suite.results
        })),
        summary: {
          totalTests: allBenchmarkResults.reduce((sum, s) => sum + s.totalVariants, 0),
          avgSuccessRate: (allBenchmarkResults.reduce((sum, s) => sum + s.successRate, 0) / allBenchmarkResults.length).toFixed(2),
          fastestConfig: allBenchmarkResults
            .flatMap(s => s.results)
            .filter(r => r.status === 200)
            .sort((a, b) => a.responseTime - b.responseTime)[0]
        }
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tmwe-all-benchmarks-${Date.now()}.json`;
      a.click();
    } else {
      const rows = [
        ['Suite', 'Category', 'Variant', 'Response Time (ms)', 'Status', 'Is Winner', 'Success Rate (%)']
      ];

      allBenchmarkResults.forEach(suite => {
        suite.results.forEach(result => {
          rows.push([
            suite.suiteName,
            suite.category,
            result.variantName,
            result.responseTime.toString(),
            result.status.toString(),
            result === suite.winner ? 'YES' : 'NO',
            suite.successRate.toFixed(2)
          ]);
        });
      });

      const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tmwe-all-benchmarks-${Date.now()}.csv`;
      a.click();
    }

    toast({
      title: "📥 Export completato",
      description: `Report salvato in formato ${format.toUpperCase()}`,
    });
  };

  // ✅ FASE 3: Export CSV oltre a JSON
  const exportBenchmarkReport = (format: 'json' | 'csv' = 'json') => {
    const suite = BENCHMARK_SUITES.find(s => s.name === selectedSuite);
    const winner = benchmarkResults
      .filter(r => r.status === 200)
      .sort((a, b) => a.responseTime - b.responseTime)[0];

    if (format === 'csv') {
      const csv = [
        "Suite,Variant,Response Time,Status,Winner",
        ...benchmarkResults.map(r => 
          `"${selectedSuite}","${r.variantName}",${r.responseTime},${r.status},${r.variantName === winner?.variantName ? "YES" : "NO"}`
        )
      ].join("\n");
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark-${suite?.name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.csv`;
      a.click();
      
      toast({
        title: "📊 Report CSV esportato",
        description: "Report salvato come CSV",
      });
      return;
    }

    const report = {
      suite: suite?.name,
      timestamp: new Date().toISOString(),
      results: benchmarkResults,
      winner: winner ? {
        variant: winner.variantName,
        responseTime: winner.responseTime,
        config: winner.variantConfig
      } : null,
      recommendations: winner ? [
        `✅ Configurazione più veloce: ${winner.variantName}`,
        `⚡ Tempo di risposta: ${winner.responseTime}ms`,
        `📊 Miglioramento rispetto alla più lenta: ${Math.round(((Math.max(...benchmarkResults.map(r => r.responseTime)) - winner.responseTime) / Math.max(...benchmarkResults.map(r => r.responseTime))) * 100)}%`
      ] : []
    };

    // ✅ FASE 3: Salva in localStorage per comparazione storica
    const history = JSON.parse(localStorage.getItem('benchmark_history') || '[]');
    history.push(report);
    localStorage.setItem('benchmark_history', JSON.stringify(history.slice(-20))); // Mantieni ultimi 20
    setBenchmarkHistory(history);

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${suite?.name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
    a.click();

    toast({
      title: "📊 Report esportato",
      description: "Report salvato come JSON",
    });
  };
  
  // ✅ Filtra suite per categoria
  const filteredSuites = selectedCategory === "all" 
    ? BENCHMARK_SUITES 
    : BENCHMARK_SUITES.filter(s => s.category === selectedCategory);
  
  // Ottieni categorie uniche
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
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="standard">
            <Settings2 className="mr-2 h-4 w-4" />
            Standard Testing
          </TabsTrigger>
          <TabsTrigger value="benchmark">
            <BarChart3 className="mr-2 h-4 w-4" />
            Advanced Benchmark
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pannello di configurazione */}
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
                  {Object.keys(API_ENDPOINTS).map((endpoint) => (
                    <SelectItem key={endpoint} value={endpoint}>
                      {endpoint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground font-mono">
                {API_ENDPOINTS[selectedEndpoint as keyof typeof API_ENDPOINTS].path}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Handler</Label>
              <Select value={selectedHandler} onValueChange={handleHandlerChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(API_ENDPOINTS[selectedEndpoint as keyof typeof API_ENDPOINTS].handlers).map((handler) => (
                    <SelectItem key={handler} value={handler}>
                      {handler}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Request Body (JSON)</Label>
              <Textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                placeholder="{ }"
              />
            </div>

            <Button 
              onClick={handleExecuteTest} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

        {/* Pannello risultati */}
        <Card>
          <CardHeader>
            <CardTitle>Risultati</CardTitle>
            <CardDescription>Response dell'API in tempo reale</CardDescription>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <Tabs defaultValue="formatted" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="formatted">Formatted</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                </TabsList>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getStatusColor(testResult.status)}>
                      {testResult.status === 0 ? 'ERROR' : `${testResult.status} ${testResult.statusText}`}
                    </Badge>
                    <Badge variant="outline">{testResult.responseTime}ms</Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {testResult.handler}
                    </Badge>
                  </div>

                  {testResult.error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                      <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-destructive">Errore</p>
                        <p className="text-sm text-destructive/80">{testResult.error}</p>
                      </div>
                    </div>
                  )}
                </div>

                <TabsContent value="formatted" className="mt-4">
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    <pre className="p-4 text-xs font-mono">
                      {JSON.stringify(testResult.body, null, 2)}
                    </pre>
                  </ScrollArea>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => copyToClipboard(JSON.stringify(testResult.body, null, 2))}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copia JSON
                  </Button>
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    <pre className="p-4 text-xs font-mono">
                      {JSON.stringify(testResult.body)}
                    </pre>
                  </ScrollArea>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => copyToClipboard(JSON.stringify(testResult.body))}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copia Raw JSON
                  </Button>
                </TabsContent>

                <TabsContent value="headers" className="mt-4">
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    <div className="p-4 space-y-2">
                      {Object.entries(testResult.headers).map(([key, value]) => (
                        <div key={key} className="text-xs font-mono">
                          <span className="font-semibold">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
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

          {/* History */}
          {history.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Cronologia Test</CardTitle>
                <CardDescription>Ultimi 10 test eseguiti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => setTestResult(result)}
                    >
                      {result.error ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{result.handler}</span>
                          <Badge variant="outline" className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                          <Badge variant="outline">{result.responseTime}ms</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(result.timestamp).toLocaleString('it-IT')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Benchmark Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Benchmark Suite</CardTitle>
                <CardDescription>Seleziona suite di test automatici</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ✅ FASE 3: Filtro per categoria */}
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
                        <Badge variant="outline">{suite.variations.length} varianti</Badge>
                        <Badge variant="outline">{suite.category}</Badge>
                      </>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-2">
                  <Label>Delay tra test (ms): {benchmarkDelay}</Label>
                  <Slider
                    value={[benchmarkDelay]}
                    onValueChange={(value) => setBenchmarkDelay(value[0])}
                    min={100}
                    max={2000}
                    step={100}
                    disabled={isBenchmarking}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo di attesa tra test per non sovraccaricare il server
                  </p>
                </div>

                {(isBenchmarking || isRunningAll) && (
                  <div className="space-y-2">
                    <Label>Progresso</Label>
                    {isRunningAll ? (
                      <>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Suite {allBenchmarksProgress.currentSuite}/{allBenchmarksProgress.totalSuites}</span>
                          <span className="font-mono">{allBenchmarksProgress.suiteName.substring(0, 30)}...</span>
                        </div>
                        <Progress value={
                          ((allBenchmarksProgress.currentSuite - 1) / allBenchmarksProgress.totalSuites * 100) +
                          (allBenchmarksProgress.currentSuiteProgress / allBenchmarksProgress.totalSuites)
                        } />
                        <p className="text-xs text-muted-foreground text-center">
                          Variante {Math.round(allBenchmarksProgress.currentSuiteProgress)}% completata
                        </p>
                      </>
                    ) : (
                      <>
                        <Progress value={benchmarkProgress} />
                        <p className="text-xs text-muted-foreground text-center">
                          {Math.round(benchmarkProgress)}%
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={runBenchmarkSuite}
                    disabled={isBenchmarking || isRunningAll}
                    className="flex-1"
                    size="lg"
                  >
                    {isBenchmarking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Test...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Suite Singola
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  onClick={runAllBenchmarks}
                  disabled={isBenchmarking || isRunningAll}
                  variant="default"
                  className="w-full"
                  size="lg"
                >
                  {isRunningAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esecuzione {allBenchmarksProgress.currentSuite}/{allBenchmarksProgress.totalSuites}...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      {selectedCategory === "all" 
                        ? `Esegui Tutte le Suite (${filteredSuites.length})`
                        : `Esegui Suite "${selectedCategory}" (${filteredSuites.length})`
                      }
                    </>
                  )}
                </Button>

                {isRunningAll && (
                  <Button
                    onClick={() => setIsRunningAll(false)}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Interrompi Test
                  </Button>
                )}

                {/* ✅ FASE 3: Export JSON + CSV */}
                {benchmarkResults.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Export Suite Singola</Label>
                    <Button
                      onClick={() => exportBenchmarkReport('json')}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Esporta JSON
                    </Button>
                    <Button
                      onClick={() => exportBenchmarkReport('csv')}
                      variant="outline"
                      className="w-full"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Esporta CSV
                    </Button>
                  </div>
                )}

                {allBenchmarkResults.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-xs">Export Completo ({allBenchmarkResults.length} suite)</Label>
                    <Button
                      onClick={() => exportAllBenchmarks('json')}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Esporta Tutto (JSON)
                    </Button>
                    <Button
                      onClick={() => exportAllBenchmarks('csv')}
                      variant="outline"
                      className="w-full"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Esporta Tutto (CSV)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Risultati Comparativi</CardTitle>
                <CardDescription>Confronto performance tra varianti</CardDescription>
              </CardHeader>
              <CardContent>
                {benchmarkResults.length > 0 ? (
                  <>
                    <div className="rounded-md border mb-4">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-3 text-left text-sm font-semibold">Variante</th>
                              <th className="p-3 text-left text-sm font-semibold">Tempo</th>
                              <th className="p-3 text-left text-sm font-semibold">Status</th>
                              <th className="p-3 text-left text-sm font-semibold">Vincitore</th>
                            </tr>
                          </thead>
                          <tbody>
                            {benchmarkResults
                              .sort((a, b) => a.responseTime - b.responseTime)
                              .map((result, index) => (
                                <tr key={index} className="border-t hover:bg-accent">
                                  <td className="p-3 text-sm font-mono">{result.variantName}</td>
                                  <td className="p-3">
                                    <Badge variant="outline">{result.responseTime}ms</Badge>
                                  </td>
                                  <td className="p-3">
                                    <Badge className={getStatusColor(result.status)}>
                                      {result.status}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    {index === 0 && result.status === 200 && (
                                      <span className="text-2xl">🏆</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Performance Chart */}
                    <div className="h-[300px] mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={benchmarkResults.map((r, i) => ({ 
                          name: `Var ${i + 1}`, 
                          time: r.responseTime,
                          fullName: r.variantName 
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border rounded-lg p-3 shadow-lg">
                                    <p className="font-semibold">{payload[0].payload.fullName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {payload[0].value}ms
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="time">
                            {benchmarkResults.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Recommendations */}
                    {(() => {
                      const winner = benchmarkResults
                        .filter(r => r.status === 200)
                        .sort((a, b) => a.responseTime - b.responseTime)[0];
                      const slowest = benchmarkResults
                        .filter(r => r.status === 200)
                        .sort((a, b) => b.responseTime - a.responseTime)[0];
                      
                      if (winner && slowest && winner !== slowest) {
                        const improvement = Math.round(((slowest.responseTime - winner.responseTime) / slowest.responseTime) * 100);
                        return (
                          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                              💡 Raccomandazioni
                            </h4>
                            <ul className="space-y-1 text-sm">
                              <li>✅ Configurazione più veloce: <span className="font-mono">{winner.variantName}</span></li>
                              <li>⚡ Tempo di risposta: {winner.responseTime}ms</li>
                              <li>📊 Miglioramento: {improvement}% più veloce della configurazione più lenta</li>
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nessun benchmark eseguito</p>
                      <p className="text-sm">Seleziona una suite e clicca "Esegui Benchmark"</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ✅ ALL BENCHMARKS RESULTS SECTION */}
          {allBenchmarkResults.length > 0 && (
            <div className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>📊 Riepilogo Globale - Tutte le Suite</CardTitle>
                  <CardDescription>
                    Risultati comparativi di {allBenchmarkResults.length} suite eseguite ({allBenchmarkResults.reduce((sum, s) => sum + s.totalVariants, 0)} test totali)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Suite Eseguite</p>
                      <p className="text-2xl font-bold">{allBenchmarkResults.length}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Test Totali</p>
                      <p className="text-2xl font-bold">{allBenchmarkResults.reduce((sum, s) => sum + s.totalVariants, 0)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Success Rate Medio</p>
                      <p className="text-2xl font-bold">
                        {(allBenchmarkResults.reduce((sum, s) => sum + s.successRate, 0) / allBenchmarkResults.length).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Tempo Medio</p>
                      <p className="text-2xl font-bold">
                        {Math.round(allBenchmarkResults.reduce((sum, s) => sum + s.avgResponseTime, 0) / allBenchmarkResults.length)}ms
                      </p>
                    </div>
                  </div>

                  {/* Comparative Table */}
                  <div className="rounded-md border mb-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-3 text-left text-sm font-semibold">Suite</th>
                            <th className="p-3 text-left text-sm font-semibold">Categoria</th>
                            <th className="p-3 text-left text-sm font-semibold">Varianti</th>
                            <th className="p-3 text-left text-sm font-semibold">Tempo Medio</th>
                            <th className="p-3 text-left text-sm font-semibold">Success Rate</th>
                            <th className="p-3 text-left text-sm font-semibold">Vincitore</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allBenchmarkResults
                            .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
                            .map((suite, index) => (
                              <tr key={index} className="border-t hover:bg-accent">
                                <td className="p-3 text-sm">{suite.suiteName}</td>
                                <td className="p-3">
                                  <Badge variant="outline">{suite.category}</Badge>
                                </td>
                                <td className="p-3 text-sm text-center">{suite.totalVariants}</td>
                                <td className="p-3">
                                  <Badge variant="outline">{suite.avgResponseTime}ms</Badge>
                                </td>
                                <td className="p-3">
                                  <Badge className={suite.successRate === 100 ? "bg-green-500" : suite.successRate > 50 ? "bg-yellow-500" : "bg-destructive"}>
                                    {suite.successRate.toFixed(0)}%
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm font-mono text-xs max-w-[200px] truncate">
                                  {suite.winner?.variantName || 'N/A'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Multi-Suite Bar Chart */}
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={allBenchmarkResults.map(s => ({
                        name: s.suiteName.substring(0, 25),
                        fullName: s.suiteName,
                        avgTime: s.avgResponseTime,
                        category: s.category
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Avg Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
                                  <p className="font-semibold text-sm">{payload[0].payload.fullName}</p>
                                  <p className="text-sm text-muted-foreground">Avg: {payload[0].value}ms</p>
                                  <Badge variant="outline" className="mt-1">{payload[0].payload.category}</Badge>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="avgTime">
                          {allBenchmarkResults.map((entry, index) => {
                            const colors = {
                              'Performance': "hsl(var(--chart-1))",
                              'Optimization': "hsl(var(--chart-2))",
                              'Critical': "hsl(var(--destructive))",
                              'Sync': "hsl(var(--chart-3))",
                              'Baseline': "hsl(var(--chart-4))"
                            };
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colors[entry.category as keyof typeof colors] || "hsl(var(--chart-5))"} 
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top 5 Fastest Configs */}
              <Card>
                <CardHeader>
                  <CardTitle>🏆 Top 5 Configurazioni Più Veloci</CardTitle>
                  <CardDescription>Le configurazioni con il miglior tempo di risposta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allBenchmarkResults
                      .flatMap(s => s.results)
                      .filter(r => r.status === 200)
                      .sort((a, b) => a.responseTime - b.responseTime)
                      .slice(0, 5)
                      .map((result, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="text-2xl">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index]}</div>
                          <div className="flex-1">
                            <p className="font-mono text-sm font-semibold">{result.variantName}</p>
                            <p className="text-xs text-muted-foreground">{result.endpoint}</p>
                          </div>
                          <Badge variant="outline" className="font-bold">{result.responseTime}ms</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Critical Issues Alert */}
              {(() => {
                const criticalIssues = allBenchmarkResults.filter(s => s.successRate < 100);
                if (criticalIssues.length > 0) {
                  return (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>⚠️ Problemi Rilevati ({criticalIssues.length} suite)</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 space-y-1 text-sm">
                          {criticalIssues.map((suite, i) => (
                            <li key={i}>
                              🚨 <strong>{suite.suiteName}</strong>: {suite.successRate.toFixed(0)}% success rate
                              {suite.results.filter(r => r.status !== 200).length > 0 && (
                                <span className="ml-2 text-xs">
                                  ({suite.results.filter(r => r.status !== 200).length} fallimenti)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TMWEApiTester;

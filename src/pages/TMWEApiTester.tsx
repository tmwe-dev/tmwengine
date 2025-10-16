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
import { Loader2, Play, Copy, CheckCircle2, XCircle } from "lucide-react";
import { getApiConfigFromDB } from "@/lib/tmwe-api-integrated";
import { supabase } from "@/integrations/supabase/client";

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

const TMWEApiTester = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("email_folder");
  const [selectedHandler, setSelectedHandler] = useState<string>("get_folders");
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify(API_ENDPOINTS.email_folder.handlers.get_folders, null, 2)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">TMWE API Tester</h1>
        <p className="text-muted-foreground">
          Test e debug delle chiamate API TMWE in tempo reale
        </p>
      </div>

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
    </div>
  );
};

export default TMWEApiTester;

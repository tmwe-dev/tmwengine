import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTMWEEmail } from '@/hooks/useTMWEEmail';
import { useTMWEEmailDirect } from '@/hooks/useTMWEEmailDirect';
import { 
  Mail, 
  Server, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Info,
  Key,
  Folder,
  Globe,
  Shield,
  Settings
} from 'lucide-react';

export const TMWETestPanel = () => {
  // Edge Function hook
  const edgeFunction = useTMWEEmail();
  
  // Direct client configuration
  const [directConfig, setDirectConfig] = useState({
    apiKey: '',
    useProxy: false
  });
  
  // Direct client hook
  const directClient = useTMWEEmailDirect(directConfig);

  const [testResults, setTestResults] = useState<any>(null);
  const [activeMethod, setActiveMethod] = useState<'edge' | 'direct'>('edge');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Get current hook based on active method
  const currentHook = activeMethod === 'edge' ? edgeFunction : directClient;

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    try {
      const result = await currentHook.testConnection();
      setConnectionStatus(result.success ? 'success' : 'error');
      setTestResults({
        ...result,
        method: activeMethod,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setConnectionStatus('error');
      setTestResults({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Test fallito',
        method: activeMethod,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleGetAccountInfo = async () => {
    try {
      const result = await currentHook.getAccountInfo();
      setTestResults({ ...result, method: activeMethod });
    } catch (err) {
      setTestResults({ 
        success: false, 
        error: 'Errore nel recupero info account',
        method: activeMethod 
      });
    }
  };

  const handleGetQuotaInfo = async () => {
    try {
      const result = await currentHook.getQuotaInfo();
      setTestResults({ ...result, method: activeMethod });
    } catch (err) {
      setTestResults({ 
        success: false, 
        error: 'Errore nel recupero quote',
        method: activeMethod 
      });
    }
  };

  const handleGetFolders = async () => {
    try {
      const result = await currentHook.getFolders();
      setTestResults({ ...result, method: activeMethod });
    } catch (err) {
      setTestResults({ 
        success: false, 
        error: 'Errore nel recupero cartelle',
        method: activeMethod 
      });
    }
  };

  const handleGetEmails = async () => {
    try {
      const result = await currentHook.getEmailList({ limit: 5 });
      setTestResults({ ...result, method: activeMethod });
    } catch (err) {
      setTestResults({ 
        success: false, 
        error: 'Errore nel recupero email',
        method: activeMethod 
      });
    }
  };

  const handleGetToken = async () => {
    try {
      const result = await currentHook.getToken();
      setTestResults({ ...result, method: activeMethod });
    } catch (err) {
      setTestResults({ 
        success: false, 
        error: 'Errore nel recupero token',
        method: activeMethod 
      });
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return activeMethod === 'edge' ? <Server className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'testing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMethodIcon = (method: 'edge' | 'direct') => {
    return method === 'edge' ? <Shield className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Integrazione TMWE ERP
        </CardTitle>
        <CardDescription>
          Testa la connessione TMWE usando Edge Function (sicuro) o Client Direct (testing)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Method Selection */}
        <Tabs value={activeMethod} onValueChange={(value) => setActiveMethod(value as 'edge' | 'direct')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edge" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Edge Function
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Client Direct
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edge" className="space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Sicuro:</strong> L'API Key è protetta sul server. Metodo consigliato per la produzione.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="direct" className="space-y-3">
            <Alert className="border-amber-200 bg-amber-50">
              <Settings className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Test Only:</strong> L'API Key sarà visibile nel client. Non usare in produzione.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="apiKey">API Key TMWE</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Inserisci API Key TMWE per test"
                  value={directConfig.apiKey}
                  onChange={(e) => setDirectConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="useProxy"
                  checked={directConfig.useProxy}
                  onCheckedChange={(checked) => setDirectConfig(prev => ({ ...prev, useProxy: checked }))}
                />
                <Label htmlFor="useProxy">Usa Proxy CORS (se necessario)</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status Connection */}
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            {connectionStatus === 'idle' && 'Non testato'}
            {connectionStatus === 'testing' && 'Test in corso...'}
            {connectionStatus === 'success' && 'Connesso'}
            {connectionStatus === 'error' && 'Errore'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {getMethodIcon(activeMethod)}
            {activeMethod === 'edge' ? 'Edge Function' : 'Client Direct'}
          </Badge>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={currentHook.loading || (activeMethod === 'direct' && !directConfig.apiKey)}
            className="flex items-center gap-2"
          >
            <Server className="h-4 w-4" />
            Test Connessione
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetAccountInfo}
            disabled={currentHook.loading || (activeMethod === 'direct' && !directConfig.apiKey)}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Info Account
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetQuotaInfo}
            disabled={currentHook.loading || (activeMethod === 'direct' && !directConfig.apiKey)}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Quote
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetFolders}
            disabled={currentHook.loading || (activeMethod === 'direct' && !directConfig.apiKey)}
            className="flex items-center gap-2"
          >
            <Folder className="h-4 w-4" />
            Cartelle
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetEmails}
            disabled={currentHook.loading || (activeMethod === 'direct' && !directConfig.apiKey)}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email (5)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetToken}
            disabled={currentHook.loading || (activeMethod === 'direct' && !directConfig.apiKey)}
            className="flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            Token
          </Button>
        </div>

        {/* Error Display */}
        {currentHook.error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Errore {activeMethod === 'edge' ? 'Edge Function' : 'Client Direct'}:</strong> {currentHook.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {testResults && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {testResults.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                Risultati Test - {testResults.method === 'edge' ? 'Edge Function' : 'Client Direct'}
                {testResults.suggestion && (
                  <Badge variant="outline" className="text-amber-600">
                    {testResults.suggestion}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs p-3 rounded-md overflow-auto max-h-64 border">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Loading Indicator */}
        {currentHook.loading && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">
              Caricamento via {activeMethod === 'edge' ? 'Edge Function' : 'Client Direct'}...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
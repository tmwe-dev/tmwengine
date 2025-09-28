import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTMWEEmail } from '@/hooks/useTMWEEmail';
import { 
  Mail, 
  Server, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Info,
  Key,
  Folder
} from 'lucide-react';

export const TMWETestPanel = () => {
  const { 
    loading, 
    error, 
    testConnection, 
    getAccountInfo,
    getQuotaInfo,
    getFolders,
    getEmailList,
    getToken
  } = useTMWEEmail();

  const [testResults, setTestResults] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    try {
      const result = await testConnection();
      setConnectionStatus(result.success ? 'success' : 'error');
      setTestResults(result);
    } catch (err) {
      setConnectionStatus('error');
      setTestResults({ success: false, error: err instanceof Error ? err.message : 'Test fallito' });
    }
  };

  const handleGetAccountInfo = async () => {
    try {
      const result = await getAccountInfo();
      setTestResults(result);
    } catch (err) {
      setTestResults({ success: false, error: 'Errore nel recupero info account' });
    }
  };

  const handleGetQuotaInfo = async () => {
    try {
      const result = await getQuotaInfo();
      setTestResults(result);
    } catch (err) {
      setTestResults({ success: false, error: 'Errore nel recupero quote' });
    }
  };

  const handleGetFolders = async () => {
    try {
      const result = await getFolders();
      setTestResults(result);
    } catch (err) {
      setTestResults({ success: false, error: 'Errore nel recupero cartelle' });
    }
  };

  const handleGetEmails = async () => {
    try {
      const result = await getEmailList({ limit: 5 });
      setTestResults(result);
    } catch (err) {
      setTestResults({ success: false, error: 'Errore nel recupero email' });
    }
  };

  const handleGetToken = async () => {
    try {
      const result = await getToken();
      setTestResults(result);
    } catch (err) {
      setTestResults({ success: false, error: 'Errore nel recupero token' });
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
        return <Server className="h-4 w-4" />;
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Integrazione TMWE ERP
        </CardTitle>
        <CardDescription>
          Testa la connessione e le funzionalità dell'API TMWE ERP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Connection */}
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            {connectionStatus === 'idle' && 'Non testato'}
            {connectionStatus === 'testing' && 'Test in corso...'}
            {connectionStatus === 'success' && 'Connesso'}
            {connectionStatus === 'error' && 'Errore'}
          </Badge>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Server className="h-4 w-4" />
            Test Connessione
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetAccountInfo}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Info Account
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetQuotaInfo}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Quote
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetFolders}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Folder className="h-4 w-4" />
            Cartelle
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetEmails}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email (5)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGetToken}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            Token
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
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
                Risultati Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-64">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Caricamento...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
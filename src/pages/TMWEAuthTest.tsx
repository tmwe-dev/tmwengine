import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const TMWEAuthTest = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { credentials, loading: tmweLoading, error, refreshCredentials } = useTMWEAuth();

  const handleRefresh = async () => {
    toast.info('Refreshing credentials...');
    await refreshCredentials();
    toast.success('Credentials refreshed!');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">TMWE Authentication Status</h1>

        {/* Supabase Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {authLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : user ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Supabase Authentication
            </CardTitle>
            <CardDescription>
              Primary CRM authentication status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : user ? (
              <div className="space-y-2">
                <p className="text-sm">✅ Authenticated as: {user.email}</p>
                <p className="text-xs text-muted-foreground">User ID: {user.id}</p>
              </div>
            ) : (
              <p className="text-destructive">❌ Not authenticated with Supabase</p>
            )}
          </CardContent>
        </Card>

        {/* TMWE Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {tmweLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : credentials ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              TMWE Email Authentication
            </CardTitle>
            <CardDescription>
              Email system OAuth2 credentials status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tmweLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : credentials ? (
              <div className="space-y-2">
                <p className="text-sm">✅ TMWE credentials found in database</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Client ID:</span>
                    <p className="font-mono truncate">{credentials.clientId.substring(0, 20)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Token expires:</span>
                    <p>{credentials.expiresAt ? new Date(credentials.expiresAt).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-destructive">❌ No TMWE credentials found</p>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  You need to connect your TMWE account to access the email manager
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>
              Overall system compatibility check
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {user ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Supabase Auth Ready</span>
              </div>
              <div className="flex items-center gap-2">
                {credentials ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">TMWE OAuth Ready</span>
              </div>
              <div className="flex items-center gap-2">
                {user && credentials ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Full Email Manager Access</span>
              </div>
            </div>

            {user && credentials && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Both authentication systems are working correctly!
                </p>
              </div>
            )}

            {user && !credentials && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ CRM authenticated but TMWE connection needed
                </p>
              </div>
            )}

            {!user && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">
                  ❌ Please login to the CRM first
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* localStorage Check */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Check</CardTitle>
            <CardDescription>
              Verifying no conflicts with old localStorage data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {!localStorage.getItem('tmwe_api_config') ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  {!localStorage.getItem('tmwe_api_config') 
                    ? 'No old localStorage data found ✓' 
                    : 'Old localStorage data exists (will be migrated)'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TMWEAuthTest;

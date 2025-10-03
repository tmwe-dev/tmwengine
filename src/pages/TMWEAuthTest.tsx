import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const TMWEAuthTest = () => {
  const { userEmail, isAuthenticated, isLoading } = useTMWEAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">TMWE Authentication Status</h1>

        {/* TMWE Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isAuthenticated ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              TMWE Authentication
            </CardTitle>
            <CardDescription>
              Authentication status based on TMWE API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : isAuthenticated ? (
              <div className="space-y-2">
                <p className="text-sm">✅ Authenticated as: {userEmail}</p>
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✅ Authentication is working correctly!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-destructive">❌ Not authenticated</p>
                <p className="text-xs text-muted-foreground">
                  Please login using TMWE OAuth2
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* sessionStorage Check */}
        <Card>
          <CardHeader>
            <CardTitle>Session Storage Check</CardTitle>
            <CardDescription>
              Verifying session data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {sessionStorage.getItem('tmwe_user_email') ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  User Email: {sessionStorage.getItem('tmwe_user_email') || 'Not found'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {sessionStorage.getItem('tmwe_access_token') ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  Access Token: {sessionStorage.getItem('tmwe_access_token') ? 'Present' : 'Not found'}
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

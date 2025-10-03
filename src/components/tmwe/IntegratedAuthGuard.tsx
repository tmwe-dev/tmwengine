import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle } from 'lucide-react';
import { initiateAuthorizationCodeFlow } from '@/lib/tmwe-api-integrated';

interface IntegratedAuthGuardProps {
  children: React.ReactNode;
}

export const IntegratedAuthGuard = ({ children }: IntegratedAuthGuardProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { credentials, loading: tmweLoading, error: tmweError } = useTMWEAuth();
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !tmweLoading) {
      setIsChecking(false);
    }
  }, [authLoading, tmweLoading]);

  // Show loading while checking authentication
  if (isChecking || authLoading || tmweLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to CRM login if not authenticated with Supabase
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show TMWE connection page if Supabase authenticated but no TMWE credentials
  if (!credentials) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Connect TMWE Email</CardTitle>
            <CardDescription>
              To access the email manager, you need to connect your TMWE account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tmweError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{tmweError}</p>
              </div>
            )}
            
            <Button 
              onClick={() => initiateAuthorizationCodeFlow()}
              className="w-full"
              size="lg"
            >
              Connect TMWE Account
            </Button>
            
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Back to CRM
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              You will be redirected to authorize the TMWE connection
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Both authentications verified - show the protected content
  return <>{children}</>;
};

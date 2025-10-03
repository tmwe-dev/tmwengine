import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { initiateAuthorizationCodeFlow } from '@/lib/tmwe-api';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

const Login = () => {
  const handleLogin = () => {
    try {
      // Redirect to authorization page
      initiateAuthorizationCodeFlow();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary">
            <Mail className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">TMWE Email Manager</CardTitle>
          <CardDescription>
            Enter your OAuth2 credentials to sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={handleLogin}
              className="w-full"
              size="lg"
            >
              Sign In with TMWE
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You will be redirected to the authorization page to enter your credentials
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

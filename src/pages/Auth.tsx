import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { ArrowLeft, Mail } from 'lucide-react';
import { initiateAuthorizationCodeFlow } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';

const Auth = () => {
  const { isAuthenticated } = useTMWEAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    try {
      initiateAuthorizationCodeFlow();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'avvio del login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Torna alla home
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Accedi al CRM</CardTitle>
            <CardDescription>
              Utilizza il tuo account email per accedere al sistema
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={handleLogin}
                className="w-full"
                size="lg"
              >
                Accedi con TMWE OAuth2
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Verrai reindirizzato alla pagina di autorizzazione per inserire le tue credenziali email
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
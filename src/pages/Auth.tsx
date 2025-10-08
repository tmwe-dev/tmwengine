import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { initiateAuthorizationCodeFlow } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';

const Auth = () => {
  const { isAuthenticated } = useTMWEAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Check for existing Supabase session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session || isAuthenticated) {
        navigate('/');
      }
    };
    checkSession();
  }, [isAuthenticated, navigate]);

  const handleTMWELogin = () => {
    try {
      initiateAuthorizationCodeFlow();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'avvio del login');
    }
  };

  const handleSupabaseAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
        toast.success('Registrazione completata! Controlla la tua email per confermare l\'account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast.success('Accesso effettuato!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'autenticazione');
    } finally {
      setLoading(false);
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
              Scegli il metodo di autenticazione
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="supabase" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="supabase">Supabase Auth</TabsTrigger>
                <TabsTrigger value="tmwe">TMWE Email</TabsTrigger>
              </TabsList>

              <TabsContent value="supabase" className="space-y-4 pt-4">
                <form onSubmit={handleSupabaseAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tuo@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Caricamento...' : (isSignUp ? 'Registrati' : 'Accedi')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="tmwe" className="space-y-4 pt-4">
                <Button 
                  onClick={handleTMWELogin}
                  className="w-full"
                  size="lg"
                >
                  Accedi con TMWE OAuth2
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Per gestire le email. Verrai reindirizzato alla pagina di autorizzazione.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
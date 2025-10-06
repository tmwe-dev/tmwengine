import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

const IntranetAuth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/intranet');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/intranet');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/intranet`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error logging in:', error);
      toast.error('Errore durante il login: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-3xl font-bold">Intranet Login</CardTitle>
          <CardDescription className="text-base">
            Accedi con il tuo account Google per entrare nell'intranet aziendale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            <Mail className="mr-2 h-5 w-5" />
            Accedi con Google
          </Button>
          
          <p className="text-sm text-muted-foreground text-center mt-6">
            Accedendo, accetti i termini e le condizioni dell'intranet aziendale
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntranetAuth;

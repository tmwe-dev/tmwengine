import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated: isTMWEAuthenticated, isLoading: isTMWELoading } = useTMWEAuth();
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsSupabaseAuthenticated(!!user);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsSupabaseAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const isLoading = isTMWELoading || isCheckingAuth;
  const isAuthenticated = isTMWEAuthenticated || isSupabaseAuthenticated;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Caricamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to /auth
  }

  return <>{children}</>;
};

export default ProtectedRoute;
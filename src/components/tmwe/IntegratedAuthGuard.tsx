import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { initiateAuthorizationCodeFlow } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IntegratedAuthGuardProps {
  children: React.ReactNode;
}

export const IntegratedAuthGuard = ({ children }: IntegratedAuthGuardProps) => {
  const { isAuthenticated, isLoading, userEmail, logout } = useTMWEAuth();
  const navigate = useNavigate();

  // 🔥 Proactive TMWE token expiration check
  useEffect(() => {
    if (!isAuthenticated || !userEmail) return;

    const checkTokenExpiration = async () => {
      try {
        const { data, error } = await supabase
          .from('user_tmwe_credentials')
          .select('expires_at')
          .eq('email', userEmail)
          .maybeSingle();

        if (error) {
          console.error('❌ Error checking token expiration:', error);
          return;
        }

        if (!data || !data.expires_at) {
          console.warn('⚠️ No TMWE token found for user:', userEmail);
          return;
        }

        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        const msUntilExpiry = expiresAt.getTime() - now.getTime();
        const hoursUntilExpiry = msUntilExpiry / 3600000;

        console.log('🔍 Token expiration check:', {
          email: userEmail,
          expiresAt: expiresAt.toISOString(),
          hoursLeft: Math.round(hoursUntilExpiry * 10) / 10,
          status: hoursUntilExpiry < 0 ? 'expired' : hoursUntilExpiry < 24 ? 'expiring soon' : 'valid'
        });

        if (hoursUntilExpiry < 0) {
          // Token TMWE expirado → Forzar re-login
          console.error('❌ TMWE token expired, forcing re-authentication');
          toast.error('Tu sesión TMWE ha expirado. Por favor, inicia sesión nuevamente.', {
            duration: 5000,
          });
          await logout();
          navigate('/auth', { replace: true });
        } else if (hoursUntilExpiry < 24) {
          // Advertencia preventiva
          const hours = Math.round(hoursUntilExpiry);
          toast.warning(`Tu sesión expirará en ${hours} hora${hours !== 1 ? 's' : ''}. Considera reconectarte.`, {
            duration: 8000,
          });
        }
      } catch (err) {
        console.error('❌ Unexpected error in token expiration check:', err);
      }
    };

    // Check immediately
    checkTokenExpiration();
    
    // Check every 10 minutes
    const interval = setInterval(checkTokenExpiration, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, userEmail, logout, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated - show the protected content
  return <>{children}</>;
};

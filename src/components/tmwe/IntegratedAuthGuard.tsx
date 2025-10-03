import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { initiateAuthorizationCodeFlow } from '@/lib/tmwe-api-integrated';

interface IntegratedAuthGuardProps {
  children: React.ReactNode;
}

export const IntegratedAuthGuard = ({ children }: IntegratedAuthGuardProps) => {
  const { isAuthenticated, isLoading } = useTMWEAuth();
  const navigate = useNavigate();

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

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getApiConfig } from '@/lib/tmwe-api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const config = getApiConfig();
    setIsAuthenticated(!!config);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

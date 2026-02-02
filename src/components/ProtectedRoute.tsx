import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // ✅ BYPASS: Accesso autorizzato senza autenticazione
  return <>{children}</>;
};

export default ProtectedRoute;
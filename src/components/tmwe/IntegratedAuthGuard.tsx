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
  // ✅ BYPASS: Accesso autorizzato senza autenticazione
  return <>{children}</>;
};

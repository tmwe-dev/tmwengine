import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedNavButton } from '@/components/ui/animated-nav-button';

interface IntranetNavItemsProps {
  isActive: (path: string) => boolean;
  isCollapsed?: boolean;
}

export const IntranetNavItems = ({ isActive, isCollapsed = false }: IntranetNavItemsProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* Intranet sempre visibile */}
      <AnimatedNavButton
        icon={MessageSquare}
        label="Intranet"
        isActive={isActive('/intranet')}
        isCollapsed={isCollapsed}
        onClick={() => navigate('/intranet')}
        colorScheme="primary"
        className="w-full"
      />

      {/* Dashboard Admin solo per amministratori */}
      {isAdmin && (
        <AnimatedNavButton
          icon={Shield}
          label="Admin Intranet"
          isActive={isActive('/intranet-admin')}
          isCollapsed={isCollapsed}
          onClick={() => navigate('/intranet-admin')}
          colorScheme="primary"
          className="w-full"
        />
      )}
    </>
  );
};

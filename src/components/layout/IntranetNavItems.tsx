import { useEffect, useState } from 'react';
import { MessageSquare, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

interface IntranetNavItemsProps {
  isActive: (path: string) => boolean;
  sidebarOpen?: boolean;
}

export const IntranetNavItems = ({ isActive, sidebarOpen = true }: IntranetNavItemsProps) => {
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
      <a
        href="/intranet"
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
          isActive('/intranet')
            ? 'bg-primary text-primary-foreground shadow-lg'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <MessageSquare className="h-5 w-5" />
        {sidebarOpen && <span>Intranet</span>}
      </a>

      {/* Theme Switcher sotto Intranet */}
      {sidebarOpen && (
        <div className="px-3 py-2">
          <ThemeSwitcher />
        </div>
      )}

      {/* Dashboard Admin solo per amministratori */}
      {isAdmin && (
        <a
          href="/intranet-admin"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            isActive('/intranet-admin')
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Shield className="h-5 w-5" />
          {sidebarOpen && <span>Admin Intranet</span>}
        </a>
      )}
    </>
  );
};

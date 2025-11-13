import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  BookOpen, 
  Calendar, 
  FileText, 
  Mail, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  Upload,
  Shield,
  Database,
  Radio,
  Bot,
  Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const useNavigationGroups = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
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
    }
  };

  return useMemo(() => [
    {
      name: t('nav.commercial'),
      icon: BarChart3,
      items: [
        { name: t('nav.addressBook'), href: '/rubrica', icon: BookOpen },
        { name: t('nav.activities'), href: '/attivita', icon: Calendar },
        { name: t('nav.campaigns'), href: '/campagne', icon: Mail },
      ]
    },
    {
      name: 'Chat & AI',
      icon: MessageSquare,
      items: [
        { name: t('nav.chat'), href: '/chat', icon: MessageSquare },
        { name: 'Claude System Analyst', href: '/chat?page=/system-analyst', icon: Bot },
        { name: t('nav.laboratory'), href: '/chat-laboratory', icon: Sparkles },
        { name: 'Design Lab', href: '/design-lab', icon: Palette },
        { name: 'Radio Chat', href: '/radio-chat', icon: Radio },
        { name: 'Intranet', href: '/intranet', icon: MessageSquare },
        ...(isAdmin ? [{ name: 'Admin Intranet', href: '/intranet-admin', icon: Shield }] : [])
      ]
    },
    {
      name: t('nav.import'),
      icon: Upload,
      items: [
        { name: t('nav.importManagement'), href: '/gestisci-import', icon: Upload },
        { name: t('nav.importedRecords'), href: '/import-templates', icon: FileText },
      ]
    },
    {
      name: 'Email',
      icon: Mail,
      items: [
        { name: 'Email Dashboard', href: '/email-manager', icon: Mail },
        { name: 'FunnEmail', href: '/funnemail', icon: Sparkles },
        { name: t('nav.emailCampaigns'), href: '/email-campagne', icon: Mail },
      ]
    },
    {
      name: 'Impostazioni',
      icon: Settings,
      items: [
        { name: 'Main', href: '/settings', icon: Settings },
        { name: 'DB', href: '/database-settings', icon: Database },
      ]
    }
  ], [t, isAdmin]);
};

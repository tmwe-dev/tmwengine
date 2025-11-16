import { useState } from 'react';
import { PageLayout } from '@/components/design-system';
import { DynamicTabs } from '@/components/design-system/data-display/DynamicTabs';
import { EmailHubQuickStatsAPI } from '@/components/email/api-only/EmailHubQuickStatsAPI';
import { EmailHubGlobalStatsAPI } from '@/components/email/api-only/EmailHubGlobalStatsAPI';
import { EmailHubFolderSelector } from '@/components/email/api-only/EmailHubFolderSelector';
import { BarChart3, FolderTree, Mail } from 'lucide-react';
import { useUserEmail } from '@/hooks/useUserEmail';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

/**
 * EmailHub - Versión API-only de FunEmail
 * ✅ 100% powered by email_search API
 * ✅ Sin sincronización local a email_messages
 * ✅ Performance 5-10x superior
 */
const EmailHub = () => {
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const { data: userEmail, isLoading: isLoadingEmail, error: emailError } = useUserEmail();

  // Verificar autenticación TMWE
  if (isLoadingEmail) {
    return (
      <PageLayout
        title="Email Hub"
        description="Gestión de emails potenciada por API"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (emailError || !userEmail) {
    return (
      <PageLayout
        title="Email Hub"
        description="Gestión de emails potenciada por API"
      >
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
          <AlertDescription>
            Email TMWE no configurado. Por favor, configura tu email en la sección de ajustes.
          </AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  const tabs = [
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          <EmailHubQuickStatsAPI folder={selectedFolder} />
          <EmailHubGlobalStatsAPI />
        </div>
      ),
    },
    {
      value: 'folders',
      label: 'Carpetas',
      icon: FolderTree,
      content: (
        <EmailHubFolderSelector
          selectedFolder={selectedFolder}
          onFolderChange={setSelectedFolder}
        />
      ),
    },
    {
      value: 'management',
      label: 'Gestión',
      icon: Mail,
      content: (
        <div className="text-center py-12 text-muted-foreground">
          Sprint 2: Management Tab (próximamente)
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Email Hub"
      description="Gestión de emails 100% API - Sin sincronización local"
      headerUtilities={
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-700">
          API-Only
        </span>
      }
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Alert className="border-primary/20 bg-primary/5">
          <AlertDescription className="text-sm">
            ⚡ <strong>EmailHub</strong> usa exclusivamente el API email_search - 
            Performance 5-10x superior sin sincronización local.
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <DynamicTabs
          tabs={tabs}
          defaultValue="dashboard"
          className="w-full"
        />
      </div>
    </PageLayout>
  );
};

export default EmailHub;

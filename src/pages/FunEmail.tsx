import { useState, useEffect } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/design-system';
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, Menu, Brain, ArrowLeft, Bug, Sparkles, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FunEmailDownloader } from '@/components/email/FunEmailDownloader';
import { FunEmailQuickStats } from '@/components/email/FunEmailQuickStats';
import { FunEmailChat } from '@/components/email/FunEmailChat';
import { FunEmailGlobalStats } from '@/components/email/FunEmailGlobalStats';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';
import { EmailManagementTab } from '@/components/email/EmailManagementTab';
import { EmailGroupingSuggestionsTab } from '@/components/email/EmailGroupingSuggestionsTab';
import { QuickEmailDownloader } from '@/components/email/QuickEmailDownloader';
import { EmailIntegrityChecker } from '@/components/email/EmailIntegrityChecker';
import { TmweBackendDebugger } from '@/components/email/TmweBackendDebugger';
import { SmartInboxTabIntelligent } from '@/components/email/smart-inbox/SmartInboxTabIntelligent';
import { SmartInboxZeroSync } from '@/components/email/smart-inbox/SmartInboxZeroSync';
import { GradientBackground } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { AISidebarSlider } from '@/components/ai/AISidebarSlider';
import { AISidebarTrigger } from '@/components/ai/AISidebarTrigger';
import { AIAutomationDashboard } from '@/components/email/automation/AIAutomationDashboard';
import { PendingActionsPanel } from '@/components/email/automation/PendingActionsPanel';
import { AIGeneratedActivitiesPanel } from '@/components/email/automation/AIGeneratedActivitiesPanel';
import { AutoExecuteConfigDialog } from '@/components/email/automation/AutoExecuteConfigDialog';
import { LearningDashboard } from '@/components/email/automation/LearningDashboard';
import { EmailCountDiagnostics } from '@/components/email/EmailCountDiagnostics';
import { SingleMailImporter } from '@/components/email/SingleMailImporter';
import { VerifyFolderNames } from '@/components/email/debug/VerifyFolderNames';
import { LucaDownloadTester } from '@/components/email/LucaDownloadTester';
import { ToolsDropdownMenu } from '@/components/email/ToolsDropdownMenu';
import { TMWEMigrationAdmin } from '@/components/email/admin/TMWEMigrationAdmin';
import { ZeroSyncTestPanel } from '@/components/email/testing/ZeroSyncTestPanel';
import { FunEmailNavigation } from '@/components/email/FunEmailNavigation';
import { useCRMLayout } from '@/contexts/CRMLayoutContext';

const FunEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'fun' | 'management' | 'suggestions' | 'quick-download' | 'integrity' | 'debugger' | 'inbox' | 'automations' | 'diagnostics' | 'single-mail' | 'pending-actions' | 'learning' | 'ai-activities' | 'migration' | 'zero-sync-test' | 'zero-sync'>('management');
  const [automationsSubView, setAutomationsSubView] = useState<'dashboard' | 'pending' | 'learning' | 'ai-activities'>('dashboard');
  const [preSelectedFolders, setPreSelectedFolders] = useState<string[]>([]);
  const [isAutoConfigOpen, setIsAutoConfigOpen] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    totalDB: 0,
    folders: [] as { name: string; count: number }[],
  });
  const [isDownloadActive, setIsDownloadActive] = useState(false);
  
  // AI Sidebar globale state
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [selectedSenderForAI, setSelectedSenderForAI] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { menuOpen: crmMenuOpen, setMenuOpen: setCrmMenuOpen } = useCRMLayout();
  
  // Smart Inbox filters
  const [smartInboxFolder, setSmartInboxFolder] = useState('INBOX');
  const [smartInboxUnreadOnly, setSmartInboxUnreadOnly] = useState(false);

  // Proximity detection con isteresi (pattern RadioChat)
  const [isNearLeftEdge, setIsNearLeftEdge] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Zona di attivazione: 0-30px
      if (e.clientX <= 30) {
        setIsNearLeftEdge(true);
      } 
      // Zona di disattivazione: 150px (isteresi)
      else if (e.clientX > 150) {
        setIsNearLeftEdge(false);
      }
      // Tra 30-150px: mantieni stato corrente
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calcola visibilità icone
  const shouldShowLeftIcons = isNearLeftEdge || sidebarOpen || aiSidebarOpen || categoriesOpen;

  // Sincronizza currentView con query param "view" dal CRMLayout
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['quick-download', 'integrity', 'debugger', 'diagnostics', 'single-mail', 'migration', 'zero-sync-test'].includes(viewParam)) {
      setCurrentView(viewParam as typeof currentView);
    }
  }, [searchParams]);

  // Sincronizza currentView con query param "tab" dal CRMLayout
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    
    // Redirect da 'list' deprecato a 'management'
    if (tabParam === 'list') {
      navigate('/funnemail?tab=management', { replace: true });
      return;
    }
    
    if (tabParam && ['fun', 'management', 'suggestions', 'inbox', 'automations', 'zero-sync'].includes(tabParam)) {
      setCurrentView(tabParam as typeof currentView);
    } else if (!tabParam && !searchParams.get('view')) {
      setCurrentView('management'); // Default = Management
    }
  }, [searchParams, navigate]);

  // Chiudi AI sidebar quando cambia tab
  useEffect(() => {
    setAiSidebarOpen(false);
    setSelectedSenderForAI(null);
  }, [currentView]);

  // ✅ Zero-Sync: Query email direttamente da TMWE API
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['fun-email-messages-zerosync', selectedFolder],
    queryFn: async ({ pageParam = 1 }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');
      
      // 🆕 Zero-Sync: Fetch direttamente da TMWE API
      const { emailSearchApi } = await import('@/lib/tmwe-email-search-api');
      const response = await emailSearchApi.getEmailsMetadata({
        folder: selectedFolder,
        page: pageParam,
        limit: 30,
        timeout: 15,
      });
      
      return {
        emails: response.emails?.map((email: any) => ({
          id: String(email.id || email.email_id),
          subject: email.subject || '(No Subject)',
          from: email.from?.email || email.from_email || email.sender || '',
          preview: email.snippet || email.body_preview || '',
          date: email.date || email.received_at || new Date().toISOString(),
          read: email.is_read ?? email.seen ?? false,
          starred: email.is_flagged ?? email.flagged ?? false,
          hasAttachments: email.has_attachments ?? (email.attachment_count > 0),
        })) || [],
        pagination: response.pagination || { page: pageParam, pages: 999, total: response.emails?.length || 0 }
      };
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.emails.length < 30) return undefined;
      return pages.length + 1;
    },
    initialPageParam: 1,
  });

  // Trasforma dati per EmailList
  const emails = messagesData?.pages?.flatMap(page => page?.emails || []) || [];

  // ✅ Zero-Sync: Query dettaglio email da TMWE API
  const { data: emailDetail } = useQuery({
    queryKey: ['fun-email-detail-zerosync', selectedEmailId],
    queryFn: async () => {
      const { emailSearchApi } = await import('@/lib/tmwe-email-search-api');
      const response = await emailSearchApi.getEmailDetail({
        email_id: parseInt(selectedEmailId!),
        include_body: true,
        timeout: 10,
      });
      return response?.email;
    },
    enabled: !!selectedEmailId,
  });

  // Mutua esclusione sidebar (pattern RadioChat)
  // Mutual exclusion: CRM sidebar vs page sidebars
  useEffect(() => {
    if (crmMenuOpen) {
      setSidebarOpen(false);
      setAiSidebarOpen(false);
      setCategoriesOpen(false);
    }
  }, [crmMenuOpen]);

  const handleToggleMenu = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    if (newState) {
      setAiSidebarOpen(false);
      setCategoriesOpen(false);
      setCrmMenuOpen(false);
    }
  };

  const handleToggleAI = () => {
    const newState = !aiSidebarOpen;
    setAiSidebarOpen(newState);
    if (newState) {
      setSidebarOpen(false);
      setCategoriesOpen(false);
      setCrmMenuOpen(false);
    }
  };

  const handleToggleCategories = () => {
    const newState = !categoriesOpen;
    setCategoriesOpen(newState);
    if (newState) {
      setSidebarOpen(false);
      setAiSidebarOpen(false);
      setCrmMenuOpen(false);
    }
  };

  const openAISidebarForSender = (senderEmail: string) => {
    setSelectedSenderForAI(senderEmail);
    setAiSidebarOpen(true);
    setSidebarOpen(false);
    setCategoriesOpen(false);
  };

  const handlePromptCreatedGlobal = async (promptData: {
    prompt_name: string;
    system_prompt: string;
    sender_email?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: newPrompt, error } = await supabase
        .from('ai_prompt_library')
        .insert({
          prompt_name: promptData.prompt_name,
          system_prompt: promptData.system_prompt,
          created_by: user.id,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (promptData.sender_email && newPrompt) {
        await supabase
          .from('email_sender_ai_prompts')
          .insert({
            sender_email: promptData.sender_email,
            ai_prompt: promptData.system_prompt,
            prompt_library_id: newPrompt.id,
            prompt_name: promptData.prompt_name,
            user_id: user.id,
          });
      }

      console.log('✅ Prompt salvato:', newPrompt);
    } catch (error) {
      console.error('❌ Errore salvataggio prompt:', error);
    }
  };

  const isToolView = ['quick-download', 'integrity', 'debugger', 'diagnostics', 'single-mail', 'migration', 'zero-sync-test'].includes(currentView);

  return (
    <PageLayout 
      gradient={true}
      contentClassName="p-0 max-w-none"
      title={
        isToolView ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentView('management');
              navigate('/funnemail?tab=management');
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna a Fun Email
          </Button>
        ) : null
      }
      actions={
        !isToolView ? (
          <ToolsDropdownMenu />
        ) : null
      }
    >
      {/* Tab Navigation - solo per view principali */}
      {!isToolView && (
        <FunEmailNavigation currentView={currentView as 'fun' | 'management' | 'suggestions' | 'inbox' | 'automations' | 'zero-sync'} />
      )}
      <div className="relative w-full min-h-screen">
        {/* 2 Icone Verticali - solo in view inbox */}
        {currentView === 'inbox' && (
          <>
            {/* Inbox/Categories Icon - Top */}
            <button
              onClick={handleToggleCategories}
              className={cn(
                "fixed left-0 bottom-[13rem] z-40 w-12 h-20 bg-white/5 rounded-r-md",
                "flex items-center justify-center transition-all duration-300 hover:bg-white/10",
                categoriesOpen && "translate-x-[280px]",
                !shouldShowLeftIcons && !categoriesOpen && "hidden"
              )}
            >
              <span className="text-2xl">📬</span>
            </button>

            {/* AI Icon - Bottom (20px gap) */}
            <AISidebarTrigger
              isOpen={aiSidebarOpen}
              onToggle={handleToggleAI}
              hasActiveConversation={selectedSenderForAI !== null}
              className={cn(
                "fixed left-0 bottom-[7.5rem] z-40 transition-all duration-300",
                aiSidebarOpen && "translate-x-[320px]",
                !shouldShowLeftIcons && !aiSidebarOpen && "hidden"
              )}
            />
          </>
        )}

        {/* Content - condizionale in base alla view */}
        <div className="w-full">
          {currentView === 'fun' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* COLONNA SINISTRA: Stats Globali + Downloader + Quick Stats */}
              <div className="lg:col-span-1 space-y-4">
                <FunEmailGlobalStats
                  totalDB={globalStats.totalDB}
                  folders={globalStats.folders}
                />
                <FunEmailDownloader onStatsUpdate={setGlobalStats} />
                <FunEmailQuickStats />
              </div>

              {/* COLONNA DESTRA: Chat AI */}
              <div className="lg:col-span-2">
                <Card className="h-[calc(100vh-12rem)]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>AI Email Assistant</CardTitle>
                    <UnifiedAICommunicationBadge pageRoute="/funnemail" />
                  </CardHeader>
                  <CardContent className="h-[calc(100%-5rem)] overflow-hidden">
                    <FunEmailChat />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : currentView === 'management' ? (
            <GradientBackground variant="primary" intensity="medium" className="h-[calc(100vh-8rem)]">
              <EmailManagementTab onOpenAISidebar={openAISidebarForSender} />
            </GradientBackground>
          ) : currentView === 'suggestions' ? (
            <GradientBackground variant="primary" intensity="medium" className="h-[calc(100vh-8rem)]">
              <EmailGroupingSuggestionsTab />
            </GradientBackground>
          ) : currentView === 'quick-download' ? (
            <div className="p-6">
              <QuickEmailDownloader
                preSelectedFolders={preSelectedFolders}
                onDownloadComplete={(stats) => {
                  console.log('✅ Quick download completato:', stats);
                  setPreSelectedFolders([]);
                }}
                onStatsUpdate={(stats) => {
                  console.log('📊 Stats aggiornate:', stats);
                }}
                onDownloadStatusChange={setIsDownloadActive}
              />
            </div>
          ) : currentView === 'integrity' ? (
            <div className="p-6">
              <EmailIntegrityChecker 
                isDownloadActive={isDownloadActive}
                onRequestDownload={(folderNames) => {
              console.log('🎯 [FunEmail] Pre-selecting folders FIRST:', folderNames);
              
              // ✅ Step 1: Setta folders PRIMA
              setPreSelectedFolders(folderNames);
              
              // ✅ Step 2: Delay per propagazione state
              setTimeout(() => {
                console.log('🎯 [FunEmail] Now switching to Quick Download view');
                setCurrentView('quick-download');
              }, 50);
            }}
              />
            </div>
          ) : currentView === 'debugger' ? (
            <div className="p-6 max-w-4xl mx-auto">
              <TmweBackendDebugger />
            </div>
          ) : currentView === 'diagnostics' ? (
            <div className="p-6 max-w-4xl mx-auto">
              <EmailCountDiagnostics />
            </div>
          ) : currentView === 'single-mail' ? (
            <div className="p-6 space-y-4">
              <LucaDownloadTester />
              <VerifyFolderNames />
              {/* Force rebuild - SingleMailImporter - 2025-11-05 07:55 */}
              <SingleMailImporter />
            </div>
          ) : currentView === 'migration' ? (
            <div className="p-6 max-w-4xl mx-auto">
              <TMWEMigrationAdmin />
            </div>
          ) : currentView === 'zero-sync-test' ? (
            <div className="p-6 max-w-6xl mx-auto">
              <ZeroSyncTestPanel />
            </div>
          ) : currentView === 'zero-sync' ? (
            <GradientBackground variant="primary" intensity="medium" className="h-[calc(100vh-8rem)]">
              <SmartInboxZeroSync onOpenAISidebar={openAISidebarForSender} />
            </GradientBackground>
          ) : currentView === 'inbox' ? (
            <GradientBackground variant="primary" intensity="medium" className="h-[calc(100vh-8rem)] p-4">
              <SmartInboxTabIntelligent 
                onOpenAISidebar={openAISidebarForSender}
                categoriesOpen={categoriesOpen}
                onCategoriesOpenChange={setCategoriesOpen}
                selectedFolder={smartInboxFolder}
                unreadOnly={smartInboxUnreadOnly}
                onFolderChange={setSmartInboxFolder}
                onUnreadOnlyChange={setSmartInboxUnreadOnly}
              />
            </GradientBackground>
          ) : currentView === 'automations' ? (
            <GradientBackground variant="primary" intensity="medium" className="min-h-screen">
              <div className="p-6 space-y-4">
                {/* Sub-navigation for automations */}
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant={automationsSubView === 'dashboard' ? 'default' : 'outline'}
                    onClick={() => setAutomationsSubView('dashboard')}
                    size="sm"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant={automationsSubView === 'pending' ? 'default' : 'outline'}
                    onClick={() => setAutomationsSubView('pending')}
                    size="sm"
                  >
                    Clock Pending Actions
                  </Button>
                  <Button
                    variant={automationsSubView === 'learning' ? 'default' : 'outline'}
                    onClick={() => setAutomationsSubView('learning')}
                    size="sm"
                  >
                    📊 Learning Insights
                  </Button>
                  <Button
                    variant={automationsSubView === 'ai-activities' ? 'default' : 'outline'}
                    onClick={() => setAutomationsSubView('ai-activities')}
                    size="sm"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Activities
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAutoConfigOpen(true)}
                    size="sm"
                    className="ml-auto"
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Auto-Execute Settings
                  </Button>
                </div>

                {/* Conditional rendering based on sub-view */}
                {automationsSubView === 'dashboard' && <AIAutomationDashboard />}
                {automationsSubView === 'pending' && <PendingActionsPanel />}
                {automationsSubView === 'learning' && <LearningDashboard />}
                {automationsSubView === 'ai-activities' && <AIGeneratedActivitiesPanel />}
              </div>
            </GradientBackground>
          ) : currentView === 'pending-actions' ? (
            <div className="p-6">
              <PendingActionsPanel />
            </div>
          ) : null}
        </div>

      </div>

      {/* Dettaglio Email (Overlay) */}
      {selectedEmailId && emailDetail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-4 z-50 bg-background border rounded-lg shadow-lg overflow-auto">
            <div className="sticky top-0 z-10 bg-background border-b p-4 flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEmailId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EmailDetail
              email={{
                id: emailDetail.id,
                subject: emailDetail.subject || '(No Subject)',
                from: emailDetail.from_email || '',
                to: (typeof emailDetail.to_email === 'string' ? emailDetail.to_email.split(',') : []),
                cc: (typeof emailDetail.cc_email === 'string' ? emailDetail.cc_email.split(',') : []),
                date: emailDetail.data_ricezione,
                body: (typeof emailDetail.body_html === 'string' ? emailDetail.body_html : (typeof emailDetail.body_text === 'string' ? emailDetail.body_text : '')),
                attachments: Array.isArray(emailDetail.attachments) ? emailDetail.attachments : [],
              }}
              onReply={() => {}}
              onReplyAll={() => {}}
              onForward={() => {}}
              onDelete={() => setSelectedEmailId(null)}
              onBack={() => setSelectedEmailId(null)}
            />
          </div>
        </div>
      )}

      {/* AI Sidebar Globale - disponibile in tutte le view email */}
      {!['quick-download', 'integrity', 'debugger', 'diagnostics', 'single-mail'].includes(currentView) && (
        <AISidebarSlider
          isOpen={aiSidebarOpen}
          onClose={handleToggleAI}
          onToggle={handleToggleAI}
          senderEmail={selectedSenderForAI}
          onPromptCreated={handlePromptCreatedGlobal}
          hideButton={true}
          enableAudio={true}
          conversationId={`funnemail-${selectedSenderForAI || 'general'}`}
        />
      )}

      {/* Auto-Execute Config Dialog */}
      <AutoExecuteConfigDialog
        open={isAutoConfigOpen}
        onOpenChange={setIsAutoConfigOpen}
      />

    </PageLayout>
  );
};


export default FunEmail;

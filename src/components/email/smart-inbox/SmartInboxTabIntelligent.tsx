import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartInboxHeaderIntelligent } from './SmartInboxHeaderIntelligent';
import { SmartEmailListIntelligent } from './SmartEmailListIntelligent';
import { EmptyDetailPanel } from './EmptyDetailPanel';
import { CollapsibleCategorySidebar } from './CollapsibleCategorySidebar';
import { AIActionsSidebar } from './AIActionsSidebar';
import { AIPromptDialog } from './AIPromptDialog';
import { AIActionConfirmation } from './AIActionConfirmation';
import { EmailClassifierPromptEditor } from './EmailClassifierPromptEditor';
import { ViewModeSelector, ViewMode } from './ViewModeSelector';
import { BulkActionsBarVertical } from './BulkActionsBarVertical';
import React from 'react';
import { ClassifiedEmail, EmailMetadata } from '@/types/smart-inbox';
import { useSmartClassificationIntelligent } from '@/hooks/useSmartClassificationIntelligent';
import { useGlobalAIAgent } from '@/hooks/useGlobalAIAgent';
import { useEmailAIAutomation } from '@/hooks/useEmailAIAutomation';
import { useEmailAIProcessor } from '@/hooks/useEmailAIProcessor';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getCategoryIcon, getCategoryColor } from '@/lib/smart-inbox-utils';
import { cn } from '@/lib/utils';
import { SmartEmailDetailPanel } from './SmartEmailDetailPanel';

interface SmartInboxTabIntelligentProps {
  onOpenAISidebar?: (senderEmail: string) => void;
  categoriesOpen: boolean;
  onCategoriesOpenChange: (open: boolean) => void;
  selectedFolder: string;
  unreadOnly: boolean;
  onFolderChange: (folder: string) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
}

export const SmartInboxTabIntelligent = ({ 
  onOpenAISidebar,
  categoriesOpen,
  onCategoriesOpenChange,
  selectedFolder,
  unreadOnly,
  onFolderChange,
  onUnreadOnlyChange
}: SmartInboxTabIntelligentProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<ClassifiedEmail | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const { selectedAgent, setSelectedAgent } = useGlobalAIAgent();  // 🆕 Global AI Agent
  
  // Clean View Mode State
  const [cleanViewMode, setCleanViewMode] = useState(() => {
    const saved = localStorage.getItem('email-view-mode');
    return saved === 'clean';
  });
  
  // AI Automation State
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptViewerOpen, setPromptViewerOpen] = useState(false);
  
  // Auto-switch to split if detail mode but no email selected
  useEffect(() => {
    if (viewMode === 'detail' && !selectedEmail) {
      setViewMode('split');
    }
  }, [viewMode, selectedEmail]);

  // Persistere preferenza vista pulita
  useEffect(() => {
    localStorage.setItem('email-view-mode', cleanViewMode ? 'clean' : 'intelligent');
  }, [cleanViewMode]);

  // ✅ Navigazione tra email con swipe
  const navigateToNextEmail = () => {
    if (!selectedEmail) return;
    
    const currentIndex = classifiedEmails.findIndex(
      e => e.classification.id === selectedEmail.classification.id
    );
    
    if (currentIndex < classifiedEmails.length - 1) {
      const nextEmail = classifiedEmails[currentIndex + 1];
      setSelectedEmail(nextEmail);
      setSelectedSender(nextEmail.classification.sender_email);
      toast.success('📧 Email successiva', { duration: 1500 });
    } else {
      toast.info('📭 Ultima email raggiunta', { duration: 1500 });
    }
  };

  const navigateToPreviousEmail = () => {
    if (!selectedEmail) return;
    
    const currentIndex = classifiedEmails.findIndex(
      e => e.classification.id === selectedEmail.classification.id
    );
    
    if (currentIndex > 0) {
      const prevEmail = classifiedEmails[currentIndex - 1];
      setSelectedEmail(prevEmail);
      setSelectedSender(prevEmail.classification.sender_email);
      toast.success('📧 Email precedente', { duration: 1500 });
    } else {
      toast.info('📭 Prima email raggiunta', { duration: 1500 });
    }
  };
  
  const { classifyEmails, isClassifying, progress } = useSmartClassificationIntelligent();
  const { createSimpleAction, applyAIPromptToSender } = useEmailAIAutomation();
  const { currentProposal, processEmailWithAI, clearProposal } = useEmailAIProcessor();

  // Fetch user email
  const { data: userEmail } = useQuery({
    queryKey: ['user-email'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || '';
    },
  });

  // Fetch available folders
  const { data: availableFolders = [] } = useQuery({
    queryKey: ['available-folders', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      
      const { data, error } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', userEmail)
        .not('cartella', 'is', null);
      
      if (error) {
        console.error('Error fetching folders:', error);
        return [];
      }
      
      const uniqueFolders = Array.from(new Set(data.map(d => d.cartella)));
      return uniqueFolders.sort();
    },
    enabled: !!userEmail
  });

  // ✅ Query separata per statistiche categorie (NON filtrata per categoria selezionata)
  const { data: categoryCounts = [] } = useQuery({
    queryKey: ['category-counts', userEmail, selectedFolder],
    queryFn: async () => {
      if (!userEmail || !selectedFolder) return [];
      
      const { data, error } = await supabase
        .from('email_ai_classifications')
        .select('category')
        .eq('user_email', userEmail)
        .eq('folder_name', selectedFolder)
        .not('email_id', 'is', null);
      
      if (error) throw error;
      
      // Conta occorrenze per categoria
      const categoryMap = new Map<string, number>();
      data.forEach(item => {
        const count = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, count + 1);
      });
      
      return Array.from(categoryMap.entries()).map(([category, count]) => ({
        id: category,
        name: category,
        icon: getCategoryIcon(category),
        color: getCategoryColor(category),
        count
      }));
    },
    enabled: !!userEmail && !!selectedFolder
  });

  // ✅ Fetch email classificate con JOIN a email_messages
  const { data: classifiedEmails = [], isLoading, refetch } = useQuery({
    queryKey: ['smart-inbox-intelligent', userEmail, selectedCategory, selectedFolder, unreadOnly],
    queryFn: async () => {
      if (!userEmail) return [];

      // 1️⃣ Query classificazioni con filtri
      let classificationsQuery = supabase
        .from('email_ai_classifications')
        .select('*')
        .eq('user_email', userEmail)
        .not('email_id', 'is', null);

      // Filtro cartella
      if (selectedFolder) {
        classificationsQuery = classificationsQuery.eq('folder_name', selectedFolder);
      }

      // Filtro categoria
      if (selectedCategory !== 'all') {
        classificationsQuery = classificationsQuery.eq('category', selectedCategory);
      }

      // Ordine
      classificationsQuery = classificationsQuery.order('created_at', { ascending: false });

      const { data: classifications, error: classError } = await classificationsQuery;

      if (classError) throw classError;
      if (!classifications || classifications.length === 0) return [];

      // 2️⃣ Estrai email_id univoci
      const emailIds = [...new Set(classifications.map(c => c.email_id).filter(Boolean))];

      // 3️⃣ Query email_messages
      const { data: emailMessages, error: emailError } = await supabase
        .from('email_messages')
        .select('id, subject, from_email, to_email, body_text, body_html, data_ricezione, stato, attachments')
        .in('id', emailIds);

      if (emailError) throw emailError;

      // 4️⃣ Crea mappa per lookup O(1)
      const emailMap = new Map(
        (emailMessages || []).map(email => [email.id, email])
      );

      // 5️⃣ Merge classificazioni + email
      return classifications.map(classification => {
        const emailData = emailMap.get(classification.email_id);
        
        // Fallback se email non trovata
        if (!emailData) {
          console.warn(`⚠️ Email ${classification.email_id} non trovata per classificazione ${classification.id}`);
          return {
            classification: {
              id: classification.id,
              email_message_id: classification.email_id,
              email_uid: classification.email_uid,
              folder_name: classification.folder_name,
              user_email: classification.user_email,
              category: classification.category,
              confidence: classification.confidence,
              ai_summary: classification.ai_summary,
              keywords: classification.keywords,
              sender_email: classification.sender_email,
              sender_domain: classification.sender_domain,
              sender_logo_url: classification.sender_logo_url,
              is_verified: classification.is_verified || false,
              created_at: classification.created_at,
              updated_at: classification.updated_at
            },
            email: {
              uid: classification.email_uid || classification.email_id,
              email_id: classification.email_id,
              subject: 'Email non disponibile',
              from: { email: classification.sender_email || 'unknown' },
              to: [],
              body_text: '',
              body_html: '',
              read: false,
              has_attachments: false,
              date: classification.created_at,
              folder_name: classification.folder_name || 'INBOX'
            }
          };
        }
        
        // Merge con dati reali
        return {
          classification: {
            id: classification.id,
            email_message_id: classification.email_id,
            email_uid: classification.email_uid,
            folder_name: classification.folder_name,
            user_email: classification.user_email,
            category: classification.category,
            confidence: classification.confidence,
            ai_summary: classification.ai_summary,
            keywords: classification.keywords,
            sender_email: classification.sender_email,
            sender_domain: classification.sender_domain,
            sender_logo_url: classification.sender_logo_url,
            is_verified: classification.is_verified || false,
            created_at: classification.created_at,
            updated_at: classification.updated_at
          },
          email: {
            uid: classification.email_uid || emailData.id,
            email_id: emailData.id,
            subject: emailData.subject,
            from: emailData.from_email 
              ? { email: emailData.from_email } 
              : { email: classification.sender_email || 'unknown' },
            to: emailData.to_email 
              ? [{ email: emailData.to_email }] 
              : [],
            body_text: emailData.body_text || '',
            body_html: emailData.body_html || '',
            read: emailData.stato !== 'nuovo',
            has_attachments: Array.isArray(emailData.attachments) && emailData.attachments.length > 0,
            date: emailData.data_ricezione || classification.created_at,
            folder_name: classification.folder_name || 'INBOX'
          }
        };
      }) as ClassifiedEmail[];
    },
    enabled: !!userEmail,
  });

  // FASE 2: Calcola statistiche categorie dalla query dedicata
  const categoryStats = React.useMemo(() => {
    if (!categoryCounts || categoryCounts.length === 0) return [];
    
    // Ordina per priorità + conteggio
    return [...categoryCounts].sort((a, b) => {
      const priority = ['Preventivi', 'Fatture', 'Rate', 'Bolle', 'Documenti'];
      const aIdx = priority.indexOf(a.name);
      const bIdx = priority.indexOf(b.name);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return b.count - a.count;
    });
  }, [categoryCounts]);

  const unverifiedCount = classifiedEmails.filter(
    e => !e.classification.is_verified || e.classification.confidence < 0.8
  ).length;

  const handleClassifyNew = async () => {
    console.log('🔍 [DEBUG] Classifica Nuove cliccato');
    
    if (!userEmail) {
      console.error('❌ [DEBUG] Utente non autenticato');
      toast.error('Utente non autenticato');
      return;
    }

    try {
      console.log('📧 [DEBUG] Recupero email NON classificate dal DB locale...');
      
      // ✅ Recupera email NON classificate dal DB locale
      // Step 1: Fetch all classified email IDs
      const { data: classifiedIds, error: classifiedError } = await supabase
        .from('email_ai_classifications')
        .select('email_id')
        .not('email_id', 'is', null);

      if (classifiedError) {
        console.error('❌ [DEBUG] Error fetching classified IDs:', classifiedError);
        toast.error('Errore nel recupero classificazioni');
        return;
      }

      const classifiedSet = new Set(classifiedIds?.map(c => c.email_id) || []);
      console.log('📊 [DEBUG] Email già classificate:', classifiedSet.size);

      // Step 2: Fetch all emails from folder
      let allEmailsQuery = supabase
        .from('email_messages')
        .select('id, subject, from_email')
        .eq('user_email', userEmail)
        .eq('cartella', selectedFolder);

      if (unreadOnly) {
        allEmailsQuery = allEmailsQuery.eq('stato', 'nuovo');
      }

      const { data: allEmails, error: fetchError } = await allEmailsQuery;

      if (fetchError) {
        console.error('❌ [DEBUG] Error fetching emails:', fetchError);
        toast.error('Errore nel recupero email');
        return;
      }

      // Step 3: Filter unclassified emails in memory
      const unclassifiedEmails = allEmails?.filter(email => !classifiedSet.has(email.id)).slice(0, 100);

      console.log('📬 [DEBUG] Email non classificate trovate:', unclassifiedEmails?.length || 0);

      if (!unclassifiedEmails || unclassifiedEmails.length === 0) {
        toast.info('Nessuna nuova email da classificare');
        return;
      }

      toast.success(`Trovate ${unclassifiedEmails.length} email da classificare`);
      console.log('🚀 [DEBUG] Avvio classificazione...');

      // ✅ Classifica usando solo gli ID (UUID) + selected_agent
      await classifyEmails(
        unclassifiedEmails.map(e => e.id),
        userEmail,
        undefined,  // forceCategory
        selectedAgent  // 🆕 Global AI Agent
      );

      // Ricarica lista dopo classificazione
      refetch();
      console.log('✅ [DEBUG] Classificazione completata');
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Error in handleClassifyNew:', error);
      toast.error(`Errore durante la classificazione: ${error.message}`);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedEmails.size === 0) return;
    
    console.log('📦 Archiviando email selezionate:', Array.from(selectedEmails));
    toast.success(`📦 ${selectedEmails.size} email archiviate`);
    setSelectedEmails(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedEmails.size === 0) return;
    
    console.log('🗑️ Eliminando email selezionate:', Array.from(selectedEmails));
    toast.success(`🗑️ ${selectedEmails.size} email eliminate`);
    setSelectedEmails(new Set());
  };

  const handleMoveSelected = async (categoryId: string) => {
    if (selectedEmails.size === 0) return;
    
    const category = categoryStats.find(c => c.id === categoryId);
    console.log(`📁 Spostando ${selectedEmails.size} email → ${category?.name || categoryId}`);
    toast.success(`📁 ${selectedEmails.size} email spostate in ${category?.name || categoryId}`);
    setSelectedEmails(new Set());
  };

  const handleBulkClassify = async (category: string) => {
    if (!userEmail || selectedEmails.size === 0) return;

    // ✅ Raccogli gli email_id (UUID) per riclassificazione
    const emailIds: string[] = Array.from(selectedEmails)
      .map(uid => {
        const email = classifiedEmails.find(e => e.email.uid === uid);
        return email?.email.email_id;
      })
      .filter(Boolean) as string[];

    if (emailIds.length === 0) {
      toast.error('Nessuna email valida selezionata');
      return;
    }

    await classifyEmails(
      emailIds, 
      userEmail, 
      category,
      selectedAgent  // 🆕 Global AI Agent
    );
    setSelectedEmails(new Set());
    refetch();
  };

  // Handler per selezione email (aggiorna selectedSender)
  const handleEmailSelect = (email: ClassifiedEmail) => {
    setSelectedEmail(email);
    setSelectedSender(email.classification.sender_email);
  };

  // Handler per azioni AI dalla sidebar
  const handleActionSelect = async (
    action: 'archive' | 'delete' | 'move' | 'ai-prompt',
    promptId?: string
  ) => {
    if (!selectedSender) {
      toast.error('Seleziona prima un mittente');
      return;
    }

    switch (action) {
      case 'archive':
        await createSimpleAction(selectedSender, 'archive');
        break;
      case 'delete':
        await createSimpleAction(selectedSender, 'delete');
        break;
      case 'move':
        await createSimpleAction(selectedSender, 'move');
        break;
      case 'ai-prompt':
        if (promptId) {
          await applyAIPromptToSender(selectedSender, promptId);
        } else {
          setPromptDialogOpen(true);
        }
        break;
    }
  };

  const handleConfirmProposal = async () => {
    if (!currentProposal) return;

    try {
      // Chiamata edge function per eseguire azioni
      const { error } = await supabase.functions.invoke('execute-ai-actions', {
        body: { log_id: currentProposal.logId }
      });

      if (error) throw error;

      toast.success('✅ Azioni eseguite con successo!');
      clearProposal();
      refetch();
    } catch (error: any) {
      console.error('Execute actions error:', error);
      toast.error('Errore esecuzione azioni: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)] w-[95%] max-w-[1600px] mx-auto gap-4 relative">
      {/* Selettore Vista Galleggiante - Centrato sopra l'header */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 z-50 -mt-2">
        <ViewModeSelector value={viewMode} onChange={setViewMode} />
      </div>

      {/* Barra Azioni Verticale - Galleggiante a sinistra */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
        <BulkActionsBarVertical
          selectedCount={selectedEmails.size}
          categories={categoryStats}
          onArchive={handleArchiveSelected}
          onDelete={handleDeleteSelected}
          onMove={handleMoveSelected}
          onBulkClassify={handleBulkClassify}
        />
      </div>

      {/* Header compatto - solo Barra Azioni */}
        <SmartInboxHeaderIntelligent
          categories={categoryStats}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onClassifyNew={handleClassifyNew}
          isClassifying={isClassifying}
          classificationProgress={progress}
          unverifiedCount={unverifiedCount}
        />
      
      {/* 🆕 Layout 2 Colonne: Lista Email | Dettaglio + Sidebar Collassabile */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar Categorie Collassabile (controllata da FunEmail) */}
        <CollapsibleCategorySidebar
          categories={categoryStats}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          unverifiedCount={unverifiedCount}
          isOpen={categoriesOpen}
          onOpenChange={onCategoriesOpenChange}
          selectedFolder={selectedFolder}
          unreadOnly={unreadOnly}
          onFolderChange={onFolderChange}
          onUnreadOnlyChange={onUnreadOnlyChange}
          availableFolders={availableFolders}
          onClassifyNew={handleClassifyNew}
          isClassifying={isClassifying}
          onPromptViewerChange={setPromptViewerOpen}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
          cleanViewMode={cleanViewMode}
          onToggleCleanView={() => setCleanViewMode(!cleanViewMode)}
        />

        {/* Colonna 1: Lista Email - MAX 40% larghezza in split, 100% centrata in list */}
        <div 
          className={cn(
            "flex flex-col min-h-0 transition-all duration-300",
            viewMode === 'list' && "mx-auto w-full max-w-4xl"
          )}
          style={{
            width: viewMode === 'detail' ? '0%' : viewMode === 'list' ? '100%' : 'clamp(350px, 40%, 600px)',
            minWidth: viewMode === 'split' ? '350px' : undefined,
            opacity: viewMode === 'detail' ? 0 : 1,
            overflow: viewMode === 'detail' ? 'hidden' : 'auto',
            pointerEvents: viewMode === 'detail' ? 'none' : 'auto'
          }}
        >
          <SmartEmailListIntelligent
            emails={classifiedEmails}
            onEmailClick={handleEmailSelect}
            isLoading={isLoading}
            selectedEmails={selectedEmails}
            onSelectionChange={setSelectedEmails}
          />
        </div>
        
        {/* Colonna 2: Dettaglio Email - CSS dinamico basato su viewMode */}
        <div 
          className={cn(
            "flex flex-col min-h-0 transition-all duration-300",
            viewMode === 'detail' && "mx-auto"
          )}
          style={{
            width: viewMode === 'list' ? '0%' : viewMode === 'detail' ? '100%' : 'calc(60% - 1rem)',
            maxWidth: viewMode === 'detail' ? '90%' : '100%',
            opacity: viewMode === 'list' ? 0 : 1,
            overflow: viewMode === 'list' ? 'hidden' : 'visible',
            pointerEvents: viewMode === 'list' ? 'none' : 'auto',
            touchAction: 'pan-y'
          }}
        >
          {selectedEmail ? (
            <SmartEmailDetailPanel
              classifiedEmail={selectedEmail}
              onClose={() => {
                setSelectedEmail(null);
                setSelectedSender(null);
              }}
              viewMode={viewMode}
              currentIndex={classifiedEmails.findIndex(
                e => e.classification.id === selectedEmail.classification.id
              )}
              totalEmails={classifiedEmails.length}
              onNavigateNext={navigateToNextEmail}
              onNavigatePrev={navigateToPreviousEmail}
              cleanViewMode={cleanViewMode}
              onToggleCleanView={() => setCleanViewMode(!cleanViewMode)}
            />
          ) : (
            <EmptyDetailPanel />
          )}
        </div>
      </div>

      {/* AI Action Confirmation */}
      {currentProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <AIActionConfirmation
              logId={currentProposal.logId}
              emailInfo={{
                subject: selectedEmail?.email.subject || '',
                from: selectedEmail?.classification.sender_email || '',
                preview: selectedEmail?.email.body_preview || ''
              }}
              proposal={currentProposal.proposal}
              onConfirm={handleConfirmProposal}
              onReject={clearProposal}
            />
          </div>
        </div>
      )}

      {/* AI Prompt Dialog */}
      <AIPromptDialog
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
        senderEmail={selectedSender}
        onPromptCreated={() => {
          toast.success('Prompt AI creato!');
          setPromptDialogOpen(false);
        }}
      />

      {/* Dialog Prompt Editor */}
      <EmailClassifierPromptEditor 
        open={promptViewerOpen}
        onOpenChange={setPromptViewerOpen}
      />
    </div>
  );
};
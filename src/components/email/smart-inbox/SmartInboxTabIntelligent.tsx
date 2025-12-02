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

  // 🆕 ZERO-SYNC: Fetch available folders from TMWE API
  const { data: availableFolders = [] } = useQuery({
    queryKey: ['available-folders-zerosync', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      
      console.log('🌐 [Zero-Sync] Fetching folders from TMWE API...');
      const response = await emailSearchApi.getFolders({ include_counts: true });
      
      if (!response?.folders) {
        console.warn('⚠️ [Zero-Sync] No folders returned from API');
        return [];
      }
      
      const folderNames = response.folders
        .map((f: any) => f.folder_name || f.name)
        .filter(Boolean)
        .sort();
      
      console.log('✅ [Zero-Sync] Loaded', folderNames.length, 'folders from API');
      return folderNames;
    },
    enabled: !!userEmail,
    staleTime: 60000 // 1 minute cache
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

  // ✅ Fetch email classificate - usando TMWE API per dettagli quando tmwe_email_id disponibile
  const { data: classifiedEmails = [], isLoading, refetch } = useQuery({
    queryKey: ['smart-inbox-intelligent', userEmail, selectedCategory, selectedFolder, unreadOnly],
    queryFn: async () => {
      if (!userEmail) return [];

      // 1️⃣ Query classificazioni con filtri (incluso tmwe_email_id)
      let classificationsQuery = supabase
        .from('email_ai_classifications')
        .select('*')
        .eq('user_email', userEmail);

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

      // 2️⃣ Separar clasificaciones por tipo de identificador
      const withTmweId = classifications.filter(c => c.tmwe_email_id);
      const withLocalId = classifications.filter(c => !c.tmwe_email_id && c.email_id);

      // 3️⃣ Fetch email metadata from TMWE API para las que tienen tmwe_email_id
      let tmweEmailMap = new Map<number, any>();
      if (withTmweId.length > 0) {
        try {
          // Batch fetch usando TMWE API search (más eficiente)
          const tmweIds = withTmweId.map(c => c.tmwe_email_id as number);
          console.log('📧 Fetching', tmweIds.length, 'emails from TMWE API...');
          
          // Fetch en paralelo (máximo 10 simultáneos)
          const batchSize = 10;
          for (let i = 0; i < tmweIds.length; i += batchSize) {
            const batch = tmweIds.slice(i, i + batchSize);
            const results = await Promise.allSettled(
              batch.map(id => emailSearchApi.getEmailDetail({ 
                email_id: id, 
                include_body: false,
                timeout: 5
              }))
            );
            
            results.forEach((result, idx) => {
              if (result.status === 'fulfilled' && result.value?.email) {
                tmweEmailMap.set(batch[idx], result.value.email);
              }
            });
          }
          console.log('✅ TMWE API returned', tmweEmailMap.size, 'emails');
        } catch (err) {
          console.error('⚠️ TMWE API batch fetch error:', err);
        }
      }

      // 4️⃣ 🆕 Zero-Sync: Solo metadatos de clasificación, NO fallback a DB local
      // Las clasificaciones sin tmwe_email_id simplemente mostrarán metadatos básicos

      // 5️⃣ 🆕 Zero-Sync: Merge clasificaciones + datos de email (solo TMWE API)
      return classifications.map(classification => {
        // Solo usar TMWE API data
        const tmweEmail = classification.tmwe_email_id ? tmweEmailMap.get(classification.tmwe_email_id) : null;
        
        const baseClassification = {
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
          updated_at: classification.updated_at,
          tmwe_email_id: classification.tmwe_email_id
        };

        // 🆕 Zero-Sync: Usar TMWE data o metadatos de clasificación
        if (tmweEmail) {
          return {
            classification: baseClassification,
            email: {
              uid: classification.email_uid || String(classification.tmwe_email_id),
              email_id: classification.email_id,
              tmwe_email_id: classification.tmwe_email_id,
              subject: tmweEmail.subject || 'Sin asunto',
              from: tmweEmail.from || { email: classification.sender_email || 'unknown' },
              to: tmweEmail.to || [],
              body_preview: tmweEmail.snippet || tmweEmail.body_preview || '',
              body_text: '',
              body_html: '',
              read: tmweEmail.is_read ?? tmweEmail.seen ?? false,
              has_attachments: tmweEmail.has_attachments ?? (tmweEmail.attachment_count > 0),
              date: tmweEmail.date || classification.created_at,
              folder_name: classification.folder_name || 'INBOX'
            }
          };
        }

        // Fallback: Solo metadatos de clasificación (sin datos completos de email)
        return {
          classification: baseClassification,
          email: {
            uid: classification.email_uid || classification.email_id || classification.id,
            email_id: classification.email_id,
            tmwe_email_id: classification.tmwe_email_id,
            subject: classification.subject || 'Email no disponible',
            from: { email: classification.sender_email || 'unknown' },
            to: [],
            body_preview: classification.body_preview || '',
            body_text: '',
            body_html: '',
            read: false,
            has_attachments: classification.has_attachments || false,
            date: classification.email_date || classification.created_at,
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

  // 🆕 ZERO-SYNC: handleClassifyNew uses TMWE API first
  const handleClassifyNew = async () => {
    console.log('🔍 [Zero-Sync] Classifica Nuove cliccato');
    
    if (!userEmail) {
      console.error('❌ [Zero-Sync] Utente non autenticato');
      toast.error('Utente non autenticato');
      return;
    }

    try {
      // Step 1: Fetch classified email IDs (both email_id and tmwe_email_id)
      const { data: classifiedIds, error: classifiedError } = await supabase
        .from('email_ai_classifications')
        .select('email_id, tmwe_email_id')
        .eq('user_email', userEmail)
        .eq('folder_name', selectedFolder);

      if (classifiedError) {
        console.error('❌ [Zero-Sync] Error fetching classified IDs:', classifiedError);
        toast.error('Errore nel recupero classificazioni');
        return;
      }

      const classifiedUuids = new Set(classifiedIds?.map(c => c.email_id).filter(Boolean) || []);
      const classifiedTmweIds = new Set(classifiedIds?.map(c => c.tmwe_email_id).filter(Boolean) || []);
      console.log('📊 [Zero-Sync] Already classified:', classifiedUuids.size, 'UUIDs,', classifiedTmweIds.size, 'TMWE IDs');

      // Step 2: 🆕 Try TMWE API first for unclassified emails
      let unclassifiedEmails: Array<{ email_id?: string; tmwe_email_id?: number; subject?: string; from_email?: string }> = [];
      
      try {
        console.log('🌐 [Zero-Sync] Fetching emails from TMWE API...');
        const tmweResult = await emailSearchApi.getEmailsMetadata({
          folder: selectedFolder,
          limit: 200,
          is_seen: unreadOnly ? false : undefined,
          timeout: 15
        });

        if (tmweResult?.emails && tmweResult.emails.length > 0) {
          console.log('✅ [Zero-Sync] TMWE API returned', tmweResult.emails.length, 'emails');
          
          // Filter out already classified emails
          const unclassifiedFromApi = tmweResult.emails.filter((email: any) => {
            const tmweId = email.id || email.email_id;
            return !classifiedTmweIds.has(tmweId);
          }).slice(0, 100);

          unclassifiedEmails = unclassifiedFromApi.map((email: any) => ({
            tmwe_email_id: email.id || email.email_id,
            subject: email.subject,
            from_email: email.from?.email || email.from_email || email.sender
          }));
          
          console.log('📬 [Zero-Sync] Unclassified from TMWE API:', unclassifiedEmails.length);
        }
      } catch (tmweError) {
        console.warn('⚠️ [Zero-Sync] TMWE API failed, using fallback:', tmweError);
      }

      // 🆕 Zero-Sync: TMWE API è l'unica fonte - nessun fallback
      if (unclassifiedEmails.length === 0) {
        toast.info('Nessuna nuova email da classificare');
        return;
      }

      toast.success(`Trovate ${unclassifiedEmails.length} email da classificare`);
      console.log('🚀 [Zero-Sync] Avvio classificazione...');

      // 🆕 ZERO-SYNC: Pass objects with tmwe_email_id or email_id
      await classifyEmails(
        unclassifiedEmails.map(e => ({
          email_id: e.email_id,
          tmwe_email_id: e.tmwe_email_id
        })),
        userEmail,
        undefined,
        selectedAgent
      );

      // Ricarica lista dopo classificazione
      refetch();
      console.log('✅ [Zero-Sync] Classificazione completata');

      // 🤖 AI Automation Processor per email classificate
      console.log('🤖 [Zero-Sync] Avvio AI Automation Processor...');
      
      const processedCount = { success: 0, failed: 0 };
      
      for (const email of unclassifiedEmails.slice(0, 10)) { // Limit to 10 for performance
        try {
          // 🆕 Use TMWE API to get email content if tmwe_email_id available
          let emailContent = { subject: email.subject || 'No subject', body: '' };
          
          if (email.tmwe_email_id) {
            try {
              const detailResult = await emailSearchApi.getEmailDetail({
                email_id: email.tmwe_email_id,
                include_body: true,
                timeout: 5
              });
              if (detailResult?.email) {
                emailContent.subject = detailResult.email.subject || emailContent.subject;
                emailContent.body = detailResult.email.body_text || detailResult.email.body_html || detailResult.email.snippet || '';
              }
            } catch (detailErr) {
              console.warn('⚠️ [Zero-Sync] Could not fetch email detail:', detailErr);
            }
          } else if (email.email_id) {
            // Fallback to local DB
            const { data: fullEmail } = await supabase
              .from('email_messages')
              .select('subject, body_text, body_html')
              .eq('id', email.email_id)
              .single();
            
            if (fullEmail) {
              emailContent.subject = fullEmail.subject || emailContent.subject;
              emailContent.body = fullEmail.body_text || fullEmail.body_html || '';
            }
          }

          await processEmailWithAI(
            email.email_id || String(email.tmwe_email_id),
            email.from_email || '',
            emailContent.subject,
            emailContent.body
          );
          
          processedCount.success++;
        } catch (error) {
          console.error(`❌ AI Processor failed:`, error);
          processedCount.failed++;
        }
      }
      
      console.log(`🎯 [Zero-Sync] AI Automation: ${processedCount.success} successi, ${processedCount.failed} fallimenti`);
      
      if (processedCount.success > 0) {
        toast.success(`🤖 ${processedCount.success} email analizzate per azioni automatiche`);
      }
      
    } catch (error: any) {
      console.error('❌ [Zero-Sync] Error in handleClassifyNew:', error);
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
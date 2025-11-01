import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartInboxHeaderIntelligent } from './SmartInboxHeaderIntelligent';
import { SmartEmailListIntelligent } from './SmartEmailListIntelligent';
import { SmartEmailDetailPanel } from './SmartEmailDetailPanel';
import { EmptyDetailPanel } from './EmptyDetailPanel';
import { CollapsibleCategorySidebar } from './CollapsibleCategorySidebar';
import { AIActionsSidebar } from './AIActionsSidebar';
import { AIPromptDialog } from './AIPromptDialog';
import { AIManualCanvas } from './AIManualCanvas';
import { AIActionConfirmation } from './AIActionConfirmation';
import React from 'react';
import { ClassifiedEmail, EmailMetadata } from '@/types/smart-inbox';
import { useSmartClassificationIntelligent } from '@/hooks/useSmartClassificationIntelligent';
import { useEmailAIAutomation } from '@/hooks/useEmailAIAutomation';
import { useEmailAIProcessor } from '@/hooks/useEmailAIProcessor';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface SmartInboxTabIntelligentProps {
  onOpenAISidebar?: (senderEmail: string) => void;
  categoriesOpen: boolean;
  onCategoriesOpenChange: (open: boolean) => void;
}

export const SmartInboxTabIntelligent = ({ 
  onOpenAISidebar,
  categoriesOpen,
  onCategoriesOpenChange 
}: SmartInboxTabIntelligentProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<ClassifiedEmail | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  
  // AI Automation State
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [aiCanvasOpen, setAiCanvasOpen] = useState(false);
  
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

  // ✅ Fetch email classificate con JOIN a email_messages
  const { data: classifiedEmails = [], isLoading, refetch } = useQuery({
    queryKey: ['smart-inbox-intelligent', userEmail, selectedCategory],
    queryFn: async () => {
      if (!userEmail) return [];

      let query = supabase
        .from('email_ai_classifications')
        .select(`
          *,
          email_messages!fk_email_ai_classifications_email_messages(
            id,
            subject,
            body_text,
            from_email,
            to_recipients,
            date,
            has_attachments,
            message_id,
            cartella
          )
        `)
        .eq('user_email', userEmail)
        .not('email_id', 'is', null)  // ✅ Solo email sincronizzate
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all' && selectedCategory !== 'da-verificare') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedCategory === 'da-verificare') {
        query = query.or('is_verified.eq.false,confidence.lt.0.8');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map risultati con dati dal JOIN
      return (data || [])
        .filter((c: any) => c.email_messages) // ✅ Solo email con dati completi
        .map((classification: any) => ({
          classification: {
            ...classification,
            email_messages: undefined // Rimuovi dall'oggetto classification
          },
          email: {
            uid: classification.email_messages.message_id,
            email_id: classification.email_messages.id,
            subject: classification.email_messages.subject,
            body_text: classification.email_messages.body_text,
            from: { email: classification.email_messages.from_email },
            to: classification.email_messages.to_recipients || [],
            date: classification.email_messages.date,
            has_attachments: classification.email_messages.has_attachments || false,
            folder_name: classification.email_messages.cartella || 'INBOX',
            read: true,
            body_preview: classification.ai_summary
          }
        } as ClassifiedEmail));
    },
    enabled: !!userEmail,
  });

  // Calcola statistiche categorie
  const categoryStats = React.useMemo(() => {
    const categories = [
      { id: 'Fatture', name: 'Fatture', icon: '💰', color: '#3B82F6' },
      { id: 'Bolle / Packing List', name: 'Bolle', icon: '📦', color: '#10B981' },
      { id: 'Preventivi / Quotazioni', name: 'Preventivi', icon: '📊', color: '#F59E0B' },
      { id: 'Rate Aeree / Rate Navali', name: 'Rate', icon: '✈️', color: '#8B5CF6' },
      { id: 'Documenti Spedizione', name: 'Documenti', icon: '📄', color: '#06B6D4' },
      { id: 'Offerte di Lavoro', name: 'Lavoro', icon: '💼', color: '#EC4899' },
      { id: 'Marketing / Pubblicità', name: 'Marketing', icon: '📢', color: '#F43F5E' },
      { id: 'Spam / Non Rilevante', name: 'Spam', icon: '🚫', color: '#6B7280' },
    ];

    return categories.map(cat => ({
      ...cat,
      count: classifiedEmails.filter(e => e.classification.category === cat.id).length
    })).sort((a, b) => {
      const priority = ['Preventivi / Quotazioni', 'Fatture', 'Rate Aeree / Rate Navali', 'Bolle / Packing List', 'Documenti Spedizione'];
      const aIdx = priority.indexOf(a.id);
      const bIdx = priority.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return b.count - a.count;
    });
  }, [classifiedEmails]);

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
      
      // ✅ Recupera email NON classificate dal DB locale (solo INBOX)
      const { data: unclassifiedEmails, error: fetchError } = await supabase
        .from('email_messages')
        .select('id, subject, from_email')
        .eq('user_email', userEmail)
        .eq('cartella', 'INBOX')
        .not('id', 'in', 
          supabase
            .from('email_ai_classifications')
            .select('email_id')
            .not('email_id', 'is', null)
        )
        .limit(100);

      if (fetchError) {
        console.error('❌ [DEBUG] Error fetching unclassified emails:', fetchError);
        toast.error('Errore nel recupero email non classificate');
        return;
      }

      console.log('📬 [DEBUG] Email non classificate trovate:', unclassifiedEmails?.length || 0);

      if (!unclassifiedEmails || unclassifiedEmails.length === 0) {
        toast.info('Nessuna nuova email da classificare');
        return;
      }

      toast.success(`Trovate ${unclassifiedEmails.length} email da classificare`);
      console.log('🚀 [DEBUG] Avvio classificazione...');

      // ✅ Classifica usando solo gli ID (UUID)
      await classifyEmails(
        unclassifiedEmails.map(e => e.id),
        userEmail
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

    await classifyEmails(emailIds, userEmail, category);
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
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)] max-w-[1800px] mx-auto w-full gap-4">
      {/* Header compatto - solo titolo + Classifica Nuove + Barra Azioni */}
      <SmartInboxHeaderIntelligent
        categories={categoryStats}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onClassifyNew={handleClassifyNew}
        isClassifying={isClassifying}
        classificationProgress={progress}
        unverifiedCount={unverifiedCount}
        selectedCount={selectedEmails.size}
        onBulkClassify={handleBulkClassify}
        onArchive={handleArchiveSelected}
        onDelete={handleDeleteSelected}
        onMove={handleMoveSelected}
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
        />

        {/* Colonna 1: Lista Email (40% width - più spazio senza sidebar fissa) */}
        <div className="w-[40%] flex flex-col min-h-0">
          <SmartEmailListIntelligent
            emails={classifiedEmails}
            onEmailClick={handleEmailSelect}
            isLoading={isLoading}
            selectedEmails={selectedEmails}
            onSelectionChange={setSelectedEmails}
          />
        </div>
        
        {/* Colonna 3: Dettaglio Email (flex-1, prende tutto lo spazio restante) */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedEmail ? (
            <SmartEmailDetailPanel
              classifiedEmail={selectedEmail}
              onClose={() => {
                setSelectedEmail(null);
                setSelectedSender(null);
              }}
            />
          ) : (
            <EmptyDetailPanel />
          )}
        </div>
      </div>

      {/* AI Manual Canvas Dialog */}
      <Dialog open={aiCanvasOpen} onOpenChange={setAiCanvasOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <AIManualCanvas />
        </DialogContent>
      </Dialog>

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
    </div>
  );
};
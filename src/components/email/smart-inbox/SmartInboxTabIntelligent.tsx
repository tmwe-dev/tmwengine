import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartInboxHeaderIntelligent } from './SmartInboxHeaderIntelligent';
import { SmartEmailListIntelligent } from './SmartEmailListIntelligent';
import { SmartEmailDetailPanel } from './SmartEmailDetailPanel';
import { EmptyDetailPanel } from './EmptyDetailPanel';
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
}

export const SmartInboxTabIntelligent = ({ onOpenAISidebar }: SmartInboxTabIntelligentProps) => {
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

  // Fetch email classificate dal DB
  const { data: classifiedEmails = [], isLoading, refetch } = useQuery({
    queryKey: ['smart-inbox-intelligent', userEmail, selectedCategory],
    queryFn: async () => {
      if (!userEmail) return [];

      let query = supabase
        .from('email_ai_classifications')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all' && selectedCategory !== 'da-verificare') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedCategory === 'da-verificare') {
        query = query.or('is_verified.eq.false,confidence.lt.0.8');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Trasforma in ClassifiedEmail (email metadata sarà caricata on-demand)
      return (data || []).map(classification => ({
        classification,
        email: {
          uid: classification.email_uid || '',
          email_id: undefined,
          subject: classification.ai_summary?.split(' - ')[1] || 'Email senza oggetto',
          from: { email: classification.sender_email },
          to: [],
          date: classification.created_at,
          read: false,
          has_attachments: false,
          folder_name: classification.folder_name || 'INBOX',
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
    if (!userEmail) {
      toast.error('Utente non autenticato');
      return;
    }

    try {
      toast.info('Recupero email dal server...');
      
      const response = await emailSearchApi.getEmailsMetadata({
        folder: 'INBOX',
        limit: 100
      });

      const serverEmails = response?.emails || [];

      if (!serverEmails || serverEmails.length === 0) {
        toast.info('Nessuna nuova email da classificare');
        return;
      }

      const { data: existingClassifications } = await supabase
        .from('email_ai_classifications')
        .select('email_uid')
        .eq('user_email', userEmail);

      const classifiedUids = new Set(existingClassifications?.map(c => c.email_uid) || []);
      const unclassifiedEmails = serverEmails.filter(e => !classifiedUids.has(e.uid));

      if (unclassifiedEmails.length === 0) {
        toast.info('Tutte le email sono già classificate');
        return;
      }

      toast.success(`Trovate ${unclassifiedEmails.length} email da classificare`);
      
      await classifyEmails(unclassifiedEmails, userEmail);
      
      refetch();
      
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      toast.error(`Errore recupero email: ${error.message}`);
    }
  };

  const handleBulkClassify = async (category: string) => {
    if (!userEmail || selectedEmails.size === 0) return;

    const emailsToClassify: EmailMetadata[] = Array.from(selectedEmails).map(uid => {
      const email = classifiedEmails.find(e => e.email.uid === uid);
      if (!email) return null;
      return {
        uid: email.email.uid,
        email_id: email.email.email_id || 0,
        subject: email.classification.ai_summary || '',
        from: { email: email.classification.sender_email },
        to: [],
        date: email.email.date,
        read: email.email.read,
        has_attachments: email.email.has_attachments,
        folder_name: email.email.folder_name,
        body_preview: ''
      };
    }).filter(Boolean) as EmailMetadata[];

    await classifyEmails(emailsToClassify, userEmail, category);
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
      />
      
      {/* Layout 3 colonne: Sidebar AI | Lista Email | Dettaglio */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Colonna 1: AI Actions Sidebar (20%) - nascosta su mobile */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <AIActionsSidebar
            selectedSender={selectedSender}
            onActionSelect={handleActionSelect}
          />
        </div>

        {/* Colonna 2: Lista Email (35%) */}
        <div className="w-full lg:w-[35%] flex flex-col min-h-[300px] lg:min-h-0">
          <SmartEmailListIntelligent
            emails={classifiedEmails}
            onEmailClick={handleEmailSelect}
            isLoading={isLoading}
            selectedEmails={selectedEmails}
            onSelectionChange={setSelectedEmails}
          />
        </div>
        
        {/* Colonna 3: Dettaglio (45%) */}
        <div className={`w-full lg:flex-1 flex flex-col ${selectedEmail ? 'block' : 'hidden lg:flex'}`}>
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
// ESEMPIO COMPLETO DI INTEGRAZIONE - Mostra come usare tutto il sistema AI
import { useState } from 'react';
import { AIActionsSidebar } from './AIActionsSidebar';
import { AIManualCanvas } from './AIManualCanvas';
import { AIActionConfirmation } from './AIActionConfirmation';
import { useEmailAIAutomation } from '@/hooks/useEmailAIAutomation';
import { useEmailAIProcessor } from '@/hooks/useEmailAIProcessor';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

/**
 * ESEMPIO DI UTILIZZO NELLA PAGINA FUNNEMAIL
 * 
 * Scenario:
 * 1. Utente vede lista mittenti da classificare
 * 2. Può creare regole AI tramite sidebar
 * 3. Quando arriva nuova email, sistema chiama AI automaticamente
 * 4. Se richiede conferma, mostra AIActionConfirmation
 * 5. Può anche fare domande manuali ad AI tramite AIManualCanvas
 */

interface EmailAIIntegrationExampleProps {
  // Props dalla pagina FunEmail
  senders?: Array<{
    email: string;
    companyName: string;
    emailCount: number;
  }>;
}

export const EmailAIIntegrationExample = ({ senders = [] }: EmailAIIntegrationExampleProps) => {
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const { createSimpleAction, applyAIPromptToSender } = useEmailAIAutomation();
  const { currentProposal, processEmailWithAI, clearProposal } = useEmailAIProcessor();

  // Handler per azioni dalla sidebar
  const handleActionSelect = async (
    action: 'archive' | 'delete' | 'move' | 'ai-prompt',
    promptId?: string
  ) => {
    if (!selectedSender) return;

    if (action === 'ai-prompt' && promptId) {
      await applyAIPromptToSender(selectedSender, promptId);
    } else if (action !== 'ai-prompt') {
      await createSimpleAction(selectedSender, action);
    }
  };

  // Simula arrivo nuova email (in produzione, sarebbe un webhook o polling)
  const handleTestProcessEmail = async () => {
    if (!selectedSender) return;

    await processEmailWithAI(
      'test-uid-123',
      selectedSender,
      'Test Email Subject',
      'Questo è il corpo dell\'email di test che verrà analizzato da AI...'
    );
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar Sinistra - Azioni */}
      <AIActionsSidebar
        selectedSender={selectedSender}
        onActionSelect={handleActionSelect}
      />

      {/* Area Centrale */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Lista Mittenti */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">Mittenti da Classificare</h3>
          <div className="space-y-2">
            {senders.map((sender) => (
              <div
                key={sender.email}
                onClick={() => setSelectedSender(sender.email)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  selectedSender === sender.email
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{sender.companyName}</p>
                    <p className="text-sm text-muted-foreground">{sender.email}</p>
                  </div>
                  <p className="text-sm font-semibold">{sender.emailCount} email</p>
                </div>
              </div>
            ))}
            {senders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nessun mittente da classificare
              </p>
            )}
          </div>

          {/* Test Button */}
          {selectedSender && (
            <Button
              onClick={handleTestProcessEmail}
              className="w-full mt-4"
              variant="outline"
            >
              <Bot className="mr-2 h-4 w-4" />
              Test: Processa Email con AI
            </Button>
          )}
        </div>

        {/* Conferma Azioni AI (se presente) */}
        {currentProposal && (
          <AIActionConfirmation
            logId={currentProposal.logId}
            emailInfo={{
              subject: 'Test Email Subject',
              from: selectedSender || '',
              preview: 'Anteprima del corpo email...',
            }}
            proposal={currentProposal.proposal}
            onConfirm={clearProposal}
            onReject={clearProposal}
          />
        )}

        {/* Canvas AI Manuale */}
        <AIManualCanvas />
      </div>
    </div>
  );
};

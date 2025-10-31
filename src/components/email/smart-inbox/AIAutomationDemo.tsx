// COMPONENTE DIMOSTRATIVO - Integrazione AI Automation nella pagina FunEmail
// Questo componente mostra come integrare AIActionsSidebar e AIManualCanvas

import { useState } from 'react';
import { AIActionsSidebar } from './AIActionsSidebar';
import { AIManualCanvas } from './AIManualCanvas';
import { useEmailAIAutomation } from '@/hooks/useEmailAIAutomation';
import { toast } from 'sonner';

interface AIAutomationDemoProps {
  // Esempio: lista di mittenti email da classificare
  unclassifiedSenders?: Array<{
    email: string;
    companyName: string;
    emailCount: number;
  }>;
}

export const AIAutomationDemo = ({ unclassifiedSenders = [] }: AIAutomationDemoProps) => {
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const { createSimpleAction, applyAIPromptToSender } = useEmailAIAutomation();

  const handleActionSelect = async (
    action: 'archive' | 'delete' | 'move' | 'ai-prompt',
    promptId?: string
  ) => {
    if (!selectedSender) {
      toast.error('Seleziona prima un mittente');
      return;
    }

    if (action === 'ai-prompt' && promptId) {
      // Applica un prompt AI salvato a questo sender
      await applyAIPromptToSender(selectedSender, promptId);
    } else if (action !== 'ai-prompt') {
      // Crea azione semplice
      await createSimpleAction(selectedSender, action);
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar Sinistra - Azioni AI */}
      <AIActionsSidebar
        selectedSender={selectedSender}
        onActionSelect={handleActionSelect}
      />

      {/* Area Centrale - Contenuto Principale */}
      <div className="flex-1 space-y-4">
        {/* Lista Mittenti Da Classificare (esempio) */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">Mittenti da Classificare</h3>
          <div className="space-y-2">
            {unclassifiedSenders.length > 0 ? (
              unclassifiedSenders.map((sender) => (
                <button
                  key={sender.email}
                  onClick={() => setSelectedSender(sender.email)}
                  className={`w-full text-left p-3 rounded-md border transition-all ${
                    selectedSender === sender.email
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{sender.companyName}</p>
                      <p className="text-sm text-muted-foreground">{sender.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{sender.emailCount} email</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nessun mittente da classificare
              </p>
            )}
          </div>
        </div>

        {/* Canvas AI Manuale */}
        <AIManualCanvas />
      </div>
    </div>
  );
};

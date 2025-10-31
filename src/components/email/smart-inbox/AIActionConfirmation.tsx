import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { AIActionProposal } from '@/types/email-automation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface AIActionConfirmationProps {
  logId: string;
  emailInfo: {
    subject: string;
    from: string;
    preview: string;
  };
  proposal: AIActionProposal;
  onConfirm?: () => void;
  onReject?: () => void;
}

export const AIActionConfirmation = ({
  logId,
  emailInfo,
  proposal,
  onConfirm,
  onReject,
}: AIActionConfirmationProps) => {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      const { error } = await supabase
        .from('email_ai_execution_log')
        .update({
          status: 'confirmed',
          executed_at: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;

      toast.success('✅ Azioni confermate! AI procederà con l\'esecuzione.');
      onConfirm?.();
    } catch (error) {
      console.error('Confirm error:', error);
      toast.error('Errore nella conferma');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReject = async () => {
    try {
      const { error } = await supabase
        .from('email_ai_execution_log')
        .update({ status: 'rejected' })
        .eq('id', logId);

      if (error) throw error;

      toast.info('❌ Azioni rifiutate');
      onReject?.();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Errore nel rifiuto');
    }
  };

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary animate-pulse" />
          🤖 AI Assistant richiede conferma
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* Email Info */}
        <div className="bg-muted/50 p-3 rounded-md">
          <p className="text-sm font-semibold mb-1">📧 Email ricevuta</p>
          <p className="text-sm"><strong>Da:</strong> {emailInfo.from}</p>
          <p className="text-sm"><strong>Oggetto:</strong> {emailInfo.subject}</p>
          <p className="text-xs text-muted-foreground mt-2">{emailInfo.preview}</p>
        </div>

        {/* AI Reasoning */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">🧠 Analisi AI</p>
          </div>
          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
            {proposal.reasoning}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Confidenza AI:</span>
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${proposal.confidence}%` }}
              />
            </div>
            <span className="text-xs font-medium">{proposal.confidence}%</span>
          </div>
        </div>

        {/* Proposed Actions */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">✅ Azioni che AI eseguirà:</p>
          <ol className="list-decimal list-inside space-y-1 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
            {proposal.actions.map((action, idx) => (
              <li key={idx} className="text-sm">
                <strong>{action.type}:</strong> {action.description}
              </li>
            ))}
          </ol>
        </div>

        {/* Confirmation UI */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            ⚠️ Confermi che AI può procedere con queste azioni?
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            className="flex-1"
            disabled={isExecuting}
          >
            <XCircle className="h-4 w-4 mr-2" />
            No, annulla
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1"
            disabled={isExecuting}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Sì, esegui
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

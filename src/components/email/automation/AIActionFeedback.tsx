import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIActionFeedbackProps {
  emailId: string;
  aiSuggestion: string;
  actionType: 'classification' | 'action_decision' | 'auto_execute';
  confidenceScore?: number;
  senderEmail?: string;
  emailCategory?: string;
  onFeedbackSubmitted?: () => void;
}

export const AIActionFeedback = ({
  emailId,
  aiSuggestion,
  actionType,
  confidenceScore,
  senderEmail,
  emailCategory,
  onFeedbackSubmitted,
}: AIActionFeedbackProps) => {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [userCorrection, setUserCorrection] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (feedback: 'approved' | 'rejected') => {
    if (feedback === 'rejected') {
      setShowCorrectionDialog(true);
      return;
    }

    await submitFeedback(feedback);
  };

  const submitFeedback = async (
    feedback: 'approved' | 'rejected' | 'modified',
    correction?: string,
    notes?: string
  ) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('email_ai_learning_feedback').insert({
        user_id: user.id,
        email_id: emailId,
        action_type: actionType,
        ai_suggestion: aiSuggestion,
        user_feedback: feedback,
        user_correction: correction,
        confidence_score: confidenceScore,
        sender_email: senderEmail,
        email_category: emailCategory,
        feedback_notes: notes,
      });

      if (error) throw error;

      setFeedbackGiven(true);
      toast.success(feedback === 'approved' ? '✅ Feedback positivo registrato' : '📝 Feedback registrato');
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Errore nel registrare il feedback');
    } finally {
      setIsSubmitting(false);
      setShowCorrectionDialog(false);
    }
  };

  const handleCorrectionSubmit = () => {
    submitFeedback('modified', userCorrection, feedbackNotes);
  };

  if (feedbackGiven) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>✓ Feedback registrato</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">AI corretta?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFeedback('approved')}
          disabled={isSubmitting}
          className="hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFeedback('rejected')}
          disabled={isSubmitting}
          className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Negativo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>AI ha suggerito:</strong> {aiSuggestion}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Cosa avresti fatto invece?
              </label>
              <Textarea
                value={userCorrection}
                onChange={(e) => setUserCorrection(e.target.value)}
                placeholder="Es: Avrei classificato come 'Urgente' invece di 'Normale'"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Note aggiuntive (opzionale)
              </label>
              <Textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Altri dettagli per migliorare l'AI..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCorrectionDialog(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button onClick={handleCorrectionSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Invio...' : 'Invia Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

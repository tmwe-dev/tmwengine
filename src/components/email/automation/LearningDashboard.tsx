import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PerformanceMetric {
  id: string;
  metric_type: string;
  context_key: string;
  total_actions: number;
  approved_actions: number;
  rejected_actions: number;
  accuracy_rate: number;
  avg_confidence: number;
  last_updated: string;
}

interface RecentFeedback {
  id: string;
  action_type: string;
  ai_suggestion: string;
  user_feedback: string;
  user_correction?: string;
  sender_email?: string;
  created_at: string;
}

export const LearningDashboard = () => {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['learning-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('email_ai_performance_metrics')
        .select('*')
        .order('accuracy_rate', { ascending: true });
      return data as PerformanceMetric[];
    },
  });

  const { data: recentFeedback } = useQuery({
    queryKey: ['recent-feedback'],
    queryFn: async () => {
      const { data } = await supabase
        .from('email_ai_learning_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data as RecentFeedback[];
    },
  });

  // Calculate overall stats
  const overallClassification = metrics?.find(
    (m) => m.metric_type === 'classification_accuracy' && m.context_key === 'overall'
  );
  const overallAction = metrics?.find(
    (m) => m.metric_type === 'action_accuracy' && m.context_key === 'overall'
  );

  const senderMetrics = metrics?.filter((m) => m.metric_type === 'sender_accuracy') || [];
  const problematicSenders = senderMetrics.filter((m) => m.accuracy_rate < 70 && m.total_actions >= 3);

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📊 Learning Insights</h2>
        <p className="text-muted-foreground">
          Metriche di performance e suggerimenti per migliorare l'AI
        </p>
      </div>

      {/* Overall Accuracy Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Classificazione Email
            </CardTitle>
            <CardDescription>Accuracy complessiva nelle classificazioni</CardDescription>
          </CardHeader>
          <CardContent>
            {overallClassification ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">
                    {overallClassification.accuracy_rate.toFixed(1)}%
                  </span>
                  {overallClassification.accuracy_rate >= 80 ? (
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <Progress value={overallClassification.accuracy_rate} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {overallClassification.approved_actions}/{overallClassification.total_actions}{' '}
                  classificazioni corrette
                </p>
                <p className="text-xs text-muted-foreground">
                  Confidence media: {(overallClassification.avg_confidence * 100).toFixed(1)}%
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessun dato disponibile ancora</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              Azioni AI
            </CardTitle>
            <CardDescription>Accuracy nelle decisioni di azione</CardDescription>
          </CardHeader>
          <CardContent>
            {overallAction ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">
                    {overallAction.accuracy_rate.toFixed(1)}%
                  </span>
                  {overallAction.accuracy_rate >= 85 ? (
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <Progress value={overallAction.accuracy_rate} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {overallAction.approved_actions}/{overallAction.total_actions} azioni corrette
                </p>
                <p className="text-xs text-muted-foreground">
                  Confidence media: {(overallAction.avg_confidence * 100).toFixed(1)}%
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessun dato disponibile ancora</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Problematic Senders */}
      {problematicSenders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Sender Problematici
            </CardTitle>
            <CardDescription>Mittenti con bassa accuracy (servono regole custom)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {problematicSenders.map((sender) => (
                  <div
                    key={sender.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium truncate">{sender.context_key}</p>
                      <p className="text-xs text-muted-foreground">
                        {sender.approved_actions}/{sender.total_actions} azioni corrette
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={sender.accuracy_rate < 60 ? 'destructive' : 'secondary'}
                      >
                        {sender.accuracy_rate.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Feedback Recenti</CardTitle>
          <CardDescription>Ultimi 10 feedback registrati</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {recentFeedback && recentFeedback.length > 0 ? (
              <div className="space-y-3">
                {recentFeedback.map((feedback) => (
                  <div key={feedback.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          feedback.user_feedback === 'approved'
                            ? 'default'
                            : feedback.user_feedback === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {feedback.user_feedback === 'approved'
                          ? '✓ Approvato'
                          : feedback.user_feedback === 'rejected'
                          ? '✗ Rifiutato'
                          : '✎ Modificato'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(feedback.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    <p className="text-sm">
                      <strong>AI ha suggerito:</strong> {feedback.ai_suggestion}
                    </p>
                    {feedback.user_correction && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Correzione:</strong> {feedback.user_correction}
                      </p>
                    )}
                    {feedback.sender_email && (
                      <p className="text-xs text-muted-foreground">
                        Sender: {feedback.sender_email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nessun feedback ancora. Inizia a dare feedback sulle azioni AI!
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {problematicSenders.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              💡 Suggerimenti
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-yellow-900 dark:text-yellow-100">
            <p>
              • {problematicSenders.length} sender{problematicSenders.length > 1 ? 'i' : 'e'} con
              bassa accuracy - considera di creare regole AI personalizzate
            </p>
            {overallClassification && overallClassification.accuracy_rate < 75 && (
              <p>
                • Accuracy classificazione sotto il 75% - rivedi i prompt di classificazione in
                AI Prompt Library
              </p>
            )}
            {overallAction && overallAction.accuracy_rate < 80 && (
              <p>
                • Accuracy azioni sotto l'80% - adatta le confidence threshold in Auto-Execute
                Settings
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

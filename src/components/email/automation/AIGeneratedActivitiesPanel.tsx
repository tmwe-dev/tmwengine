import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Edit2, Calendar, Phone, ListTodo, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface AIActivity {
  id: string;
  tipo: string;
  descrizione: string;
  stato: string;
  scadenza: string | null;
  priorita: string;
  created_at: string;
  ai_confidence: number;
  ai_reasoning: string | null;
  rubrica_id: string | null;
}

const ActivityIcon = ({ tipo }: { tipo: string }) => {
  switch (tipo) {
    case 'meeting':
      return <Calendar className="h-5 w-5" />;
    case 'chiamata':
      return <Phone className="h-5 w-5" />;
    case 'task':
      return <ListTodo className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
};

const ActivityLabel: Record<string, string> = {
  meeting: 'Meeting',
  chiamata: 'Chiamata',
  task: 'Task',
  email: 'Email',
};

const PriorityColor: Record<string, string> = {
  alta: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  media: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  bassa: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
};

export function AIGeneratedActivitiesPanel() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState('');

  // Fetch AI-generated activities
  const { data: activities, isLoading } = useQuery({
    queryKey: ['ai-generated-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attivita')
        .select('id, tipo, descrizione, stato, scadenza, priorita, created_at, ai_confidence, ai_reasoning, rubrica_id')
        .eq('created_by_ai', true)
        .eq('stato', 'aperta')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as AIActivity[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Approve activity mutation
  const approveMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('attivita')
        .update({ 
          stato: 'confermata',
          created_by_ai: false, // Mark as approved
        })
        .eq('id', activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-generated-activities'] });
      toast.success('✅ Attività approvata');
    },
    onError: (error: any) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Reject activity mutation
  const rejectMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('attivita')
        .update({ stato: 'rifiutata' })
        .eq('id', activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-generated-activities'] });
      toast.success('❌ Attività rifiutata');
    },
    onError: (error: any) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Update description mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase
        .from('attivita')
        .update({ descrizione: description })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-generated-activities'] });
      toast.success('✏️ Descrizione aggiornata');
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  const handleStartEdit = (activity: AIActivity) => {
    setEditingId(activity.id);
    setEditedDescription(activity.descrizione);
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate({ id, description: editedDescription });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedDescription('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Attività Generate dall'AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Attività Generate dall'AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nessuna attività AI in sospeso
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Attività Generate dall'AI
          <Badge variant="secondary" className="ml-auto">
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {activities.map((activity) => (
          <Card key={activity.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <ActivityIcon tipo={activity.tipo} />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ActivityLabel[activity.tipo] || activity.tipo}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={PriorityColor[activity.priorita] || ''}
                      >
                        {activity.priorita}
                      </Badge>
                      {activity.ai_confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(activity.ai_confidence * 100)}% confident
                        </Badge>
                      )}
                    </div>

                    {activity.rubrica_id && (
                      <div className="text-xs text-muted-foreground">
                        Contatto ID: {activity.rubrica_id.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>

                {editingId === activity.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(activity.id)}
                        disabled={updateMutation.isPending}
                      >
                        Salva
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{activity.descrizione}</p>
                )}

                {activity.ai_reasoning && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    💡 <strong>Reasoning:</strong> {activity.ai_reasoning}
                  </div>
                )}

                {activity.scadenza && (
                  <div className="text-xs text-muted-foreground">
                    📅 Scadenza: {new Date(activity.scadenza).toLocaleDateString('it-IT')}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => approveMutation.mutate(activity.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approva
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEdit(activity)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Modifica
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(activity.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rifiuta
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Creata: {new Date(activity.created_at).toLocaleString('it-IT')}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

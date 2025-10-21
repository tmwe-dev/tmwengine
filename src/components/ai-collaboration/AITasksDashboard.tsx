import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AITask = Database['public']['Tables']['ai_collaboration_tasks']['Row'];

export function AITasksDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['ai-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_collaboration_tasks')
        .select('*')
        .order('proposed_at', { ascending: false });

      if (error) throw error;
      return data as AITask[];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-ai-tasks', {
        body: { action: 'approve', taskId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tasks'] });
      toast({ title: 'Task approvato', description: 'Il task è stato approvato con successo' });
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    }
  });

  const priorityColors: Record<string, string> = {
    alta: 'bg-destructive/10 text-destructive border-destructive/20',
    media: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    bassa: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    approved: <CheckCircle className="w-4 h-4 text-primary" />,
    completed: <CheckCircle className="w-4 h-4 text-green-600" />,
    rejected: <AlertCircle className="w-4 h-4 text-destructive" />
  };

  if (isLoading) {
    return <div className="p-8 text-center">Caricamento task...</div>;
  }

  const pendingTasks = (tasks || []).filter(t => t.status === 'pending');
  const completedTasks = (tasks || []).filter(t => t.status === 'completed');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🤖 AI Collaboration Task Queue</h2>
        <Badge variant="outline">
          {pendingTasks.length} task in attesa
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🕒 Task in Attesa di Approvazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nessun task in attesa</p>
          ) : (
            pendingTasks.map(task => (
              <div key={task.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{task.title}</h3>
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline">{task.proposed_by}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      📄 File: <code className="bg-muted px-2 py-1 rounded">{task.file}</code>
                    </p>
                    <p className="text-sm text-foreground">{task.problem}</p>
                    {task.solution && (
                      <div className="mt-2 bg-primary/10 border border-primary/20 rounded p-2">
                        <p className="text-sm text-foreground">
                          💡 <strong>Soluzione proposta:</strong> {task.solution}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => approveMutation.mutate(task.id)}
                    disabled={approveMutation.isPending}
                    size="sm"
                    className="ml-4"
                  >
                    ✅ Approva
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Proposto: {new Date(task.proposed_at).toLocaleString('it-IT')}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>✅ Task Completati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completedTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nessun task completato</p>
          ) : (
            completedTasks.slice(0, 5).map(task => (
              <div key={task.id} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-center gap-2">
                  {statusIcons.completed}
                  <p className="text-sm font-medium">{task.title}</p>
                  <Badge variant="outline" className="text-xs">{task.proposed_by}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completato: {new Date(task.proposed_at).toLocaleDateString('it-IT')}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

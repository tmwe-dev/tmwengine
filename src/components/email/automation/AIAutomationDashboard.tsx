import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail,
  TrendingUp,
  AlertCircle,
  Edit,
  Copy,
  PlayCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIPromptWithStats {
  id: string;
  sender_email: string;
  prompt_name: string;
  ai_prompt: string;
  is_active: boolean;
  created_at: string;
  execution_count?: number;
  success_count?: number;
  last_execution?: string;
}

export const AIAutomationDashboard = () => {
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<AIPromptWithStats[]>([]);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = async () => {
    try {
      const result = (await supabase
        .from('email_sender_ai_prompts')
        .select('*')
        .order('created_at', { ascending: false })) as any;

      if (result.error) throw result.error;
      setPrompts((result.data || []) as AIPromptWithStats[]);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Errore caricamento prompt');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionLogs = async (promptId: string) => {
    try {
      // @ts-ignore - Supabase type inference issue
      const result = (await supabase
        .from('email_ai_execution_log')
        .select('*')
        .eq('sender_ai_prompt_id', promptId)
        .order('created_at', { ascending: false })
        .limit(10)) as any;

      if (result.error) throw result.error;
      setExecutionLogs(result.data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (expandedPromptId) {
      fetchExecutionLogs(expandedPromptId);
    } else {
      setExecutionLogs([]);
    }
  }, [expandedPromptId]);

  // Global statistics
  const stats = {
    totalPrompts: prompts.length,
    activePrompts: prompts.filter(p => p.is_active).length,
    totalExecutions: prompts.reduce((sum, p) => sum + (p.execution_count || 0), 0),
    avgSuccessRate: prompts.length 
      ? (prompts.reduce((sum, p) => {
          const rate = p.execution_count && p.success_count 
            ? (p.success_count / p.execution_count) * 100 
            : 0;
          return sum + rate;
        }, 0) / prompts.length).toFixed(1)
      : '0.0'
  };

  const handleToggleActive = async (promptId: string, currentState: boolean) => {
    try {
      const { error } = (await supabase
        .from('email_sender_ai_prompts')
        .update({ is_active: !currentState })
        .eq('id', promptId)) as any;

      if (error) throw error;

      toast.success(currentState ? 'Prompt disattivato' : 'Prompt attivato');
      fetchPrompts();
    } catch (error) {
      console.error('Error toggling prompt:', error);
      toast.error('Errore aggiornamento stato');
    }
  };

  const getSuccessRate = (prompt: AIPromptWithStats) => {
    if (!prompt.execution_count || prompt.execution_count === 0) return 0;
    return ((prompt.success_count || 0) / prompt.execution_count) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prompt Totali</p>
                <p className="text-3xl font-bold">{stats.totalPrompts}</p>
              </div>
              <Bot className="h-10 w-10 text-blue-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prompt Attivi</p>
                <p className="text-3xl font-bold">{stats.activePrompts}</p>
              </div>
              <Activity className="h-10 w-10 text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esecuzioni</p>
                <p className="text-3xl font-bold">{stats.totalExecutions}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold">{stats.avgSuccessRate}%</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-purple-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Prompts List */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Automazioni AI Configurate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {prompts.length > 0 ? (
              <div className="space-y-4">
                {prompts.map((prompt) => (
                  <Card 
                    key={prompt.id}
                    className={cn(
                      "border transition-all duration-200 hover:border-primary/40",
                      prompt.is_active ? "border-green-500/30 bg-green-500/5" : "border-gray-500/30 bg-gray-500/5",
                      expandedPromptId === prompt.id && "ring-2 ring-primary/50"
                    )}
                  >
                    <CardContent className="pt-6 space-y-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{prompt.prompt_name || 'Prompt Senza Nome'}</h4>
                            <Badge variant={prompt.is_active ? "default" : "secondary"}>
                              {prompt.is_active ? 'Attivo' : 'Inattivo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {prompt.sender_email}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={prompt.is_active}
                            onCheckedChange={() => handleToggleActive(prompt.id, prompt.is_active)}
                          />
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-400" />
                          <span className="text-muted-foreground">Esecuzioni:</span>
                          <span className="font-semibold">{prompt.execution_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="text-muted-foreground">Success:</span>
                          <span className="font-semibold">{getSuccessRate(prompt).toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-400" />
                          <span className="text-muted-foreground">
                            {prompt.last_execution 
                              ? new Date(prompt.last_execution).toLocaleDateString('it-IT')
                              : 'Mai'
                            }
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedPromptId(expandedPromptId === prompt.id ? null : prompt.id)}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          {expandedPromptId === prompt.id ? 'Nascondi' : 'Mostra'} Log
                        </Button>
                        <Button variant="ghost" size="sm" disabled>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifica
                        </Button>
                        <Button variant="ghost" size="sm" disabled>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplica
                        </Button>
                        <Button variant="ghost" size="sm" disabled>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                      </div>

                      {/* Execution Logs */}
                      {expandedPromptId === prompt.id && executionLogs.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-border/50">
                          <h5 className="text-sm font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Ultimi 10 Log di Esecuzione
                          </h5>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {executionLogs.map((log: any) => (
                                <div 
                                  key={log.id}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-card/30 border border-border/30 text-xs"
                                >
                                  {log.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 space-y-1">
                                    <p className="font-medium">
                                      {log.email_subject || 'Email senza oggetto'}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {new Date(log.created_at).toLocaleString('it-IT')}
                                    </p>
                                    {log.error_message && (
                                      <p className="text-red-400 text-xs">{log.error_message}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Nessuna automazione AI configurata
                </p>
                <p className="text-sm text-muted-foreground/60 mt-2">
                  Vai su Smart Inbox per configurare automazioni AI per i tuoi mittenti
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

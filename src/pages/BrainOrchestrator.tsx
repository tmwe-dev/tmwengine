import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Loader2, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import albertGif from '@/assets/albert-mining.gif';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import archimedeGif from '@/assets/archimede-stones.gif';
import { ConsensusView } from '@/components/brain/ConsensusView';
import { PageLayout } from '@/components/design-system/layouts/PageLayout';

const BrainOrchestrator = () => {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['gemini', 'chatgpt']);
  const [taskInput, setTaskInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [rounds, setRounds] = useState(2);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const { data: liveTasks, refetch } = useQuery({
    queryKey: ['brain-ai-tasks', currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) return [];
      
      const { data } = await supabase
        .from('brain_ai_tasks')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('round_number', { ascending: true })
        .order('agent_order', { ascending: true });
      
      return data || [];
    },
    refetchInterval: 2000,
    enabled: !!currentConversationId
  });

  const { data: stats } = useQuery({
    queryKey: ['brain-function-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('brain_function_analysis')
        .select('is_duplicate, is_heavy, is_shared');
      
      const duplicates = data?.filter(f => f.is_duplicate).length || 0;
      const heavy = data?.filter(f => f.is_heavy).length || 0;
      const shared = data?.filter(f => f.is_shared).length || 0;
      
      return { duplicates, heavy, shared };
    }
  });

  const callAI = async (agent: string, prompt: string) => {
    const model = agent === 'gemini' 
      ? 'google/gemini-2.5-flash' 
      : 'openai/gpt-5-mini';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert technical AI assistant analyzing code and suggesting improvements. Be concise but thorough.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const startDiscussion = async () => {
    if (!taskInput || selectedAgents.length === 0 || !currentUser) return;

    const { data: conv, error: convError } = await supabase
      .from('chat_laboratory_conversations')
      .insert({
        titolo: `Brain: ${taskInput.substring(0, 50)}...`,
        user_id: currentUser.id
      })
      .select()
      .single();

    if (convError) {
      toast({
        title: 'Errore',
        description: 'Impossibile creare conversazione',
        variant: 'destructive'
      });
      return;
    }

    setCurrentConversationId(conv.id);

    toast({
      title: '🚀 Discussione avviata',
      description: `${selectedAgents.length} AI × ${rounds} round = ${selectedAgents.length * rounds} chiamate`
    });

    // Orchestrazione multi-round direttamente nel frontend
    try {
      for (let round = 1; round <= rounds; round++) {
        for (let agentIdx = 0; agentIdx < selectedAgents.length; agentIdx++) {
          const agent = selectedAgents[agentIdx];

          // Recupera risposte round precedenti
          const { data: previousTasks } = await supabase
            .from('brain_ai_tasks')
            .select('*')
            .eq('conversation_id', conv.id)
            .lt('round_number', round)
            .order('round_number', { ascending: true })
            .order('agent_order', { ascending: true });

          // Costruisci prompt dinamico
          let prompt = `Task: ${taskInput}\n\nRound ${round}/${rounds}\n\n`;
          
          if (previousTasks && previousTasks.length > 0) {
            prompt += 'Previous round responses:\n\n';
            previousTasks.forEach(t => {
              const content = (t.output_data as any)?.content || '';
              prompt += `${t.assigned_agent}: ${content}\n\n`;
            });
          }

          prompt += `Now provide your analysis as ${agent}.`;

          // Segna task come running
          const { data: task } = await supabase
            .from('brain_ai_tasks')
            .insert({
              conversation_id: conv.id,
              user_id: currentUser.id,
              round_number: round,
              assigned_agent: agent,
              agent_order: agentIdx,
              task_type: 'orchestration',
              status: 'running',
              input_data: { prompt }
            })
            .select()
            .single();

          refetch();

          // Chiama AI direttamente
          const aiResponse = await callAI(agent, prompt);

          // Aggiorna con risposta
          await supabase
            .from('brain_ai_tasks')
            .update({
              status: 'completed',
              output_data: { content: aiResponse }
            })
            .eq('id', task!.id);

          refetch();
        }
      }

      toast({
        title: '✅ Discussione completata',
        description: 'Tutti i round sono stati completati'
      });
    } catch (error) {
      console.error('Brain Orchestrator Error:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante la discussione',
        variant: 'destructive'
      });
    }
  };

  const agentConfig = {
    gemini: { name: 'Pitagora (Gemini)', avatar: pitagoraGif, color: 'bg-purple-500' },
    chatgpt: { name: 'Albert (GPT)', avatar: albertGif, color: 'bg-blue-500' }
  };

  const totalCalls = selectedAgents.length * rounds;
  const completedCalls = liveTasks?.filter(t => t.status === 'completed').length || 0;
  const isComplete = liveTasks && liveTasks.length === totalCalls && completedCalls === totalCalls;

  return (
    <PageLayout title="Brain AI Orchestrator">
      <div className="space-y-6">
        {/* Agent Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Seleziona Agenti AI</CardTitle>
            <CardDescription>
              Minimo 2 round × {selectedAgents.length} agenti = {totalCalls} chiamate totali
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(agentConfig).map(([id, config]) => (
                <Button
                  key={id}
                  variant={selectedAgents.includes(id) ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedAgents(prev =>
                      prev.includes(id)
                        ? prev.filter(a => a !== id)
                        : [...prev, id]
                    );
                  }}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={config.avatar} />
                  </Avatar>
                  {config.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rounds Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Numero di Round</CardTitle>
            <CardDescription>
              Ogni round = tutti gli agenti rispondono sequenzialmente vedendo le risposte precedenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={rounds.toString()} onValueChange={(v) => setRounds(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Round (6 chiamate con 3 AI)</SelectItem>
                <SelectItem value="3">3 Round (9 chiamate con 3 AI)</SelectItem>
                <SelectItem value="4">4 Round (12 chiamate con 3 AI)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Task Input */}
        <Card>
          <CardHeader>
            <CardTitle>Descrivi il Task</CardTitle>
            <CardDescription>
              Esempio: "Analizza i duplicati in src/hooks/ e suggerisci refactoring"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Descrivi il task tecnico da analizzare..."
              rows={4}
              className="mb-4"
            />
            <Button 
              onClick={startDiscussion} 
              disabled={!taskInput || selectedAgents.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              Avvia Discussione Multi-Round
            </Button>
          </CardContent>
        </Card>

        {/* Live Discussion View */}
        {currentConversationId && (
          <Card>
            <CardHeader>
              <CardTitle>Discussione in Corso</CardTitle>
              <CardDescription>
                {completedCalls} / {totalCalls} risposte completate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {Array.from({ length: rounds }).map((_, roundIdx) => {
                  const roundTasks = liveTasks?.filter(t => t.round_number === roundIdx + 1) || [];
                  
                  return (
                    <div key={roundIdx} className="mb-6">
                      <h3 className="font-semibold text-lg mb-3">
                        Round {roundIdx + 1}
                      </h3>
                      
                      {roundTasks.map((task) => (
                        <div key={task.id} className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={agentConfig[task.assigned_agent as keyof typeof agentConfig]?.avatar} />
                            </Avatar>
                            <span className="font-semibold">
                              {agentConfig[task.assigned_agent as keyof typeof agentConfig]?.name}
                            </span>
                            <Badge variant={
                              task.status === 'completed' ? 'default' :
                              task.status === 'running' ? 'secondary' :
                              'outline'
                            }>
                              {task.status}
                            </Badge>
                          </div>
                          
                          {task.output_data && typeof task.output_data === 'object' && 'content' in task.output_data && (
                            <div className="text-sm text-muted-foreground mt-2 prose dark:prose-invert max-w-none">
                              <ReactMarkdown>{(task.output_data as any).content}</ReactMarkdown>
                            </div>
                          )}
                          
                          {task.status === 'running' && (
                            <div className="flex items-center gap-2 mt-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Pensando...</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Consensus Result */}
        {isComplete && liveTasks && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                ✅ Discussione Completata - Consensus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConsensusView tasks={liveTasks} rounds={rounds} />
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default BrainOrchestrator;

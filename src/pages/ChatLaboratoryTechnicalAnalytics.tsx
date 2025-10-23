import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Database, Zap, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TokenKeyIndicator } from "@/components/ui/token-key-indicator";

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  content_summary: string | null;
  content_user_friendly: string | null;
  is_summary_available: boolean;
  token_input: number | null;
  token_output: number | null;
  tempo_risposta_ms: number | null;
  created_at: string;
}

interface AIUsageMetrics {
  provider: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  operationCount: number;
}

export default function ChatLaboratoryTechnicalAnalytics() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AIUsageMetrics[]>([]);
  const [conversationInfo, setConversationInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (conversationId) {
      loadAnalytics();
    }
  }, [conversationId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Carica info conversazione
      const { data: conv, error: convError } = await supabase
        .from('chat_laboratory_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      setConversationInfo(conv);

      // Carica messaggi
      const { data: msgs, error: msgsError } = await supabase
        .from('chat_laboratory_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;
      setMessages(msgs || []);

      // Carica metriche AI da ai_cost_tracking
      const { data: costs, error: costsError } = await supabase
        .from('ai_cost_tracking')
        .select('*')
        .eq('lab_conversation_id', conversationId);

      if (costsError) throw costsError;

      // Aggrega metriche per provider/model
      const metricsMap = new Map<string, AIUsageMetrics>();
      
      costs?.forEach(cost => {
        const key = `${cost.provider}-${cost.model}`;
        const existing = metricsMap.get(key) || {
          provider: cost.provider,
          model: cost.model,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          operationCount: 0
        };

        existing.totalInputTokens += cost.input_tokens || 0;
        existing.totalOutputTokens += cost.output_tokens || 0;
        existing.totalCost += parseFloat(String(cost.cost_total_eur || '0'));
        existing.operationCount += 1;

        metricsMap.set(key, existing);
      });

      setAiMetrics(Array.from(metricsMap.values()));

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        variant: "destructive",
        title: "Errore caricamento analytics",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const totalTokens = messages.reduce((sum, m) => sum + (m.token_input || 0) + (m.token_output || 0), 0);
  const avgResponseTime = messages.filter(m => m.tempo_risposta_ms).length > 0
    ? messages.reduce((sum, m) => sum + (m.tempo_risposta_ms || 0), 0) / messages.filter(m => m.tempo_risposta_ms).length
    : 0;

  const totalCost = aiMetrics.reduce((sum, m) => sum + m.totalCost, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat-laboratory')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Analisi Tecnica Conversazione
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Dashboard tecnica per ottimizzazione Economy Mode
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messaggi Totali</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
              <p className="text-xs text-muted-foreground">
                {messages.filter(m => m.is_summary_available).length} con riassunti
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Token Totali</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {conversationInfo?.economy_mode ? 'Economy Mode: ON' : 'Mode: Completo'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Medio</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(avgResponseTime / 1000).toFixed(2)}s</div>
              <p className="text-xs text-muted-foreground">
                Tempo risposta AI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costo Totale</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalCost.toFixed(4)}</div>
              <p className="text-xs text-muted-foreground">
                Costo API cumulativo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="messages">Messaggi & Riassunti</TabsTrigger>
            <TabsTrigger value="ai-usage">Usage AI per Provider</TabsTrigger>
            <TabsTrigger value="economy">Economy Mode</TabsTrigger>
            <TabsTrigger value="docs">Documentazione</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dettaglio Messaggi & Sistema a 3 Versioni</CardTitle>
                <CardDescription>
                  Ogni messaggio AI viene salvato in 3 formati: completo, user-friendly (60 parole), ultra-compressed (25 parole)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <Card key={msg.id} className={msg.sender_type === 'user' ? 'border-primary/20' : 'border-muted'}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={msg.sender_type === 'user' ? 'default' : 'secondary'}>
                                {msg.sender_name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">Messaggio #{idx + 1}</span>
                            </div>
                            {msg.is_summary_available && (
                              <Badge variant="outline" className="text-green-600">
                                ✓ Riassunti generati
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Contenuto Completo */}
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                              <Database className="h-3 w-3" />
                              VERSIONE COMPLETA ({msg.content.length} caratteri)
                            </div>
                            <p className="text-sm bg-muted/30 p-3 rounded-md">
                              {msg.content.substring(0, 200)}{msg.content.length > 200 ? '...' : ''}
                            </p>
                          </div>

                          {/* User Friendly */}
                          {msg.content_user_friendly && (
                            <div>
                              <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                USER-FRIENDLY (max 60 parole) - Linguaggio naturale
                              </div>
                              <p className="text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                                {msg.content_user_friendly}
                              </p>
                            </div>
                          )}

                          {/* Ultra Compressed */}
                          {msg.content_summary && (
                            <div>
                              <div className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-2">
                                <Zap className="h-3 w-3" />
                                ULTRA-COMPRESSED (max 25 parole) - Solo concetti chiave
                              </div>
                              <p className="text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-800 font-medium">
                                {msg.content_summary}
                              </p>
                            </div>
                          )}

                          {/* Token Info */}
                          {(msg.token_input || msg.token_output) && (
                            <div className="flex items-center gap-4 pt-2 border-t">
                              {msg.token_input && (
                                <div className="flex items-center gap-1.5">
                                  <TokenKeyIndicator tokenCount={msg.token_input} variant="input" showLabel />
                                </div>
                              )}
                              {msg.token_output && (
                                <div className="flex items-center gap-1.5">
                                  <TokenKeyIndicator tokenCount={msg.token_output} variant="output" showLabel />
                                </div>
                              )}
                              {msg.tempo_risposta_ms && (
                                <span className="text-xs text-muted-foreground">⚡ {(msg.tempo_risposta_ms / 1000).toFixed(2)}s</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Metriche AI per Provider/Model</CardTitle>
                <CardDescription>
                  Token e costi suddivisi per ogni provider AI (Gemini, ChatGPT, Claude)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiMetrics.map((metric, idx) => (
                    <Card key={idx} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{metric.provider}</CardTitle>
                            <CardDescription>{metric.model}</CardDescription>
                          </div>
                          <Badge variant="outline" className="text-lg">
                            €{metric.totalCost.toFixed(4)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Input Tokens</p>
                            <p className="text-2xl font-bold">{metric.totalInputTokens.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Output Tokens</p>
                            <p className="text-2xl font-bold">{metric.totalOutputTokens.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Operazioni</p>
                            <p className="text-2xl font-bold">{metric.operationCount}</p>
                          </div>
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground">
                          Media per operazione: {((metric.totalInputTokens + metric.totalOutputTokens) / metric.operationCount).toFixed(0)} tokens
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="economy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Come Funziona Economy Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">✅ Stato Attuale</h4>
                    <div className="space-y-1 text-sm">
                      <p>Economy Mode: <Badge variant={conversationInfo?.economy_mode ? 'default' : 'outline'}>
                        {conversationInfo?.economy_mode ? 'ATTIVO' : 'Disattivo'}
                      </Badge></p>
                      <p>Mostra solo riassunti: <Badge variant={conversationInfo?.show_summaries_only ? 'default' : 'outline'}>
                        {conversationInfo?.show_summaries_only ? 'SÌ' : 'NO'}
                      </Badge></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">🔄 Flusso Sistema a 3 Versioni</h4>
                    <ol className="space-y-3 text-sm">
                      <li className="flex gap-3">
                        <Badge variant="outline">1</Badge>
                        <div className="flex-1">
                          <p className="font-medium">Generazione Risposta AI</p>
                          <p className="text-muted-foreground">L'AI genera la risposta completa (contenuto originale)</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Badge variant="outline">2</Badge>
                        <div className="flex-1">
                          <p className="font-medium">Salvataggio Versione Completa</p>
                          <p className="text-muted-foreground">Il messaggio viene salvato per intero nel database</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Badge variant="outline">3</Badge>
                        <div className="flex-1">
                          <p className="font-medium">Generazione Riassunti (Background)</p>
                          <p className="text-muted-foreground">
                            Vengono generati 2 riassunti tramite edge function:<br/>
                            • <strong>User-Friendly</strong>: max 60 parole, linguaggio naturale<br/>
                            • <strong>Ultra-Compressed</strong>: max 25 parole, solo concetti chiave
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Badge variant="outline">4</Badge>
                        <div className="flex-1">
                          <p className="font-medium">Utilizzo Contestuale</p>
                          <p className="text-muted-foreground">
                            Gli agenti AI ricevono:<br/>
                            • <strong>Economy OFF</strong>: versione completa<br/>
                            • <strong>Economy ON + show_summaries_only</strong>: ultra-compressed (25 parole)
                          </p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">💡 Vantaggi</h4>
                    <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                      <li>✓ Riduzione token fino al 90% (25 parole vs contenuto completo)</li>
                      <li>✓ Informazioni essenziali preservate</li>
                      <li>✓ Contesto completo sempre disponibile per consultazione</li>
                      <li>✓ Costi API significativamente ridotti</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Verifica Configurazione
                    </h4>
                    <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                      <p><strong>Messaggi con riassunti:</strong> {messages.filter(m => m.is_summary_available).length} / {messages.length}</p>
                      <p><strong>Prompt orchestrator:</strong> Utilizza content_summary quando economy_mode && show_summaries_only</p>
                      <p><strong>Edge function:</strong> generate-message-summaries (invocata in background)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentazione Tecnica Sistema</CardTitle>
                <CardDescription>
                  Architettura backend e flusso dati della Bar Chat
                </CardDescription>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <h3>Architettura Backend</h3>
                <p>Il sistema Bar Chat utilizza un'architettura multi-layer:</p>
                
                <h4>1. Edge Functions</h4>
                <ul>
                  <li><code>bar-chat-orchestrator</code>: Gestisce streaming AI, routing semantico, economy mode</li>
                  <li><code>generate-message-summaries</code>: Genera riassunti user-friendly e ultra-compressed</li>
                  <li><code>generate-deliverable</code>: Crea file CSV/MD/Mermaid da deliverable AI</li>
                </ul>

                <h4>2. Database Tables</h4>
                <ul>
                  <li><code>chat_laboratory_conversations</code>: Stato conversazione, economy_mode, token tracking</li>
                  <li><code>chat_laboratory_messages</code>: Messaggi con 3 versioni (content, content_user_friendly, content_summary)</li>
                  <li><code>ai_cost_tracking</code>: Tracciamento costi per provider/model</li>
                  <li><code>chat_laboratory_prompt_sections</code>: Sezioni prompt modulari (BASE, TOPIC, AGENT_PERSONALITY)</li>
                </ul>

                <h4>3. Flusso Economy Mode</h4>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
{`1. User invia messaggio
2. Orchestrator:
   - Carica messagi storici
   - Se economy_mode && show_summaries_only:
     → Usa content_summary (25 parole) invece di content
   - Compone prompt con history compresso
   - Invoca AI (streaming)
3. AI risponde
4. Salva messaggio completo in DB
5. Background: invoke generate-message-summaries
6. generate-message-summaries:
   - Genera user_friendly (60 parole)
   - Genera ultra_compressed (25 parole)
   - Aggiorna record con is_summary_available=true
7. Prossima richiesta userà content_summary`}
                </pre>

                <h4>4. Ottimizzazioni Possibili</h4>
                <div className="grid grid-cols-2 gap-4 not-prose">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Knowledge Nodes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground">
                        Estrai concetti chiave ricorrenti e mantienili in un contesto separato per evitare di rileggere interi messaggi
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Context Compaction</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground">
                        Quando conversazione supera N messaggi, genera un riassunto cumulativo e resetta context window
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

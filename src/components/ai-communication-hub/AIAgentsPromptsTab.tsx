import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlobalAIAgentSelector } from '@/components/ai/GlobalAIAgentSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, FileText, Filter, Plus, Trash2, Edit2, Save } from 'lucide-react';
import { PromptComposer } from '@/components/chat-laboratory/prompt-composer/PromptComposer';

interface ComposedPrompt {
  id: string;
  name: string;
  content: string;
  target_agent: string;
  page_route: string | null;
  category: 'simple' | 'composed';
  created_at: string;
}

const PAGE_ROUTES = [
  { value: 'global', label: '🌍 Globale (tutte le pagine)' },
  { value: '/funnemail', label: '📧 FunnEmail' },
  { value: '/chat', label: '💬 Chat' },
  { value: '/chat-laboratory', label: '🧪 Chat Laboratory' },
  { value: '/radio-chat', label: '📻 Radio Chat' },
  { value: '/intranet', label: '🏢 Intranet' },
  { value: '/email-manager', label: '📮 Email Manager' },
  { value: '/rubrica', label: '📖 Rubrica' },
  { value: '/attivita', label: '📅 Attività' },
  { value: '/campagne', label: '🎯 Campagne' },
];

interface AIAgentsPromptsTabProps {
  initialPageFilter?: string;
}

export const AIAgentsPromptsTab = ({ initialPageFilter }: AIAgentsPromptsTabProps) => {
  const [prompts, setPrompts] = useState<ComposedPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageFilter, setPageFilter] = useState<string>(initialPageFilter || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Simple prompt creation
  const [simplePrompt, setSimplePrompt] = useState({
    name: '',
    content: '',
    page_route: 'global',
    target_agent: 'gpt-4',
  });
  
  const [editingPrompt, setEditingPrompt] = useState<ComposedPrompt | null>(null);

  useEffect(() => {
    loadPrompts();
  }, [pageFilter, categoryFilter]);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('chat_laboratory_composed_prompts')
        .select('id, name, content, target_agent, page_route, category, created_at')
        .order('created_at', { ascending: false });

      if (pageFilter !== 'all') {
        if (pageFilter === 'global') {
          query = query.is('page_route', null);
        } else {
          query = query.eq('page_route', pageFilter);
        }
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      console.error('Error loading prompts:', error);
      toast.error('Errore nel caricamento dei prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSimplePrompt = async () => {
    if (!simplePrompt.name || !simplePrompt.content) {
      toast.error('Nome e contenuto sono obbligatori');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('chat_laboratory_composed_prompts')
        .insert([
          {
            name: simplePrompt.name,
            content: simplePrompt.content,
            target_agent: simplePrompt.target_agent,
            page_route: simplePrompt.page_route === 'global' ? null : simplePrompt.page_route,
            category: 'simple',
            section_ids: [],
          },
        ]);

      if (error) throw error;

      toast.success('✅ Prompt semplice creato');
      setSimplePrompt({ name: '', content: '', page_route: 'global', target_agent: 'gpt-4' });
      loadPrompts();
    } catch (error: any) {
      console.error('Error creating prompt:', error);
      toast.error('Errore nella creazione del prompt');
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Eliminare questo prompt?')) return;

    try {
      const { error } = await (supabase as any)
        .from('chat_laboratory_composed_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast.success('Prompt eliminato');
      loadPrompts();
    } catch (error: any) {
      console.error('Error deleting prompt:', error);
      toast.error('Errore nell\'eliminazione del prompt');
    }
  };

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return;

    try {
      const { error } = await (supabase as any)
        .from('chat_laboratory_composed_prompts')
        .update({
          name: editingPrompt.name,
          content: editingPrompt.content,
          target_agent: editingPrompt.target_agent,
          page_route: editingPrompt.page_route === 'global' ? null : editingPrompt.page_route,
        })
        .eq('id', editingPrompt.id);

      if (error) throw error;

      toast.success('✅ Prompt aggiornato');
      setEditingPrompt(null);
      loadPrompts();
    } catch (error: any) {
      console.error('Error updating prompt:', error);
      toast.error('Errore nell\'aggiornamento del prompt');
    }
  };

  const filteredPromptCount = prompts.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Agents & Prompts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestisci agenti AI e prompt globali o per pagina specifica
          </p>
        </div>
        <GlobalAIAgentSelector />
      </div>

      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="simple">📝 Prompt Semplici</TabsTrigger>
          <TabsTrigger value="composed">🎨 Drag & Drop</TabsTrigger>
          <TabsTrigger value="list">📚 Elenco Prompt ({filteredPromptCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crea Nuovo Prompt Semplice</CardTitle>
              <CardDescription>
                Inserisci un prompt completo da utilizzare nelle chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="simple-name">Nome Prompt</Label>
                  <Input
                    id="simple-name"
                    placeholder="Es. Assistente Email Professionale"
                    value={simplePrompt.name}
                    onChange={(e) => setSimplePrompt({ ...simplePrompt, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="simple-page">Pagina di Destinazione</Label>
                  <Select
                    value={simplePrompt.page_route}
                    onValueChange={(value) => setSimplePrompt({ ...simplePrompt, page_route: value })}
                  >
                    <SelectTrigger id="simple-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_ROUTES.map((route) => (
                        <SelectItem key={route.value} value={route.value}>
                          {route.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="simple-agent">Agente AI Target</Label>
                <Select
                  value={simplePrompt.target_agent}
                  onValueChange={(value) => setSimplePrompt({ ...simplePrompt, target_agent: value })}
                >
                  <SelectTrigger id="simple-agent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">🤖 GPT-4</SelectItem>
                    <SelectItem value="claude-3">🧠 Claude 3</SelectItem>
                    <SelectItem value="gemini-pro">✨ Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="simple-content">Contenuto Prompt</Label>
                <Textarea
                  id="simple-content"
                  placeholder="Inserisci il prompt completo qui..."
                  className="min-h-[200px] font-mono"
                  value={simplePrompt.content}
                  onChange={(e) => setSimplePrompt({ ...simplePrompt, content: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateSimplePrompt} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Crea Prompt Semplice
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Composer - Drag & Drop</CardTitle>
              <CardDescription>
                Crea prompt composti trascinando sezioni dalla libreria. 
                I prompt salvati verranno associati alla pagina selezionata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptComposer initialPageRoute={initialPageFilter || undefined} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Elenco Prompt Disponibili</CardTitle>
                  <CardDescription>
                    {filteredPromptCount} prompt{filteredPromptCount !== 1 ? 's' : ''} trovati
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={pageFilter} onValueChange={setPageFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtra per pagina" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le pagine</SelectItem>
                      {PAGE_ROUTES.map((route) => (
                        <SelectItem key={route.value} value={route.value}>
                          {route.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i tipi</SelectItem>
                      <SelectItem value="simple">Semplici</SelectItem>
                      <SelectItem value="composed">Composti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
              ) : prompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun prompt trovato con i filtri selezionati
                </div>
              ) : (
                <div className="space-y-3">
                  {prompts.map((prompt) => (
                    <Card key={prompt.id} className="border-border/50">
                      <CardContent className="pt-6">
                        {editingPrompt?.id === prompt.id ? (
                          <div className="space-y-4">
                            <Input
                              value={editingPrompt.name}
                              onChange={(e) =>
                                setEditingPrompt({ ...editingPrompt, name: e.target.value })
                              }
                            />
                            <Textarea
                              value={editingPrompt.content}
                              onChange={(e) =>
                                setEditingPrompt({ ...editingPrompt, content: e.target.value })
                              }
                              className="min-h-[120px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleUpdatePrompt}>
                                <Save className="h-4 w-4 mr-2" />
                                Salva
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingPrompt(null)}
                              >
                                Annulla
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  {prompt.category === 'simple' ? (
                                    <FileText className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                  )}
                                  {prompt.name}
                                </h3>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline">
                                    {prompt.page_route
                                      ? PAGE_ROUTES.find((r) => r.value === prompt.page_route)
                                          ?.label || prompt.page_route
                                      : '🌍 Globale'}
                                  </Badge>
                                  <Badge variant="secondary">{prompt.target_agent}</Badge>
                                  <Badge>{prompt.category}</Badge>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingPrompt(prompt)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeletePrompt(prompt.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {prompt.content}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
